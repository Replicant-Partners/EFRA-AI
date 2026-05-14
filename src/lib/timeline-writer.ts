/**
 * Timeline Writer — Episode Scorer (inline writer)
 * Plane C · Longitudinal Observer
 *
 * Immediately after the Evaluator Registry produces an AggregatedSignal,
 * this module projects it into a denormalized TimelineEntry row.
 *
 * This is the "hot path" write: it runs synchronously within the analysis
 * save flow, before the Background Worker does its async two-pass scan.
 *
 * The TimelineEntry is the primary read surface for:
 *   - Trend analysis (rolling window statistics)
 *   - Drift detection (Background Worker Pass 1)
 *   - Anomaly detection (Background Worker Pass 2)
 *   - Observatory UI (future Plane D)
 */

import { prisma } from "./prisma.js";
import type { RegistryOutcome } from "./evaluator-registry.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DimScores {
  argument_quality:        number;
  scenario_coherence:      number;
  probability_calibration: number;
  overall:                 number;
}

export interface TimelineEntryRecord {
  id:               string;
  analysis_id:      string;
  eval_run_id:      string | null;   // null for correction-sourced entries
  analyst_id:       string;
  ticker:           string;
  dim_scores:       DimScores;
  drift_norm:       number;
  anomaly_flags:    string[];
  pipeline_version: number;
  worker_processed: boolean;
  created_at:       Date;
}

// ─── Write inline from EvalRun result ────────────────────────────────────────

export async function writeTimelineEntry({
  analysis_id,
  analyst_id,
  ticker,
  registry_outcome,
  pipeline_version = 1,
}: {
  analysis_id:       string;
  analyst_id:        string;
  ticker:            string;
  registry_outcome:  RegistryOutcome;
  pipeline_version?: number;
}): Promise<string> {
  const { eval_run_id, aggregated_signal, overall_score, conflict_flags } = registry_outcome;

  const dim_scores: DimScores = {
    argument_quality:        aggregated_signal.argument_quality,
    scenario_coherence:      aggregated_signal.scenario_coherence,
    probability_calibration: aggregated_signal.probability_calibration,
    overall:                 overall_score,
  };

  // Seed anomaly_flags from conflict_flags detected by the Aggregator.
  // The Background Worker will add drift:* and safety:* flags in Pass 1/2.
  const initial_flags = conflict_flags.map(f => f); // copy

  const entry = await prisma.timelineEntry.create({
    data: {
      analysis_id,
      eval_run_id,
      analyst_id,
      ticker:           ticker.toUpperCase(),
      dim_scores:       dim_scores as object,
      drift_norm:       0.0,   // computed by Background Worker in Pass 1
      anomaly_flags:    initial_flags,
      provenance:       "eval_run",
      pipeline_version,
      worker_processed: false,
    },
    select: { id: true },
  });

  console.log(
    `[TimelineWriter] Entry written — id: ${entry.id} | ` +
    `overall: ${overall_score.toFixed(3)} | flags: ${initial_flags.join(", ") || "none"}`
  );

  return entry.id;
}

// ─── Write correction entry (from Two-Write Memory) ──────────────────────────
// Written when a human correction is re-injected.
// Has no EvalRun (eval_run_id = null, provenance = "correction").
// dim_scores are inherited from the most recent normal TimelineEntry for this
// analyst so the rolling mean has a valid anchor point.
// The drift monitor will recalibrate when it next scans this entry.

export async function writeCorrectionTimelineEntry({
  analysis_id,
  analyst_id,
  ticker,
  correction_id,
  gamma,
}: {
  analysis_id:   string;
  analyst_id:    string;
  ticker:        string;
  correction_id: string;
  gamma:         number;
}): Promise<string> {
  // Inherit dim_scores from most recent entry for this analyst
  const prior = await prisma.timelineEntry.findFirst({
    where:   { analyst_id },
    orderBy: { created_at: "desc" },
    select:  { dim_scores: true },
  });

  const dim_scores = prior
    ? (prior.dim_scores as unknown as DimScores)
    : { argument_quality: 0.5, scenario_coherence: 0.5, probability_calibration: 0.5, overall: 0.5 };

  const entry = await prisma.timelineEntry.create({
    data: {
      analysis_id,
      eval_run_id:      null,   // no EvalRun for correction entries
      analyst_id,
      ticker:           ticker.toUpperCase(),
      dim_scores:       dim_scores as object,
      drift_norm:       0.0,
      anomaly_flags:    [`correction:${correction_id}`, `gamma:${gamma.toFixed(3)}`],
      provenance:       "correction",
      pipeline_version: 1,
      worker_processed: false,
    },
    select: { id: true },
  });

  console.log(
    `[TimelineWriter] Correction entry written — id: ${entry.id} | ` +
    `correction: ${correction_id} | Γ(C): ${gamma.toFixed(3)}`
  );

  return entry.id;
}

// ─── Write dyad rupture entry ─────────────────────────────────────────────────
// Written by the Dyad Tracker when a relational rupture is detected.
// Has no EvalRun. provenance = "correction" (reuses the nullable FK slot).
// anomaly_flags: ["rupture:<kind>", "dyad:<id>"]
// The Background Worker skips these in drift computation (worker_processed = true).

