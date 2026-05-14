/**
 * Evaluator Registry — Plane B of the Social Agent Observability Platform
 *
 * Three LLM-as-judge evaluators run after each completed analysis.
 * Each evaluator scores one behavioral dimension on the COMMUNICATION output:
 *
 *   1. argument_quality       — thesis structure, evidence, and differentiation
 *   2. scenario_coherence     — Bull/Base/Bear internal consistency and plausibility
 *   3. probability_calibration — scenario probabilities realism and calibration
 *
 * The Aggregator computes confidence-weighted means per dimension and flags
 * inter-evaluator conflicts (score spread > CONFLICT_THRESHOLD).
 *
 * Designed to mirror the architecture doc's Evaluator Registry (§3, Plane B):
 *   - Pre-filter Tier   → not yet implemented (reserved for safety/grounding)
 *   - Dimensional Tier  → the 3 evaluators below (run concurrently)
 *   - Aggregator        → aggregateSignals()
 */

import { prisma } from "./prisma.js";
import { buildLLM } from "../configurator.js";
import type { PipelineState } from "../shared/types.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const CONFLICT_THRESHOLD = 0.3; // score spread above which we flag a conflict

// ─── Types ────────────────────────────────────────────────────────────────────

export type EvaluatorName =
  | "argument_quality"
  | "scenario_coherence"
  | "probability_calibration";

export interface EvalResult {
  evaluator_name: EvaluatorName;
  dimension:      EvaluatorName; // 1:1 in v1
  score:          number;        // 0.0–1.0
  confidence:     number;        // 0.0–1.0
  rationale:      string;
  raw_response:   object;
}

export interface AggregatedSignal {
  argument_quality:       number;
  scenario_coherence:     number;
  probability_calibration:number;
}

export interface RegistryOutcome {
  eval_run_id:        string;
  aggregated_signal:  AggregatedSignal;
  overall_score:      number;
  conflict_flags:     string[];
  signals:            EvalResult[];
}

// ─── Helper: call LLM judge ───────────────────────────────────────────────────

