import { MODELS } from "../../core/ports/ILanguageModel.js";
import type { ILanguageModel } from "../../core/ports/ILanguageModel.js";
import { extractJSON } from "../../shared/client.js";
import type { KataInput, KataBoard } from "../../shared/types.js";

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT — Toyota Kata applied to equity research
// ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
IMPORTANT: Respond with ONLY a valid JSON object. Do not add any text, headings, or explanations before or after the JSON.

You are KATA, Agent 08 of the Efrain AI system.
Role: improvement_coach

You apply the Toyota Improvement Kata to the equity research process.
Your job is NOT to judge whether the investment thesis is correct —
the other agents already did that. Your job is to coach the PROCESS
by which the thesis was built, identify thinking gaps, and define
the next PDCA cycle for the analyst.

You operate after COMMUNICATION. You only run when publication_possible = true.

════════════════════════════════════════════════════════════════
THE TOYOTA KATA FRAMEWORK (applied to research)
════════════════════════════════════════════════════════════════

The Improvement Kata is a 4-step scientific thinking pattern:
1. Understand the CHALLENGE (direction / vision)
2. Grasp the CURRENT CONDITION (what do we actually know right now?)
3. Define the TARGET CONDITION (where do we want to be next?)
4. PDCA toward the target — experiment, observe, adjust

The Five Questions (for each obstacle):
Q1: What is the target condition?
Q2: What is the actual condition now?
Q3: What obstacles are preventing you? Which one are you addressing?
Q4: What is your next step? (next PDCA cycle)
Q5: When can we go and see what we have learned from that step?

CORE PRINCIPLES to apply:
- Focus on PROCESS, not blame — problems are system problems
- Stay home: you yourself are the benchmark. Do not compare to others.
- Adaptive persistence: move toward a vision along an unpredictable path
- The mentor is one step ahead — not directive about solutions, directive about HOW to understand
- Small experiments are better than big plans
- Learn most from failures — failures are expected and valuable

════════════════════════════════════════════════════════════════
YOUR ANALYSIS TASKS
════════════════════════════════════════════════════════════════

TASK A — GRASP THE CURRENT CONDITION
Analyze the pipeline output holistically:
- What did the pipeline actually know vs. assume?
- Where did fallbacks occur (L1, L2, manual)?
- What hypotheses remain PENDING or UNRESOLVABLE?
- What is the spread between Bull/Base/Bear scenarios? (wide = uncertainty)
- Where is confidence lowest across agents?

Produce:
- current_condition: a factual, no-blame description of the research state (2–3 sentences)
- knowledge_gaps: 2–4 specific things the analyst does NOT yet know but needs to know
- assumption_risks: 1–3 assumptions embedded in the thesis that have not been tested

TASK B — DEFINE THE TARGET CONDITION
The target condition is not "be right about the stock."
It is the next measurable state of the RESEARCH PROCESS.
Think: what specific knowledge, data, or validated hypothesis would
move this research from its current state to a higher confidence state?

Produce:
- target_condition: 1 concrete, measurable description of what better research looks like
  Example: "Validate the GPU shipment cadence assumption with supply-chain data from
  2 tier-1 sources and confirm China restriction scope from EDGAR 10-K footnotes"
- target_horizon: how long to reach the target condition (e.g. "48h", "1 week", "next earnings")

TASK C — IDENTIFY OBSTACLES (The Five Questions applied)
For each knowledge gap, apply the Five Questions pattern.
Identify the single most critical obstacle and focus there first.

Produce:
- obstacles: array of 2–4 items, each with:
  - description: what is blocking better knowledge
  - addressing_now: true for the ONE obstacle to tackle first (only one can be true)
  - next_step: one concrete, small, observable action
  - checkpoint_date: ISO date when the analyst should review the result

TASK D — PDCA CYCLE DESIGN
Design the next experiment the analyst should run.
It must be small, fast, and observable — not a big research project.

Produce:
- pdca_cycle:
  - plan: what the analyst intends to do and what they expect to learn
  - do: the specific action to take (call, search, read, model tweak)
  - check: what signal or data point will confirm or deny the hypothesis
  - act: how to adjust the research if confirmed / if denied

