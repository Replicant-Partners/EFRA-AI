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
import { writeEpisode } from "./episode-store.js";
import { writeCorrectionTimelineEntry } from "./timeline-writer.js";
import type { EncodedIntervention } from "./intervention-encoder.js";
import type { GateOutcome } from "./coherence-gate.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TwoWriteReceipt {
  correction_id:        string;
  synthetic_episode_id: string;
  // ID of the Episode row written into the main Episode Store
  // This is what makes the correction visible to the drift monitor
  // and future evaluations — the real re-injection.
  injected_episode_id:  string;
  anomaly_resolved:     boolean;
  gate_verdict:         string;
  gamma:                number;
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

  // Run Writes 1 + 2 in a transaction (EpisodeCorrection + SyntheticEpisode)
  const [correction, synthetic] = await prisma.$transaction(async (tx) => {
    // Write 1 — EpisodeCorrection (immutable audit record)
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

    // Write 2 — SyntheticEpisode (audit + FK to correction)
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

  // Write 3 — Re-inject into Episode Store (the actual re-injection)
  // This is what closes the loop: the drift monitor, evaluator registry,
  // and future analyses all read from Episode. Without this write,
  // the correction has no observable effect on future behavior.
  //
  // Why outside the transaction: writeEpisode uses a separate prisma client
  // call and we want a clean cuid() ID. A failure here is non-critical —
  // the correction is already recorded in EpisodeCorrection.
  let injected_episode_id = "";
  try {
    injected_episode_id = await writeEpisode({
      analysis_id:      original_episode.analysis_id,
      analyst_id:       original_episode.analyst_id,
      ticker:           original_episode.ticker,
      agent:            original_episode.agent,
      // Query context: reference to the original + correction metadata
      query:            [
        `ticker:${original_episode.ticker}`,
        `agent:${original_episode.agent}`,
        `synthetic:true`,
        `correction:${correction.id}`,
        `gamma:${gate_outcome.gamma.toFixed(3)}`,
        `scope:${encoded.scope}`,
        `classification:${encoded.classification}`,
      ].join(" | "),
      // Corrected response carries the original output + _correction annotation
      response:         corrected_response,
      provenance:       "synthetic",
      analyst_note:     `Reviewer intervention (${encoded.classification}) — Γ(C)=${gate_outcome.gamma.toFixed(3)} · ${gate_outcome.verdict}`,
      pipeline_version: 1,
    });

    console.log(`[TwoWriteMemory] ✓ Write 3 — Episode re-injected: ${injected_episode_id}`);
  } catch (err) {
    console.warn("[TwoWriteMemory] Write 3 failed — Episode not re-injected:", err);
    // Fall back to synthetic episode id so the receipt is still useful
    injected_episode_id = synthetic.id;
  }

  // Write 4 — Correction TimelineEntry (signals drift monitor to recalibrate)
  // This is what makes the re-injection visible to the Background Worker on its
  // next scan. Without this entry, the drift monitor would never see the correction.
  try {
    await writeCorrectionTimelineEntry({
      analysis_id:   original_episode.analysis_id,
      analyst_id:    original_episode.analyst_id,
      ticker:        original_episode.ticker,
      correction_id: correction.id,
      gamma:         gate_outcome.gamma,
    });
  } catch (err) {
    console.warn("[TwoWriteMemory] Write 4 failed — TimelineEntry not written:", err);
  }

  // Resolve the AnomalyEvent (non-critical)
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
    `[TwoWriteMemory] ✓ Loop closed — ` +
    `correction: ${correction.id} | synthetic: ${synthetic.id} | ` +
    `episode: ${injected_episode_id} | ` +
    `Γ(C): ${gate_outcome.gamma.toFixed(3)} (${gate_outcome.verdict}) | ` +
    `anomaly resolved: ${anomaly_resolved}`
  );

  return {
    correction_id:        correction.id,
    synthetic_episode_id: synthetic.id,
    injected_episode_id,
    anomaly_resolved,
    gate_verdict:         gate_outcome.verdict,
    gamma:                gate_outcome.gamma,
  };
}

// ─── Read helpers ─────────────────────────────────────────────────────────────

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

/**
 * Get high-authority episodes for an analyst (synthetic + human_corrected).
 * These are the episodes that should carry the most weight in drift detection.
 * Returned newest-first, authority_weight descending within same date.
 *
 * Used by the drift monitor to build a weighted baseline:
 *   synthetic episodes (1.0) >> human_corrected (1.0) >> human_approved (0.8) >> auto_pass (0.5)
 */
export async function getHighAuthorityEpisodes(analyst_id: string, limit = 100) {
  return prisma.episode.findMany({
    where: {
      analyst_id,
      provenance: { in: ["synthetic", "human_corrected", "human_approved"] },
    },
    orderBy: [
      { authority_weight: "desc" },
      { created_at:       "desc" },
    ],
    take: limit,
    select: {
      id:               true,
      ticker:           true,
      agent:            true,
      provenance:       true,
      authority_weight: true,
      confidence:       true,
      analyst_note:     true,
      created_at:       true,
    },
  });
}

/**
 * Count of synthetic episodes injected for an analyst.
 * Used by Observatory to show how many corrections have been re-injected.
 */
export async function countSyntheticEpisodes(analyst_id: string): Promise<number> {
  return prisma.episode.count({
    where: { analyst_id, provenance: "synthetic" },
  });
}
