/**
 * Background Worker — Two-Pass Incremental Scanner
 * Plane C · Longitudinal Observer
 *
 * Runs asynchronously after the hot path completes. Triggered by:
 *   1. Non-blocking spawn after each analysis save (via api/analyses/route.ts)
 *   2. On-demand via Observatory UI "Trigger Scan" button (future Plane D)
 *
 * Two-pass design (mirrors architecture §4.2):
 *
 *   Pass 1 — Drift computation
 *     For each unprocessed TimelineEntry (oldest-first):
 *       - Compute drift_norm vs rolling mean
 *       - Update TimelineEntry.drift_norm and add "drift:anomalous" flag if needed
 *       - Update AgentObservabilityState.rolling_means (EWMA)
 *
 *   Pass 2 — Anomaly detection
 *     Re-fetch updated entries (Pass 1 drift flags now visible).
 *     For each entry:
 *       - Run all 4 anomaly detectors (safety, drift, conflict, rupture)
 *       - Insert AnomalyEvent rows for each detected anomaly
 *
 *   Checkpoint
 *     Upsert AgentObservabilityState with last_scanned_entry_id and counters.
 *
 * Design invariants:
 *   - Never throws — all errors are logged and swallowed (non-blocking)
 *   - Idempotent — safe to run multiple times (uses worker_processed flag)
 *   - Incremental — only scans entries since last checkpoint
 */

import { prisma } from "./prisma.js";
import {
  listEntriesSince,
  updateEntryDrift,
  type TimelineEntryRecord,
} from "./timeline-writer.js";
import {
  computeDriftWindow,
  type RollingMeans,
} from "./drift-monitor.js";
import { detectInWindow } from "./anomaly-detector.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH_SIZE = 200;

// ─── Observability State ──────────────────────────────────────────────────────

async function getOrCreateObservabilityState(analyst_id: string) {
  return prisma.agentObservabilityState.upsert({
    where:  { analyst_id },
    create: { analyst_id },
    update: {},
  });
}

// ─── Main: scanAnalyst ────────────────────────────────────────────────────────

