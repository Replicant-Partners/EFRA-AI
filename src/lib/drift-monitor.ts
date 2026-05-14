/**
 * Persona Drift Monitor
 * Plane C · Longitudinal Observer
 *
 * Detects whether analysis quality is drifting over time for a given analyst.
 * Instead of embedding-space cosine distance (the architecture doc uses this
 * for LLM persona drift), we adapt the concept to score-space distance:
 *
 *   drift_norm = |current_overall - rolling_mean_overall|
 *
 * This is simpler and directly actionable: if an analyst's scores are
 * consistently diverging from their own historical mean, something changed
 * (pipeline prompt change, new ticker domain, systematic bias introduced).
 *
 * Thresholds (calibrated for 0.0–1.0 score space):
 *   < 0.10  → nominal    (within normal variance)
 *   0.10–0.20 → warning  (approaching drift boundary)
 *   > 0.20  → anomalous  (significant drift detected)
 *
 * The monitor also tracks per-dimension drift to identify which evaluator
 * dimension is driving the overall drift.
 */

import type { TimelineEntryRecord, DimScores } from "./timeline-writer.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const DRIFT_WARNING_THRESHOLD  = 0.10;
const DRIFT_ANOMALY_THRESHOLD  = 0.20;
const MIN_ENTRIES_FOR_BASELINE = 3;    // need at least N entries to compute drift
const EWMA_ALPHA               = 0.3;  // exponential weighting (recent = more weight)

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RollingMeans {
  argument_quality:        number;
  scenario_coherence:      number;
  probability_calibration: number;
  overall:                 number;
}

export interface DriftVector {
  norm:            number;   // overall drift magnitude (0.0 = no drift)
  anomalous:       boolean;  // true if norm > DRIFT_ANOMALY_THRESHOLD
  warning:         boolean;  // true if norm > DRIFT_WARNING_THRESHOLD
  per_dimension:   Record<string, number>;  // drift per dimension
  driven_by:       string | null;           // dimension with highest drift
  rolling_means:   RollingMeans;            // updated rolling means after this entry
  entry_count:     number;                  // how many entries were used for baseline
}

// ─── EWMA Rolling Mean ────────────────────────────────────────────────────────
// Exponentially Weighted Moving Average — recent entries matter more.
// alpha = 0.3: new_mean = 0.3 * current + 0.7 * prev_mean

function ewmaUpdate(prev_mean: number, current: number): number {
  return EWMA_ALPHA * current + (1 - EWMA_ALPHA) * prev_mean;
}

// ─── Simple mean for initial baseline ─────────────────────────────────────────

function simpleMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// ─── Compute drift for a single new entry ────────────────────────────────────

export function computeDrift({
  entry,
  prior_entries,
  prior_rolling_means,
}: {
  entry:               TimelineEntryRecord;
  prior_entries:       TimelineEntryRecord[];
  prior_rolling_means: RollingMeans | null;
}): DriftVector {
  const dims: Array<keyof DimScores> = [
    "argument_quality",
    "scenario_coherence",
    "probability_calibration",
    "overall",
  ];

  // Need enough history to establish a baseline
  if (prior_entries.length < MIN_ENTRIES_FOR_BASELINE) {
    // Not enough data — return zero drift, compute initial means from what we have
    const all = [...prior_entries, entry];
    const initial_means: RollingMeans = {
      argument_quality:        simpleMean(all.map(e => e.dim_scores.argument_quality)),
      scenario_coherence:      simpleMean(all.map(e => e.dim_scores.scenario_coherence)),
      probability_calibration: simpleMean(all.map(e => e.dim_scores.probability_calibration)),
      overall:                 simpleMean(all.map(e => e.dim_scores.overall)),
    };
    return {
      norm:           0.0,
      anomalous:      false,
      warning:        false,
      per_dimension:  { argument_quality: 0, scenario_coherence: 0, probability_calibration: 0, overall: 0 },
      driven_by:      null,
      rolling_means:  initial_means,
      entry_count:    prior_entries.length,
    };
  }

  // Compute current rolling means (using prior state if available)
  let rolling: RollingMeans;

  if (prior_rolling_means) {
    // Update EWMA with the new entry's scores
    rolling = {
      argument_quality:        ewmaUpdate(prior_rolling_means.argument_quality,        entry.dim_scores.argument_quality),
      scenario_coherence:      ewmaUpdate(prior_rolling_means.scenario_coherence,      entry.dim_scores.scenario_coherence),
      probability_calibration: ewmaUpdate(prior_rolling_means.probability_calibration, entry.dim_scores.probability_calibration),
      overall:                 ewmaUpdate(prior_rolling_means.overall,                 entry.dim_scores.overall),
    };
  } else {
    // Rebuild from prior entries (fallback when no stored means)
    rolling = {
      argument_quality:        simpleMean(prior_entries.map(e => e.dim_scores.argument_quality)),
      scenario_coherence:      simpleMean(prior_entries.map(e => e.dim_scores.scenario_coherence)),
      probability_calibration: simpleMean(prior_entries.map(e => e.dim_scores.probability_calibration)),
      overall:                 simpleMean(prior_entries.map(e => e.dim_scores.overall)),
    };
  }

  // Compute per-dimension drift distance from the mean BEFORE this entry
  const baseline = prior_rolling_means ?? rolling;
  const per_dimension: Record<string, number> = {};

  for (const dim of dims) {
    const current = entry.dim_scores[dim];
    const mean    = baseline[dim as keyof RollingMeans];
    per_dimension[dim] = Math.round(Math.abs(current - mean) * 1000) / 1000;
  }

  // Overall drift norm = distance of overall score from rolling mean
  const norm = per_dimension["overall"] ?? 0;

  // Find which dimension is driving the drift most
  const driven_by_entry = Object.entries(per_dimension)
    .filter(([k]) => k !== "overall")
    .sort(([, a], [, b]) => b - a)[0];
  const driven_by = driven_by_entry && driven_by_entry[1] > 0.05
    ? driven_by_entry[0]
    : null;

  return {
    norm:          Math.round(norm * 1000) / 1000,
    anomalous:     norm > DRIFT_ANOMALY_THRESHOLD,
    warning:       norm > DRIFT_WARNING_THRESHOLD,
    per_dimension,
    driven_by,
    rolling_means: rolling,
    entry_count:   prior_entries.length,
  };
}