async function callJudge(
  systemPrompt: string,
  userMessage:  string,
): Promise<{ score: number; confidence: number; rationale: string; raw: object }> {
  const llm  = buildLLM();
  const text = await llm.chat({
    model:       "openai/gpt-4.1-mini",   // cheap, fast judge — not the main pipeline model
    system:      systemPrompt,
    user:        userMessage,
    temperature: 0.1,
    max_tokens:  512,
    json_mode:   true,
  });

  // Extract JSON from the response
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Judge returned no JSON: ${text.slice(0, 200)}`);
  const parsed = JSON.parse(match[0]) as { score?: number; confidence?: number; rationale?: string };

  const score      = Math.max(0, Math.min(1, Number(parsed.score      ?? 0)));
  const confidence = Math.max(0, Math.min(1, Number(parsed.confidence ?? 0.5)));
  const rationale  = String(parsed.rationale ?? "");

  return { score, confidence, rationale, raw: parsed };
}

// ─── Evaluator 1: Argument Quality ───────────────────────────────────────────

const ARGUMENT_QUALITY_SYSTEM = `
You are a senior equity research quality reviewer.
Your job is to evaluate the ARGUMENT QUALITY of an equity research thesis.

You assess:
1. Is the thesis clearly stated with a specific, falsifiable claim?
2. Is the evidence cited specific (data, metrics, catalysts) rather than generic?
3. Is the thesis differentiated from consensus — does it add genuine new insight?
4. Is the logic chain from evidence → thesis → price target sound and traceable?
5. Are bear-case risks explicitly acknowledged within the thesis?

Score strictly. A generic "good company" thesis scores 0.3. A thesis with
specific, differentiated, evidence-backed logic scores 0.8–1.0.

IMPORTANT: Respond with ONLY a valid JSON object:
{
  "score":      <float 0.0–1.0>,
  "confidence": <float 0.0–1.0, how confident you are in your score>,
  "rationale":  "<1-2 sentences explaining the score>"
}
`.trim();

async function evaluateArgumentQuality(state: PipelineState): Promise<EvalResult> {
  const comm  = state.communication;
  const val   = state.valuation;
  const intel = state.intel;
  const cf    = state.cf;

  const userMessage = `
TICKER: ${state.scout?.decision ?? "UNKNOWN"}
RATING: ${val?.rating ?? "?"} | PT 12M: $${val?.pt_12m ?? "?"} | R/R: ${val?.rr_ratio?.toFixed(1) ?? "?"}:1

ANALYST BRIEFING (from INTEL agent):
${intel?.analyst_briefing ?? "Not available"}

CRITICAL FACTORS:
${(cf?.factors ?? []).map(f => `• ${f.description} (EPS impact: +${f.eps_impact_pct}%)`).join("\n") || "None"}

CASCADE THESIS (from COMMUNICATION agent):
${comm?.content?.slice(0, 1500) ?? JSON.stringify({ output_type: comm?.output_type, publication_possible: comm?.publication_possible, enter_gate: comm?.enter_gate }, null, 2).slice(0, 800)}

ENTER GATE SCORE: ${comm?.enter_gate?.effective_score ?? "?"}/5

Evaluate ARGUMENT QUALITY of this equity research thesis. Return JSON only.
`.trim();

  const { score, confidence, rationale, raw } = await callJudge(
    ARGUMENT_QUALITY_SYSTEM,
    userMessage,
  );

  return {
    evaluator_name: "argument_quality",
    dimension:      "argument_quality",
    score,
    confidence,
    rationale,
    raw_response:   raw,
  };
}

// ─── Evaluator 2: Scenario Coherence ─────────────────────────────────────────

const SCENARIO_COHERENCE_SYSTEM = `
You are a senior equity research quality reviewer specializing in scenario analysis.
Your job is to evaluate the INTERNAL COHERENCE of Bull/Base/Bear scenarios.

You assess:
1. Are the three scenarios logically distinct — do they have different key assumptions?
2. Are the price targets in the right rank order (Bull > Base > Bear)?
3. Are the probability weights realistic and do they sum to ~100%?
4. Do scenario narratives actually support their respective price targets?
5. Is the gap between Bull and Bear reasonable for the sector and time horizon?
   (Too narrow = no differentiation. Too wide = garbage-in scenarios.)
6. Are scenario triggers specific and observable rather than vague?

Score strictly. Scenarios that are essentially the same narrative with
different multiples score 0.2–0.4. Well-differentiated, internally consistent
scenarios with specific triggers score 0.7–1.0.

IMPORTANT: Respond with ONLY a valid JSON object:
{
  "score":      <float 0.0–1.0>,
  "confidence": <float 0.0–1.0>,
  "rationale":  "<1-2 sentences explaining the score>"
}
`.trim();

async function evaluateScenarioCoherence(state: PipelineState): Promise<EvalResult> {
  const cf  = state.cf;
  const val = state.valuation;

  const scenarioSpread = cf?.scenarios?.length
    ? Math.max(...cf.scenarios.map(s => s.implied_pt)) -
      Math.min(...cf.scenarios.map(s => s.implied_pt))
    : 0;

  const userMessage = `
TICKER: ${state.scout?.decision ?? "UNKNOWN"}
DOWNSTREAM MODE: ${state.scout?.downstream_mode ?? "valentine"}
TIME HORIZON: ${state.scout?.horizon_tag ?? "SHORT"}

SCENARIOS (from CRITICAL FACTOR agent):
${(cf?.scenarios ?? []).map(s =>
  `${s.type} (${(s.probability * 100).toFixed(0)}%): $${s.implied_pt}\n  Triggers: ${s.triggers ?? "?"}\n  Derivation: ${s.price_derivation ?? "?"}`
).join("\n\n") || "None"}

EXPECTED VALUE PT: $${cf?.expected_value_pt ?? "?"}
SCENARIO SPREAD (Bull − Bear): $${scenarioSpread.toFixed(0)}
FINAL PRICE TARGET: $${val?.pt_12m ?? "?"}

Evaluate SCENARIO COHERENCE. Return JSON only.
`.trim();

  const { score, confidence, rationale, raw } = await callJudge(
    SCENARIO_COHERENCE_SYSTEM,
    userMessage,
  );

  return {
    evaluator_name: "scenario_coherence",
    dimension:      "scenario_coherence",
    score,
    confidence,
    rationale,
    raw_response:   raw,
  };
}

// ─── Evaluator 3: Probability Calibration ────────────────────────────────────

const PROBABILITY_CALIBRATION_SYSTEM = `
You are a superforecaster and equity research quality reviewer.
Your job is to evaluate whether scenario probability weights are WELL-CALIBRATED.

You assess calibration against the following heuristics:
1. Base rate check: for most stocks, Base case should be the modal scenario (highest probability).
   If Bull is assigned >50%, that is a strong signal of overconfidence.
2. Tail probability check: Bear scenarios below 10% or above 50% need strong justification.
3. Probability granularity: weights like 33%/33%/34% suggest the analyst has no view.
   Calibrated probabilities reflect real conviction (e.g., 25%/55%/20%).
4. Sum check: probabilities must sum to 100% (±1% for rounding).
5. Overconfidence check: if the implied_pt spread is narrow but probabilities are extreme,
   something is wrong with the math.
6. Underconfidence check: if all scenarios cluster near equal probability, the analysis
   lacks differentiation and the critical factor analysis was probably weak.

Score strictly. Equal-weight scenarios (≈33/33/34) score 0.3 unless the sector
genuinely has near-equal outcomes. Strong, justified, differentiated probabilities
score 0.7–1.0.

IMPORTANT: Respond with ONLY a valid JSON object:
{
  "score":      <float 0.0–1.0>,
  "confidence": <float 0.0–1.0>,
  "rationale":  "<1-2 sentences explaining the score>"
}
`.trim();

async function evaluateProbabilityCalibration(state: PipelineState): Promise<EvalResult> {
  const cf    = state.cf;
  const intel = state.intel;

  const probSum = (cf?.scenarios ?? []).reduce((sum, s) => sum + (s.probability ?? 0), 0);

  const userMessage = `
TICKER: ${state.scout?.decision ?? "UNKNOWN"}
SECTOR / MOAT: ${intel?.business_context?.moat_type ?? "?"} — ${intel?.business_context?.moat_evidence ?? "?"}
CATALYST: ${intel?.business_context?.catalyst_assessment ?? "?"}

SCENARIOS (probabilities and price targets):
${(cf?.scenarios ?? []).map(s =>
  `${s.type}: probability=${(s.probability * 100).toFixed(1)}% | implied_pt=$${s.implied_pt}`
).join("\n") || "None"}

PROBABILITY SUM: ${(probSum * 100).toFixed(1)}% (should be ~100%)
EXPECTED VALUE PT: $${cf?.expected_value_pt ?? "?"}

CONTEXT CLUES (from FORENSIC agent):
Risk score: ${state.forensic?.risk_score ?? "?"}/100
Management trust score: ${state.forensic?.mgmt_trust_score ?? "?"}/100
Flags: ${(state.forensic?.flags ?? []).map(f => `SEV-${f.severity}`).join(", ") || "none"}

Evaluate PROBABILITY CALIBRATION. Return JSON only.
`.trim();

  const { score, confidence, rationale, raw } = await callJudge(
    PROBABILITY_CALIBRATION_SYSTEM,
    userMessage,
  );

  return {
    evaluator_name: "probability_calibration",
    dimension:      "probability_calibration",
    score,
    confidence,
    rationale,
    raw_response:   raw,
  };
}

// ─── Aggregator ───────────────────────────────────────────────────────────────
// Confidence-weighted mean per dimension.
// Conflict detection: flag dimensions where score spread > CONFLICT_THRESHOLD.
// In v1 we have one evaluator per dimension so conflicts require multiple runs
// or future additional evaluators. For now, we flag extreme low-confidence signals.

function aggregateSignals(results: EvalResult[]): {
  aggregated_signal: AggregatedSignal;
  overall_score:     number;
  conflict_flags:    string[];
} {
  const byDimension = new Map<string, EvalResult[]>();
  for (const r of results) {
    const list = byDimension.get(r.dimension) ?? [];
    list.push(r);
    byDimension.set(r.dimension, list);
  }

  const means: Partial<AggregatedSignal> = {};
  const conflict_flags: string[] = [];

  for (const [dim, signals] of byDimension) {
    // Confidence-weighted mean
    const totalWeight = signals.reduce((s, r) => s + r.confidence, 0);
    const weightedSum = signals.reduce((s, r) => s + r.score * r.confidence, 0);
    const mean = totalWeight > 0 ? weightedSum / totalWeight : 0;

    means[dim as keyof AggregatedSignal] = Math.round(mean * 1000) / 1000;

    // Conflict detection: if multiple evaluators on same dimension disagree
    if (signals.length > 1) {
      const scores  = signals.map(r => r.score);
      const spread  = Math.max(...scores) - Math.min(...scores);
      if (spread > CONFLICT_THRESHOLD) {
        conflict_flags.push(`conflict:${dim}`);
      }
    }

    // Low confidence flag: any evaluator with confidence < 0.3
    for (const r of signals) {
      if (r.confidence < 0.3) {
        conflict_flags.push(`low_confidence:${dim}`);
        break;
      }
    }
  }

  const aggSignal: AggregatedSignal = {
    argument_quality:        means.argument_quality        ?? 0,
    scenario_coherence:      means.scenario_coherence      ?? 0,
    probability_calibration: means.probability_calibration ?? 0,
  };

  const overall_score = Math.round(
    ((aggSignal.argument_quality + aggSignal.scenario_coherence + aggSignal.probability_calibration) / 3) * 1000
  ) / 1000;

  return { aggregated_signal: aggSignal, overall_score, conflict_flags };
}

// ─── Main: run registry ───────────────────────────────────────────────────────

export async function runEvaluatorRegistry({
  analysis_id,
  analyst_id,
  ticker,
  state,
}: {
  analysis_id: string;
  analyst_id:  string;
  ticker:      string;
  state:       PipelineState;
}): Promise<RegistryOutcome | null> {

  // Only run on completed analyses with a COMMUNICATION output
  if (state.status !== "COMPLETED" || !state.communication) {
    console.log(`[EvalRegistry] Skipping — status: ${state.status}, communication: ${!!state.communication}`);
    return null;
  }

  console.log(`[EvalRegistry] Running 3 evaluators for ${ticker} / ${analysis_id}…`);

  // Run all 3 evaluators concurrently (Dimensional Tier)
  const [argResult, scenResult, probResult] = await Promise.allSettled([
    evaluateArgumentQuality(state),
    evaluateScenarioCoherence(state),
    evaluateProbabilityCalibration(state),
  ]);

  const signals: EvalResult[] = [];
  const errors: string[] = [];

  if (argResult.status  === "fulfilled") signals.push(argResult.value);
  else errors.push(`argument_quality: ${argResult.reason}`);

  if (scenResult.status === "fulfilled") signals.push(scenResult.value);
  else errors.push(`scenario_coherence: ${scenResult.reason}`);

  if (probResult.status === "fulfilled") signals.push(probResult.value);
  else errors.push(`probability_calibration: ${probResult.reason}`);

  if (errors.length > 0) {
    console.warn(`[EvalRegistry] ${errors.length} evaluator(s) failed:`, errors);
  }

  if (signals.length === 0) {
    console.warn(`[EvalRegistry] All evaluators failed — skipping DB write`);
    return null;
  }

  // Aggregator
  const { aggregated_signal, overall_score, conflict_flags } = aggregateSignals(signals);

  console.log(
    `[EvalRegistry] Done — overall: ${overall_score.toFixed(3)} | ` +
    `arg: ${aggregated_signal.argument_quality.toFixed(2)} | ` +
    `scen: ${aggregated_signal.scenario_coherence.toFixed(2)} | ` +
    `prob: ${aggregated_signal.probability_calibration.toFixed(2)}` +
    (conflict_flags.length ? ` | flags: ${conflict_flags.join(", ")}` : "")
  );

  // Write to DB: one EvalRun + N EvalSignal rows
  const evalRun = await prisma.evalRun.create({
    data: {
      analysis_id,
      ticker,
      analyst_id,
      aggregated_signal: aggregated_signal as object,
      overall_score,
      prefilter_blocked: false,
      conflict_flags,
      signals: {
        create: signals.map(s => ({
          analysis_id,
          evaluator_name: s.evaluator_name,
          dimension:      s.dimension,
          score:          s.score,
          confidence:     s.confidence,
          rationale:      s.rationale,
          raw_response:   s.raw_response as object,
        })),
      },
    },
    select: { id: true },
  });

  return {
    eval_run_id: evalRun.id,
    aggregated_signal,
    overall_score,
    conflict_flags,
    signals,
  };
}

// ─── Read helpers (for Observatory — future UI) ────────────────────────────────

export async function getEvalRunsForAnalysis(analysis_id: string) {
  return prisma.evalRun.findMany({
    where:   { analysis_id },
    include: { signals: true },
    orderBy: { created_at: "desc" },
  });
}

export async function getLatestEvalRun(analysis_id: string) {
  return prisma.evalRun.findFirst({
    where:   { analysis_id },
    include: { signals: true },
    orderBy: { created_at: "desc" },
  });
}

export async function getEvalRunsByTicker(ticker: string, limit = 50) {
  return prisma.evalRun.findMany({
    where:   { ticker: ticker.toUpperCase() },
    include: { signals: true },
    orderBy: { created_at: "desc" },
    take:    limit,
  });
}