export async function scanAnalyst(analyst_id: string): Promise<void> {
  try {
    console.log(`[BackgroundWorker] Starting scan for analyst: ${analyst_id}`);

    // ── Load checkpoint ────────────────────────────────────────────────────
    const obs_state = await getOrCreateObservabilityState(analyst_id);
    const last_scanned_id = obs_state.last_scanned_entry_id ?? undefined;
    const prior_means     = (obs_state.rolling_means as unknown as RollingMeans | null) &&
                            Object.keys(obs_state.rolling_means as object).length > 0
                              ? obs_state.rolling_means as unknown as RollingMeans
                              : null;

    // ── Load unprocessed entries (oldest-first) ────────────────────────────
    const entries = await listEntriesSince({
      analyst_id,
      since_entry_id: last_scanned_id,
      batch:          BATCH_SIZE,
    });

    if (entries.length === 0) {
      console.log(`[BackgroundWorker] No new entries for ${analyst_id} — skipping`);
      return;
    }

    console.log(`[BackgroundWorker] Pass 1 — drift computation on ${entries.length} entries`);

    // ── Pass 1: Drift computation ──────────────────────────────────────────
    // Load prior processed entries for baseline (up to 20 most recent)
    const prior_processed = await prisma.timelineEntry.findMany({
      where: {
        analyst_id,
        worker_processed: true,
        ...(last_scanned_id ? {} : {}),
      },
      orderBy: { created_at: "desc" },
      take:    20,
    }).then(rows => rows.reverse().map(r => ({
      id:               r.id,
      analysis_id:      r.analysis_id,
      eval_run_id:      r.eval_run_id,
      analyst_id:       r.analyst_id,
      ticker:           r.ticker,
      dim_scores:       r.dim_scores as unknown as TimelineEntryRecord["dim_scores"],
      drift_norm:       r.drift_norm,
      anomaly_flags:    r.anomaly_flags,
      pipeline_version: r.pipeline_version,
      worker_processed: r.worker_processed,
      created_at:       r.created_at,
    } satisfies TimelineEntryRecord)));

    // Compute drift for each new entry
    const drift_results = computeDriftWindow({
      entries,
      initial_rolling_means: prior_means,
    });

    // Update DB with drift_norm and flags, track latest running means
    let latest_means: RollingMeans | null = prior_means;
    for (const { entry_id, drift } of drift_results) {
      const drift_flags: string[] = [];
      if (drift.anomalous) drift_flags.push("drift:anomalous");
      if (drift.warning && !drift.anomalous) drift_flags.push("drift:warning");

      await updateEntryDrift({
        entry_id,
        drift_norm:       drift.norm,
        additional_flags: drift_flags,
      });

      latest_means = drift.rolling_means;
    }

    // ── Pass 2: Anomaly detection ──────────────────────────────────────────
    console.log(`[BackgroundWorker] Pass 2 — anomaly detection`);

    // Re-fetch updated entries (Pass 1 flags now visible in DB)
    const updated_entries = await prisma.timelineEntry.findMany({
      where: { id: { in: entries.map(e => e.id) } },
      orderBy: { created_at: "asc" },
    }).then(rows => rows.map(r => ({
      id:               r.id,
      analysis_id:      r.analysis_id,
      eval_run_id:      r.eval_run_id,
      analyst_id:       r.analyst_id,
      ticker:           r.ticker,
      dim_scores:       r.dim_scores as unknown as TimelineEntryRecord["dim_scores"],
      drift_norm:       r.drift_norm,
      anomaly_flags:    r.anomaly_flags,
      pipeline_version: r.pipeline_version,
      worker_processed: r.worker_processed,
      created_at:       r.created_at,
    } satisfies TimelineEntryRecord)));

    let total_anomalies = 0;
    const processed_window: TimelineEntryRecord[] = [...prior_processed];

    for (let i = 0; i < updated_entries.length; i++) {
      const entry      = updated_entries[i];
      const drift_info = drift_results[i];

      const anomalies = detectInWindow({
        entry,
        prior_entries: processed_window,
        drift:         drift_info.drift,
      });

      // Persist anomalies
      if (anomalies.length > 0) {
        await prisma.anomalyEvent.createMany({
          data: anomalies.map(a => ({
            analyst_id:        a.analyst_id,
            ticker:            a.ticker,
            timeline_entry_id: a.timeline_entry_id,
            kind:              a.kind,
            severity:          a.severity,
            payload:           a.payload as object,
            requires_review:   a.requires_review,
          })),
          skipDuplicates: false,
        });
        total_anomalies += anomalies.length;
      }

      processed_window.push(entry);
    }

    // ── Checkpoint: update AgentObservabilityState ─────────────────────────
    const last_entry_id = entries[entries.length - 1].id;

    await prisma.agentObservabilityState.update({
      where: { analyst_id },
      data: {
        last_scanned_entry_id:  last_entry_id,
        total_entries_scanned:  { increment: entries.length },
        total_anomalies_raised: { increment: total_anomalies },
        rolling_means:          (latest_means ?? {}) as object,
        last_worker_run_at:     new Date(),
      },
    });

    console.log(
      `[BackgroundWorker] Done — analyst: ${analyst_id} | ` +
      `entries: ${entries.length} | anomalies: ${total_anomalies}`
    );

  } catch (err) {
    // Never propagate — background worker must not fail the request
    console.error(`[BackgroundWorker] Error scanning ${analyst_id}:`, err);
  }
}

// ─── Read helpers (for Observatory — future Plane D) ──────────────────────────

export async function getPendingAnomalies({
  analyst_id,
  limit = 50,
}: {
  analyst_id?: string;
  limit?:      number;
}) {
  return prisma.anomalyEvent.findMany({
    where: {
      requires_review: true,
      resolved_at:     null,
      ...(analyst_id ? { analyst_id } : {}),
    },
    include: {
      timeline_entry: {
        select: {
          id:         true,
          ticker:     true,
          dim_scores: true,
          drift_norm: true,
          created_at: true,
        },
      },
    },
    orderBy: [
      { severity:   "desc" },
      { created_at: "desc" },
    ],
    take: limit,
  });
}

export async function getObservabilityState(analyst_id: string) {
  return prisma.agentObservabilityState.findUnique({
    where: { analyst_id },
  });
}

export async function resolveAnomaly({
  anomaly_id,
  resolved_by,
}: {
  anomaly_id:  string;
  resolved_by: string;
}) {
  return prisma.anomalyEvent.update({
    where: { id: anomaly_id },
    data: {
      resolved_at: new Date(),
      resolved_by,
    },
  });
}
