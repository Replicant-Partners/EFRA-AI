/**
 * Anomaly Detector
 * Plane C · Longitudinal Observer
 *
 * Detects four kinds of anomalies in the timeline (mirrors architecture §4.2):
 *
 *   DRIFT    — analyst's overall score drifts anomalously from their rolling mean
 *   CONFLICT — same dimension has conflict flags in N consecutive entries
 *   SAFETY   — overall score drops below a hard threshold (quality floor)
 *   RUPTURE  — sudden score collapse in a single dimension (social tracker analogue)
 *
 * Severity mapping:
 *   SAFETY critical  — overall < 0.30 (research quality floor breached)
 *   DRIFT  high      — drift_norm > 0.30
 *   DRIFT  medium    — drift_norm 0.20–0.30
 *   CONFLICT medium  — same conflict flag in 3+ consecutive entries
 *   RUPTURE medium   — single-dimension drop > 0.35 from rolling mean
 *
 * The detector is pure (no DB access). It returns DetectedAnomaly objects.
 * The Background Worker persists them as AnomalyEvent rows.
 */

import type { TimelineEntryRecord } from "./timeline-writer.js";
import type { DriftVector } from "./drift-monitor.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const SAFETY_CRITICAL_THRESHOLD = 0.30;   // overall score below this = critical
const SAFETY_WARNING_THRESHOLD  = 0.45;   // overall score below this = warning
const CONFLICT_CONSECUTIVE_N    = 3;       // same conflict flag in N rows = anomaly
const RUPTURE_THRESHOLD         = 0.35;   // per-dimension drop that triggers rupture
const DRIFT_HIGH_THRESHOLD      = 0.30;   // drift_norm above = high severity

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnomalyKind     = "drift" | "conflict" | "rupture" | "safety";
export type AnomalySeverity = "low" | "medium" | "high" | "critical";

export interface DetectedAnomaly {
  kind:              AnomalyKind;
  severity:          AnomalySeverity;
  timeline_entry_id: string;
  analyst_id:        string;
  ticker:            string;
  payload:           Record<string, unknown>;
  requires_review:   boolean;
}

// ─── Kind 1: SAFETY ───────────────────────────────────────────────────────────
// Triggered when overall score drops below the quality floor.
// Always requires_review = true.

function detectSafety(entry: TimelineEntryRecord): DetectedAnomaly | null {
  const overall = entry.dim_scores.overall;

  if (overall < SAFETY_CRITICAL_THRESHOLD) {
    return {
      kind:              "safety",
      severity:          "critical",
      timeline_entry_id: entry.id,
      analyst_id:        entry.analyst_id,
      ticker:            entry.ticker,
      payload: {
        overall_score:    overall,
        threshold:        SAFETY_CRITICAL_THRESHOLD,
        dim_scores:       entry.dim_scores,
        message:          `Overall quality score ${overall.toFixed(3)} is below critical threshold ${SAFETY_CRITICAL_THRESHOLD}`,
      },
      requires_review: true,
    };
  }

  if (overall < SAFETY_WARNING_THRESHOLD) {
    return {
      kind:              "safety",
      severity:          "medium",
      timeline_entry_id: entry.id,
      analyst_id:        entry.analyst_id,
      ticker:            entry.ticker,
      payload: {
        overall_score: overall,
        threshold:     SAFETY_WARNING_THRESHOLD,
        dim_scores:    entry.dim_scores,
        message:       `Overall quality score ${overall.toFixed(3)} is below warning threshold ${SAFETY_WARNING_THRESHOLD}`,
      },
      requires_review: false,
    };
  }

  return null;
}

// ─── Kind 2: DRIFT ────────────────────────────────────────────────────────────
// Triggered when drift_norm exceeds thresholds computed by the Drift Monitor.

function detectDrift(
  entry:  TimelineEntryRecord,
  drift:  DriftVector,
): DetectedAnomaly | null {
  if (!drift.anomalous) return null;

  const severity: AnomalySeverity = drift.norm > DRIFT_HIGH_THRESHOLD ? "high" : "medium";

  return {
    kind:              "drift",
    severity,
    timeline_entry_id: entry.id,
    analyst_id:        entry.analyst_id,
    ticker:            entry.ticker,
    payload: {
      drift_norm:      drift.norm,
      driven_by:       drift.driven_by,
      per_dimension:   drift.per_dimension,
      rolling_means:   drift.rolling_means,
      entry_count:     drift.entry_count,
      message: `Drift norm ${drift.norm.toFixed(3)} exceeds anomaly threshold. ` +
               (drift.driven_by ? `Primary driver: ${drift.driven_by}` : ""),
    },
    requires_review: severity === "high",
  };
}

