/**
 * Episode Store
 *
 * Inspired by the Social Agent Observability Platform logical architecture.
 * Each agent step in a pipeline run produces one Episode record.
 *
 * Provenance hierarchy (matches authority_weight):
 *   auto_drop       0.3 — pipeline rejected at gate (DROP/BLOCK/HALT)
 *   auto_pass       0.5 — agent ran, analyst did not review
 *   human_approved  0.8 — analyst explicitly reviewed and approved
 *   human_corrected 1.0 — analyst added a note/correction (highest authority)
 *
 * The key insight from the architecture doc: human corrections carry higher
 * epistemic weight than auto-generated episodes. This allows future drift
 * detection to weight human-validated evidence more heavily.
 */

import { prisma } from "./prisma.js";
import type { PipelineState } from "../shared/types.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Provenance =
  | "auto_pass"       // agent ran, no human review
  | "auto_drop"       // gate rejection (DROP / BLOCK / HALT)
  | "human_approved"  // analyst approved without note
  | "human_corrected" // analyst added a note before continuing
  | "synthetic";      // system-generated correction (future use)

export const AUTHORITY_WEIGHT: Record<Provenance, number> = {
  auto_drop:       0.3,
  auto_pass:       0.5,
  human_approved:  0.8,
  human_corrected: 1.0,
  synthetic:       1.0,
};

export interface EpisodeInput {
  analysis_id:      string;
  analyst_id:       string;
  ticker:           string;
  agent:            string;
  query:            string;        // serialized context summary sent to the agent
  response:         object;        // structured agent output
  provenance:       Provenance;
  analyst_note?:    string;        // note added at approval time
  pipeline_version?:number;
  // Denormalized scores (extracted from response for fast querying)
  alpha_score?:     number;
  risk_score?:      number;
  confidence?:      number;
  rr_ratio?:        number;
  enter_score?:     number;
  process_confidence?: number;
  lens_verdict?:    string;
  loop_score?:      number;
  dk_flag?:         string;
}

// ─── Extract scores from PipelineState ───────────────────────────────────────

function scoresFromState(agent: string, state: Partial<PipelineState>) {
  switch (agent) {
    case "scout":
      return {
        alpha_score: state.scout?.alpha_score.total,
        confidence:  state.scout?.confidence,
      };
    case "forensic_pre":
    case "forensic":
      return {
        risk_score: state.forensic?.risk_score,
        confidence: state.forensic?.mgmt_trust_score != null
          ? state.forensic.mgmt_trust_score / 100
          : undefined,
      };
    case "valuation":
      return {
        rr_ratio:   state.valuation?.rr_ratio,
        confidence: state.valuation?.faves_score?.total != null
          ? state.valuation.faves_score.total / 9
          : undefined,
      };
    case "communication":
      return {
        enter_score: state.communication?.enter_gate?.effective_score,
        confidence:  state.communication?.audit_trail?.final_confidence,
      };
    case "kata":
      return {
        process_confidence: state.kata?.process_confidence,
        confidence:         state.kata?.process_confidence,
      };
    case "lens":
      return {
        lens_verdict: state.lens?.overall_verdict,
        loop_score:   state.lens?.loop?.score,
        dk_flag:      state.lens?.dunning_kruger?.flag,
        confidence:   state.lens?.loop?.score != null
          ? state.lens.loop.score / 100
          : undefined,
      };
    default:
      return {};
  }
}

// ─── Write episode ────────────────────────────────────────────────────────────