export async function writeDyadRuptureTimelineEntry({
  analysis_id,
  analyst_id,
  ticker,
  dyad_id,
  rupture_kind,
  prev_trust,
  new_trust,
}: {
  analysis_id:   string;
  analyst_id:    string;
  ticker:        string;
  dyad_id:       string;
  rupture_kind:  string;
  prev_trust:    number;
  new_trust:     number;
}): Promise<string> {
  // Inherit dim_scores from most recent entry (anchor point for consistency)
  const prior = await prisma.timelineEntry.findFirst({
    where:   { analyst_id },
    orderBy: { created_at: "desc" },
    select:  { dim_scores: true },
  });

  // Override trust dimension with the new (ruptured) value
  const base_scores = prior
    ? (prior.dim_scores as unknown as DimScores)
    : { argument_quality: 0.5, scenario_coherence: 0.5, probability_calibration: 0.5, overall: 0.5 };

  const dim_scores: DimScores = {
    ...base_scores,
    overall: new_trust,  // reflect the trust collapse in the overall score
  };

  const entry = await prisma.timelineEntry.create({
    data: {
      analysis_id,
      eval_run_id:      null,
      analyst_id,
      ticker:           ticker.toUpperCase(),
      dim_scores:       dim_scores as object,
      drift_norm:       Math.abs(prev_trust - new_trust),  // rupture magnitude as drift
      anomaly_flags:    [`rupture:${rupture_kind}`, `dyad:${dyad_id}`],
      provenance:       "correction",
      pipeline_version: 1,
      worker_processed: true,  // skip Background Worker drift re-computation for ruptures
    },
    select: { id: true },
  });

  console.log(
    `[TimelineWriter] Dyad rupture entry — id: ${entry.id} | ` +
    `rupture_kind: ${rupture_kind} | trust: ${prev_trust.toFixed(3)}→${new_trust.toFixed(3)}`
  );

  return entry.id;
}

// ─── Read helpers ─────────────────────────────────────────────────────────────

/**
 * List timeline entries for an analyst, ordered oldest-first.
 * Used by the Background Worker for incremental scanning.
 */
export async function listEntriesSince({
  analyst_id,
  since_entry_id,
  batch = 200,
}: {
  analyst_id:      string;
  since_entry_id?: string;
  batch?:          number;
}): Promise<TimelineEntryRecord[]> {
  // If we have a cursor, get its created_at so we can paginate by time
  let since_date: Date | undefined;
  if (since_entry_id) {
    const cursor = await prisma.timelineEntry.findUnique({
      where:  { id: since_entry_id },
      select: { created_at: true },
    });
    since_date = cursor?.created_at;
  }

  const rows = await prisma.timelineEntry.findMany({
    where: {
      analyst_id,
      ...(since_date ? { created_at: { gt: since_date } } : {}),
    },
    orderBy: { created_at: "asc" },
    take:    batch,
  });

  return rows.map(r => ({
    id:               r.id,
    analysis_id:      r.analysis_id,
    eval_run_id:      r.eval_run_id,
    analyst_id:       r.analyst_id,
    ticker:           r.ticker,
    dim_scores:       r.dim_scores as unknown as DimScores,
    drift_norm:       r.drift_norm,
    anomaly_flags:    r.anomaly_flags,
    pipeline_version: r.pipeline_version,
    worker_processed: r.worker_processed,
    created_at:       r.created_at,
  }));
}

/**
 * List the last N entries for a given analyst (newest-first).
 * Used by TrendAnalyzer and Observatory UI.
 */
export async function getRecentEntries({
  analyst_id,
  limit = 30,
  ticker,
}: {
  analyst_id: string;
  limit?:     number;
  ticker?:    string;
}): Promise<TimelineEntryRecord[]> {
  const rows = await prisma.timelineEntry.findMany({
    where: {
      analyst_id,
      ...(ticker ? { ticker: ticker.toUpperCase() } : {}),
    },
    orderBy: { created_at: "desc" },
    take:    limit,
  });

  return rows.map(r => ({
    id:               r.id,
    analysis_id:      r.analysis_id,
    eval_run_id:      r.eval_run_id,
    analyst_id:       r.analyst_id,
    ticker:           r.ticker,
    dim_scores:       r.dim_scores as unknown as DimScores,
    drift_norm:       r.drift_norm,
    anomaly_flags:    r.anomaly_flags,
    pipeline_version: r.pipeline_version,
    worker_processed: r.worker_processed,
    created_at:       r.created_at,
  }));
}

/**
 * Update drift_norm and anomaly_flags after Background Worker Pass 1.
 */
export async function updateEntryDrift({
  entry_id,
  drift_norm,
  additional_flags,
}: {
  entry_id:         string;
  drift_norm:       number;
  additional_flags: string[];
}): Promise<void> {
  // Merge new flags with existing ones (avoid duplicates)
  const existing = await prisma.timelineEntry.findUnique({
    where:  { id: entry_id },
    select: { anomaly_flags: true },
  });
  const merged = Array.from(
    new Set([...(existing?.anomaly_flags ?? []), ...additional_flags])
  );

  await prisma.timelineEntry.update({
    where: { id: entry_id },
    data: {
      drift_norm,
      anomaly_flags:    merged,
      worker_processed: true,
      provenance:       "correction",
    },
  });
}
