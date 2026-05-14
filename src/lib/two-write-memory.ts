/**
 * Two-Write Memory
 * Plane D · Human Interface — closing the recursive improvement loop
 *
 * After the Coherence Gate approves an intervention, this module
 * performs the two atomic writes that re-inject human knowledge
 * back into the Episode Store:
 *
 *   Write 1 — SyntheticEpisode
 *     A new high-authority (authority_weight=1.0) episode that represents
 *     the corrected agent output. Future drift detection weights this
 *     episode more heavily than auto-generated ones.
 *
 *   Write 2 — EpisodeCorrection
 *     An immutable record of what was changed, why, and with what
 *     coherence gate outcome. Never deleted; forms the audit trail.
 *
 * Also resolves the AnomalyEvent that triggered the intervention.
 *
 * This completes the loop:
 *   Analysis → Episodes → EvalRun → TimelineEntry → AnomalyEvent
 *     → HITL Review → Intervention → Coherence Gate → Two-Write Memory
 *     → SyntheticEpisode re-injected into Episode Store
 *     → Future analyses inherit the corrected behavioral baseline
 */

import { prisma } from "./prisma.js";
import type { EncodedIntervention } from "./intervention-encoder.js";
import type { GateOutcome } from "./coherence-gate.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TwoWriteReceipt {
  correction_id:       string;
  synthetic_episode_id:string;
  anomaly_resolved:    boolean;
  gate_verdict:        string;
  gamma:               number;
}

export interface OriginalEpisodeContext {
  episode_id:   string;
  analysis_id:  string;
  agent:        string;
  analyst_id:   string;
  ticker:       string;
  response:     object;
  query:        string;
}

// ─── Execute Two-Write ────────────────────────────────────────────────────────

export async function executeTwoWrite({
  encoded,
  gate_outcome,
  original_episode,
}: {
  encoded:           EncodedIntervention;
  gate_outcome:      GateOutcome;
  original_episode:  OriginalEpisodeContext;
}): Promise<TwoWriteReceipt> {

  // Build the corrected response: merge the correction into the original
  // The synthetic episode carries the correction_text as an annotation
  // alongside the original response so context is preserved.
  const corrected_response = {
    ...original_episode.response,
    _correction: {
      text:           encoded.correction_text,
      classification: encoded.classification,
      dimension:      encoded.dimension,
      reviewer_id:    encoded.reviewer_id,
      scope:          encoded.scope,
      gamma:          gate_outcome.gamma,
      minimum_update_set: gate_outcome.minimum_update_set,
      corrected_at:   encoded.encoded_at,
    },
  };

  // Run both writes in a transaction
  const [correction, synthetic] = await prisma.$transaction(async (tx) => {
    // Write 1 — EpisodeCorrection (audit record)
    const corr = await tx.episodeCorrection.create({
      data: {
        episode_id:        original_episode.episode_id,
        anomaly_event_id:  encoded.anomaly_event_id,
        reviewer_id:       encoded.reviewer_id,
        scope:             encoded.scope,
        classification:    encoded.classification,
        correction_text:   encoded.correction_text,
        dimension:         encoded.dimension ?? null,
        gamma:             gate_outcome.gamma,
        gate_verdict:      gate_outcome.verdict,
        tensions:          gate_outcome.tensions as unknown as object[],
        minimum_update_set:gate_outcome.minimum_update_set as unknown as object[],
        authority_weight:  encoded.authority_weight,
      },
      select: { id: true },
    });

    // Write 2 — SyntheticEpisode (high-authority re-injection)
    const synth = await tx.syntheticEpisode.create({
      data: {
        correction_id:      corr.id,
        analysis_id:        original_episode.analysis_id,
        corrected_response: corrected_response as object,
        authority_weight:   1.0,
        provenance:         "synthetic",
        agent:              original_episode.agent,
        analyst_id:         original_episode.analyst_id,
        ticker:             original_episode.ticker,
      },
      select: { id: true },
    });

    return [corr, synth];
  });

  // Resolve the AnomalyEvent outside the transaction (non-critical)
  let anomaly_resolved = false;
  try {
    await prisma.anomalyEvent.update({
      where: { id: encoded.anomaly_event_id },
      data: {
        resolved_at: new Date(),
        resolved_by: encoded.reviewer_id,
      },
    });
    anomaly_resolved = true;
  } catch (err) {
    console.warn("[TwoWriteMemory] Failed to resolve anomaly event:", err);
  }

  console.log(
    `[TwoWriteMemory] ✓ Write 1 — correction: ${correction.id} | ` +
    `Write 2 — synthetic: ${synthetic.id} | ` +
    `gamma: ${gate_outcome.gamma.toFixed(3)} | ` +
    `verdict: ${gate_outcome.verdict} | ` +
    `anomaly resolved: ${anomaly_resolved}`
  );

  return {
    correction_id:        correction.id,
    synthetic_episode_id: synthetic.id,
    anomaly_resolved,
    gate_verdict:         gate_outcome.verdict,
    gamma:                gate_outcome.gamma,
  };
}

// ─── Read helpers (for Observatory audit trail) ───────────────────────────────

export async function getCorrectionsForAnalysis(analysis_id: string) {
  return prisma.episodeCorrection.findMany({
    where:   { episode: { analysis_id } },
    include: { synthetic_episode: true },
    orderBy: { created_at: "desc" },
  });
}

export async function getSyntheticEpisodesForAnalyst(analyst_id: string, limit = 50) {
  return prisma.syntheticEpisode.findMany({
    where:   { analyst_id },
    include: { correction: { select: { classification: true, dimension: true, gamma: true, reviewer_id: true } } },
    orderBy: { created_at: "desc" },
    take:    limit,
  });
}