export async function writeEpisode(input: EpisodeInput): Promise<string> {
  const authority_weight = AUTHORITY_WEIGHT[input.provenance];

  const episode = await prisma.episode.create({
    data: {
      analysis_id:       input.analysis_id,
      analyst_id:        input.analyst_id,
      ticker:            input.ticker,
      agent:             input.agent,
      query:             input.query,
      response:          input.response as object,
      provenance:        input.provenance,
      authority_weight,
      analyst_note:      input.analyst_note ?? null,
      pipeline_version:  input.pipeline_version ?? 1,
      alpha_score:       input.alpha_score       ?? null,
      risk_score:        input.risk_score        ?? null,
      confidence:        input.confidence        ?? null,
      rr_ratio:          input.rr_ratio          ?? null,
      enter_score:       input.enter_score       ?? null,
      process_confidence:input.process_confidence?? null,
      lens_verdict:      input.lens_verdict      ?? null,
      loop_score:        input.loop_score        ?? null,
      dk_flag:           input.dk_flag           ?? null,
    },
    select: { id: true },
  });

  return episode.id;
}

// ─── Convenience: write episode from pipeline route ──────────────────────────
// Called from api/agent/route.ts after each agent completes.
// The provenance is determined by whether the analyst added a note.

export async function writeAgentEpisode({
  analysis_id,
  analyst_id,
  ticker,
  agent,
  state,
  result,
  provenance,
  analyst_note,
}: {
  analysis_id:  string;
  analyst_id:   string;
  ticker:       string;
  agent:        string;
  state:        Partial<PipelineState>;
  result:       object;
  provenance:   Provenance;
  analyst_note?:string;
}): Promise<void> {
  try {
    const scores = scoresFromState(agent, { ...state, [agentStateKey(agent)]: result });

    // Build a concise query string from the context the agent received
    const query = buildQuerySummary(agent, ticker, state);

    await writeEpisode({
      analysis_id,
      analyst_id,
      ticker,
      agent,
      query,
      response:    result,
      provenance,
      analyst_note,
      ...scores,
    });
  } catch (err) {
    // Never let episode writes fail the pipeline
    console.warn(`[EpisodeStore] Failed to write episode for ${agent}:`, err);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function agentStateKey(agent: string): keyof PipelineState {
  const map: Record<string, keyof PipelineState> = {
    scout:         "scout",
    intel:         "intel",
    forensic_pre:  "forensic",
    cf:            "cf",
    forensic:      "forensic",
    valuation:     "valuation",
    kata:          "kata",
    communication: "communication",
    lens:          "lens",
  };
  return map[agent] ?? "scout";
}

function buildQuerySummary(
  agent:  string,
  ticker: string,
  state:  Partial<PipelineState>,
): string {
  // Compact context summary — what the agent "saw" when it ran
  const parts: string[] = [`ticker:${ticker}`, `agent:${agent}`];

  if (state.scout)    parts.push(`alpha:${state.scout.alpha_score.total}`, `decision:${state.scout.decision}`);
  if (state.forensic) parts.push(`risk:${state.forensic.risk_score}`, `rec:${state.forensic.recommendation}`);
  if (state.cf)       parts.push(`ev_pt:${state.cf.expected_value_pt}`, `scenarios:${state.cf.scenarios.length}`);
  if (state.valuation)parts.push(`pt:${state.valuation.pt_12m}`, `rating:${state.valuation.rating}`);

  return parts.join(" | ");
}

// ─── Read helpers (for Observatory) ──────────────────────────────────────────

export async function getEpisodesForAnalysis(analysis_id: string) {
  return prisma.episode.findMany({
    where:   { analysis_id },
    orderBy: { created_at: "asc" },
  });
}

export async function getEpisodesForAnalyst(analyst_id: string, limit = 100) {
  return prisma.episode.findMany({
    where:   { analyst_id },
    orderBy: { created_at: "desc" },
    take:    limit,
  });
}

export async function getEpisodesByAgent(agent: string, limit = 200) {
  return prisma.episode.findMany({
    where:   { agent },
    orderBy: { created_at: "desc" },
    take:    limit,
    select: {
      id: true, ticker: true, analyst_id: true, provenance: true,
      authority_weight: true, confidence: true, created_at: true,
      alpha_score: true, risk_score: true, rr_ratio: true,
      enter_score: true, lens_verdict: true, dk_flag: true,
    },
  });
}