// ─── Kind 3: CONFLICT ─────────────────────────────────────────────────────────
// Triggered when the same conflict flag appears in N consecutive entries.
// Looks back at the window to detect persistence.

function detectConflict(
  entry:   TimelineEntryRecord,
  window:  TimelineEntryRecord[],
): DetectedAnomaly[] {
  const anomalies: DetectedAnomaly[] = [];

  // Gather all conflict flags on this entry
  const conflict_flags = entry.anomaly_flags.filter(f => f.startsWith("conflict:"));

  for (const flag of conflict_flags) {
    // Count how many consecutive prior entries also had this flag
    const recent = [...window].reverse(); // newest-first
    let consecutive = 0;
    for (const prior of recent) {
      if (prior.anomaly_flags.includes(flag)) consecutive++;
      else break;
    }

    if (consecutive + 1 >= CONFLICT_CONSECUTIVE_N) {
      const dimension = flag.replace("conflict:", "");
      anomalies.push({
        kind:              "conflict",
        severity:          "medium",
        timeline_entry_id: entry.id,
        analyst_id:        entry.analyst_id,
        ticker:            entry.ticker,
        payload: {
          flag,
          dimension,
          consecutive_count: consecutive + 1,
          threshold:         CONFLICT_CONSECUTIVE_N,
          message: `Evaluator conflict on dimension "${dimension}" in ${consecutive + 1} consecutive entries`,
        },
        requires_review: true,
      });
    }
  }

  return anomalies;
}

// ─── Kind 4: RUPTURE ──────────────────────────────────────────────────────────
// Triggered when a single dimension collapses suddenly vs the prior entry.
// Analogous to social tracker rupture detection (EWMA rapport collapse).

function detectRupture(
  entry:        TimelineEntryRecord,
  prior_entry:  TimelineEntryRecord | undefined,
): DetectedAnomaly[] {
  if (!prior_entry) return [];

  const anomalies: DetectedAnomaly[] = [];
  const dims = ["argument_quality", "scenario_coherence", "probability_calibration"] as const;

  for (const dim of dims) {
    const current = entry.dim_scores[dim];
    const prior   = prior_entry.dim_scores[dim];
    const drop    = prior - current;  // positive = decline

    if (drop > RUPTURE_THRESHOLD) {
      anomalies.push({
        kind:              "rupture",
        severity:          "medium",
        timeline_entry_id: entry.id,
        analyst_id:        entry.analyst_id,
        ticker:            entry.ticker,
        payload: {
          dimension:    dim,
          current:      current,
          prior:        prior,
          drop:         Math.round(drop * 1000) / 1000,
          threshold:    RUPTURE_THRESHOLD,
          message: `Sudden quality collapse in dimension "${dim}": ${prior.toFixed(3)} → ${current.toFixed(3)} (−${drop.toFixed(3)})`,
        },
        requires_review: false,
      });
    }
  }

  return anomalies;
}

// ─── Main: detect in window ───────────────────────────────────────────────────
// Runs all four detectors on a single entry, given the window of prior entries.
// Called by Background Worker Pass 2.

export function detectInWindow({
  entry,
  prior_entries,
  drift,
}: {
  entry:         TimelineEntryRecord;
  prior_entries: TimelineEntryRecord[];
  drift:         DriftVector;
}): DetectedAnomaly[] {
  const anomalies: DetectedAnomaly[] = [];

  // Safety check (runs first — hard floor)
  const safety = detectSafety(entry);
  if (safety) anomalies.push(safety);

  // Drift check (requires drift vector from Pass 1)
  const drift_anomaly = detectDrift(entry, drift);
  if (drift_anomaly) anomalies.push(drift_anomaly);

  // Conflict check (requires window of prior entries)
  const conflicts = detectConflict(entry, prior_entries);
  anomalies.push(...conflicts);

  // Rupture check (requires immediately prior entry)
  const prior = prior_entries[prior_entries.length - 1];
  const ruptures = detectRupture(entry, prior);
  anomalies.push(...ruptures);

  if (anomalies.length > 0) {
    console.log(
      `[AnomalyDetector] ${anomalies.length} anomaly/ies on entry ${entry.id}: ` +
      anomalies.map(a => `${a.kind}(${a.severity})`).join(", ")
    );
  }

  return anomalies;
}