// ─── Batch compute: scan a window of entries ──────────────────────────────────
// Used by Background Worker Pass 1.
// Returns a drift vector for each entry in the window (oldest-first).

export function computeDriftWindow({
  entries,
  initial_rolling_means,
}: {
  entries:               TimelineEntryRecord[];
  initial_rolling_means: RollingMeans | null;
}): Array<{ entry_id: string; drift: DriftVector }> {
  const results: Array<{ entry_id: string; drift: DriftVector }> = [];
  let running_means = initial_rolling_means;
  const processed: TimelineEntryRecord[] = [];

  for (const entry of entries) {
    const drift = computeDrift({
      entry,
      prior_entries:       processed,
      prior_rolling_means: running_means,
    });

    results.push({ entry_id: entry.id, drift });

    // Update running means for next iteration
    running_means = drift.rolling_means;
    processed.push(entry);
  }

  return results;
}

// ─── Trend Analyser (on-demand window statistics) ─────────────────────────────

export interface TrendReport {
  analyst_id:      string;
  window_size:     number;
  period_start:    Date;
  period_end:      Date;
  means:           RollingMeans;
  std_devs:        Partial<RollingMeans>;
  trend_direction: Record<string, "improving" | "declining" | "stable">;
  best_dimension:  string;
  worst_dimension: string;
  anomaly_rate:    number;  // fraction of entries with anomaly_flags
}

export function computeTrendReport({
  analyst_id,
  entries,
}: {
  analyst_id: string;
  entries:    TimelineEntryRecord[];
}): TrendReport | null {
  if (entries.length === 0) return null;

  const dims: Array<keyof DimScores> = [
    "argument_quality",
    "scenario_coherence",
    "probability_calibration",
    "overall",
  ];

  const means: Partial<RollingMeans> = {};
  const std_devs: Partial<RollingMeans> = {};
  const trend_direction: Record<string, "improving" | "declining" | "stable"> = {};

  for (const dim of dims) {
    const values = entries.map(e => e.dim_scores[dim]);
    const mean   = simpleMean(values);
    means[dim]   = Math.round(mean * 1000) / 1000;

    // Std dev
    const variance = simpleMean(values.map(v => Math.pow(v - mean, 2)));
    std_devs[dim]  = Math.round(Math.sqrt(variance) * 1000) / 1000;

    // Trend: compare first half vs second half
    if (entries.length >= 4) {
      const mid        = Math.floor(entries.length / 2);
      const first_half = simpleMean(entries.slice(0, mid).map(e => e.dim_scores[dim]));
      const second_half= simpleMean(entries.slice(mid).map(e => e.dim_scores[dim]));
      const delta = second_half - first_half;
      trend_direction[dim] = delta > 0.05 ? "improving"
                           : delta < -0.05 ? "declining"
                           : "stable";
    } else {
      trend_direction[dim] = "stable";
    }
  }

  const full_means = means as RollingMeans;

  // Best / worst dimension (excluding "overall")
  const dim_scores_only = Object.entries(full_means)
    .filter(([k]) => k !== "overall")
    .sort(([, a], [, b]) => b - a);

  const best_dimension  = dim_scores_only[0]?.[0]  ?? "overall";
  const worst_dimension = dim_scores_only[dim_scores_only.length - 1]?.[0] ?? "overall";

  const anomaly_rate = entries.filter(e => e.anomaly_flags.length > 0).length / entries.length;

  const sorted = [...entries].sort((a, b) => a.created_at.getTime() - b.created_at.getTime());

  return {
    analyst_id,
    window_size:     entries.length,
    period_start:    sorted[0].created_at,
    period_end:      sorted[sorted.length - 1].created_at,
    means:           full_means,
    std_devs,
    trend_direction,
    best_dimension,
    worst_dimension,
    anomaly_rate:    Math.round(anomaly_rate * 1000) / 1000,
  };
}