TASK E — COACHING MEMO (Mentor voice)
Write a coaching memo in the voice of a Toyota mentor: not directive about
the answer, directive about the process. Ask questions rather than give solutions.
The mentor is one step ahead — keeps the analyst in the improvement corridor
without solving the problem for them.
Maximum 200 words. Direct, Socratic, no praise.

════════════════════════════════════════════════════════════════
OUTPUT JSON — exact structure:
════════════════════════════════════════════════════════════════

{
  "challenge": "Brief statement of the overall research challenge for this ticker (1 sentence)",
  "current_condition": "Factual description of what the research actually knows right now vs. assumes.",
  "knowledge_gaps": [
    { "id": "kg-1", "description": "Specific thing the analyst does not yet know", "source_agent": "INTEL" }
  ],
  "assumption_risks": [
    { "id": "ar-1", "description": "Untested assumption embedded in the thesis", "impact": "high" }
  ],
  "target_condition": "Concrete, measurable description of the next better research state.",
  "target_horizon": "48h",
  "obstacles": [
    {
      "id": "ob-1",
      "description": "What is blocking better knowledge",
      "addressing_now": true,
      "next_step": "Concrete small action",
      "checkpoint_date": "2026-05-14"
    }
  ],
  "pdca_cycle": {
    "plan": "What the analyst intends to do and what they expect to learn",
    "do": "Specific action: call IR, check EDGAR footnotes, run sensitivity in model",
    "check": "Data point or signal that confirms or denies the hypothesis",
    "act": "If confirmed: X. If denied: Y."
  },
  "coaching_memo": "200-word Socratic coaching memo in mentor voice.",
  "process_confidence": 0.72,
  "next_review_date": "2026-05-14"
}
`.trim();

// ─────────────────────────────────────────────────────────────
// JSON SCHEMA
// ─────────────────────────────────────────────────────────────

export const JSON_SCHEMA = {
  type: "object",
  properties: {
    challenge:         { type: "string" },
    current_condition: { type: "string" },
    knowledge_gaps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id:           { type: "string" },
          description:  { type: "string" },
          source_agent: { type: "string" },
        },
        required: ["id", "description", "source_agent"],
        additionalProperties: false,
      },
    },
    assumption_risks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id:          { type: "string" },
          description: { type: "string" },
          impact:      { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["id", "description", "impact"],
        additionalProperties: false,
      },
    },
    target_condition:  { type: "string" },
    target_horizon:    { type: "string" },
    obstacles: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id:              { type: "string" },
          description:     { type: "string" },
          addressing_now:  { type: "boolean" },
          next_step:       { type: "string" },
          checkpoint_date: { type: "string" },
        },
        required: ["id", "description", "addressing_now", "next_step", "checkpoint_date"],
        additionalProperties: false,
      },
    },
    pdca_cycle: {
      type: "object",
      properties: {
        plan:  { type: "string" },
        do:    { type: "string" },
        check: { type: "string" },
        act:   { type: "string" },
      },
      required: ["plan", "do", "check", "act"],
      additionalProperties: false,
    },
    coaching_memo:      { type: "string" },
    process_confidence: { type: "number" },
    next_review_date:   { type: "string" },
  },
  required: [
    "challenge",
    "current_condition",
    "knowledge_gaps",
    "assumption_risks",
    "target_condition",
    "target_horizon",
    "obstacles",
    "pdca_cycle",
    "coaching_memo",
    "process_confidence",
    "next_review_date",
  ],
  additionalProperties: false,
};

// ─────────────────────────────────────────────────────────────
// AGENT FUNCTION
// ─────────────────────────────────────────────────────────────

export async function runKata(
  llm: ILanguageModel,
  input: KataInput,
): Promise<KataBoard> {
  const { ticker, downstream_mode, scout, intel, forensic, cf, valuation, communication } = input;

  const pendingHypotheses = intel.hypotheses
    .filter((h) => h.lifecycle === "PENDING" || h.lifecycle === "PENDING_CONTACT_UNAVAILABLE")
    .map((h) => `• ${h.statement} [${h.lifecycle}]`)
    .join("\n") || "None";

  const fallbackWarnings = scout.fallback_level !== "none"
    ? `Scout fallback: ${scout.fallback_level} (conf_adj: ${scout.conf_adjustment})`
    : "No fallbacks detected in Scout";

  const scenarioSpread = Math.max(...cf.scenarios.map((s) => s.implied_pt)) -
    Math.min(...cf.scenarios.map((s) => s.implied_pt));

  const userMessage = `
TODAY: ${new Date().toISOString().slice(0, 10)}
TICKER: ${ticker}
DOWNSTREAM MODE: ${downstream_mode}

══ PIPELINE SUMMARY ══════════════════════════════════════

SCOUT:
  alpha_score: ${scout.alpha_score.total} | decision: ${scout.decision}
  horizon: ${scout.horizon_tag} | fallback: ${scout.fallback_level}
  confidence: ${scout.confidence} | conf_adj: ${scout.conf_adjustment}
  forensic_pre_result: ${scout.forensic_pre_result ?? "skipped"}

INTEL:
  surfaced_count: ${intel.surfaced_count} | suppressed_count: ${intel.suppressed_count}
  mgmt_comm_score: ${intel.mgmt_comm_score}
  moat_type: ${intel.business_context.moat_type}
  catalyst_assessment: ${intel.business_context.catalyst_assessment}
  analyst_briefing: ${intel.analyst_briefing}
  pending_hypotheses:
${pendingHypotheses}

FORENSIC:
  risk_score: ${forensic.risk_score} | mgmt_trust_score: ${forensic.mgmt_trust_score}
  recommendation: ${forensic.recommendation}
  flags: ${forensic.flags.map((f) => `SEV-${f.severity}: ${f.description}`).join(", ") || "None"}
  eps_haircut_total: ${forensic.eps_haircut_total}% | dr_add_bps_total: ${forensic.dr_add_bps_total}bps

CRITICAL FACTOR:
  factors: ${cf.factors.map((f) => `${f.description} (eps_impact: ${f.eps_impact_pct}%)`).join(" | ")}
  scenarios: ${cf.scenarios.map((s) => `${s.type}(${(s.probability * 100).toFixed(0)}% → $${s.implied_pt})`).join(", ")}
  scenario_spread: $${scenarioSpread.toFixed(0)} (Bull − Bear)
  expected_value_pt: ${cf.expected_value_pt}

VALUATION:
  pt_12m: $${valuation.pt_12m} | rating: ${valuation.rating} | rr_ratio: ${valuation.rr_ratio.toFixed(2)}:1
  faves_score: ${valuation.faves_score.total}/9 | conf_adj: ${valuation.conf_adj}
  market_assumptions: ${valuation.market_assumptions ?? "N/A"}

COMMUNICATION:
  output_type: ${communication?.output_type ?? "pending"}
  enter_gate score: ${communication?.enter_gate?.effective_score ?? "N/A"}/5
  final_confidence: ${communication?.audit_trail?.final_confidence ?? "N/A"}

FALLBACK SUMMARY: ${fallbackWarnings}

══ END OF PIPELINE SUMMARY ══════════════════════════════

Apply the Toyota Improvement Kata. Analyze the PROCESS (not the thesis outcome).
Identify knowledge gaps, untested assumptions, and define the next PDCA cycle.
Write the coaching memo in Socratic mentor voice — ask questions, do not solve.
Return the complete KataBoard JSON.
`.trim();

  const text = await llm.chat({
    model:       MODELS.sonnet,
    system:      SYSTEM_PROMPT,
    user:        userMessage,
    temperature: 0.3,
    max_tokens:  3000,
    json_mode:   true,
  });

  const board = JSON.parse(extractJSON(text)) as KataBoard;

  // Invariant: exactly one obstacle must have addressing_now = true
  const activeObstacles = board.obstacles.filter((o) => o.addressing_now);
  if (activeObstacles.length !== 1) {
    board.obstacles = board.obstacles.map((o, i) => ({
      ...o,
      addressing_now: i === 0,
    }));
    console.warn(`[KATA] addressing_now auto-corrected (found ${activeObstacles.length}, expected 1)`);
  }

  console.log(
    `[08] KATA — process_confidence: ${board.process_confidence} | gaps: ${board.knowledge_gaps.length} | next_review: ${board.next_review_date}`,
  );

  return board;
}
