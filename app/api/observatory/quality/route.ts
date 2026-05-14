/**
 * GET /api/observatory/quality
 *
 * Returns Plane C (Longitudinal Observer) data for the Observatory UI:
 *   - timeline:   last 50 TimelineEntry rows per analyst (newest-first)
 *   - anomalies:  pending AnomalyEvent rows requiring review
 *   - trends:     per-analyst TrendReport (window = last 20 entries)
 *   - state:      AgentObservabilityState per analyst
 *
 * Optional query params:
 *   analyst_id  — filter by analyst
 *   ticker      — filter by ticker
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { computeTrendReport, type RollingMeans } from "@/src/lib/drift-monitor";
import type { TimelineEntryRecord } from "@/src/lib/timeline-writer";

// ─── Types (exported so page.tsx can import them) ─────────────────────────────

export interface QualityTimelineRow {
  id:               string;
  analysis_id:      string;
  analyst_id:       string;
  ticker:           string;
  overall:          number;
  argument_quality: number;
  scenario_coherence:      number;
  probability_calibration: number;
  drift_norm:       number;
  anomaly_flags:    string[];
  created_at:       string;
}

export interface QualityAnomaly {
  id:               string;
  analyst_id:       string;
  ticker:           string;
  kind:             string;
  severity:         string;
  requires_review:  boolean;
  resolved_at:      string | null;
  payload:          Record<string, unknown>;
  timeline_entry:   {
    dim_scores:   Record<string, number>;
    drift_norm:   number;
    created_at:   string;
  } | null;
  created_at:       string;
}

export interface QualityTrend {
  analyst_id:      string;
  window_size:     number;
  period_start:    string;
  period_end:      string;
  means: {
    overall:                 number;
    argument_quality:        number;
    scenario_coherence:      number;
    probability_calibration: number;
  };
  trend_direction: Record<string, string>;
  best_dimension:  string;
  worst_dimension: string;
  anomaly_rate:    number;
}

export interface QualityObsState {
  analyst_id:             string;
  total_entries_scanned:  number;
  total_anomalies_raised: number;
  total_analyses:         number;
  rolling_means:          Record<string, number>;
  last_worker_run_at:     string | null;
}

export interface QualityData {
  timeline:    QualityTimelineRow[];
  anomalies:   QualityAnomaly[];
  trends:      QualityTrend[];
  obs_states:  QualityObsState[];
  generated_at:string;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const analyst_id = searchParams.get("analyst_id") ?? undefined;
    const ticker     = searchParams.get("ticker")?.toUpperCase() ?? undefined;

    // ── Timeline entries (last 50, newest-first) ───────────────────────────
    const raw_entries = await prisma.timelineEntry.findMany({
      where: {
        ...(analyst_id ? { analyst_id } : {}),
        ...(ticker     ? { ticker }     : {}),
      },
      orderBy: { created_at: "desc" },
      take:    50,
    });

    const timeline: QualityTimelineRow[] = raw_entries.map(e => {
      const ds = e.dim_scores as Record<string, number>;
      return {
        id:                      e.id,
        analysis_id:             e.analysis_id,
        analyst_id:              e.analyst_id,
        ticker:                  e.ticker,
        overall:                 ds.overall                 ?? 0,
        argument_quality:        ds.argument_quality        ?? 0,
        scenario_coherence:      ds.scenario_coherence      ?? 0,
        probability_calibration: ds.probability_calibration ?? 0,
        drift_norm:              e.drift_norm,
        anomaly_flags:           e.anomaly_flags,
        created_at:              e.created_at.toISOString(),
      };
    });

    // ── Pending anomalies (requires_review = true, not resolved) ──────────
    const raw_anomalies = await prisma.anomalyEvent.findMany({
      where: {
        ...(analyst_id ? { analyst_id } : {}),
        ...(ticker     ? { ticker }     : {}),
      },
      include: {
        timeline_entry: {
          select: { dim_scores: true, drift_norm: true, created_at: true },
        },
      },
      orderBy: [
        { severity:   "desc" },
        { created_at: "desc" },
      ],
      take: 100,
    });

    const anomalies: QualityAnomaly[] = raw_anomalies.map(a => ({
      id:              a.id,
      analyst_id:      a.analyst_id,
      ticker:          a.ticker,
      kind:            a.kind,
      severity:        a.severity,
      requires_review: a.requires_review,
      resolved_at:     a.resolved_at?.toISOString() ?? null,
      payload:         a.payload as Record<string, unknown>,
      timeline_entry:  a.timeline_entry ? {
        dim_scores:  a.timeline_entry.dim_scores as Record<string, number>,
        drift_norm:  a.timeline_entry.drift_norm,
        created_at:  a.timeline_entry.created_at.toISOString(),
      } : null,
      created_at:      a.created_at.toISOString(),
    }));

    // ── Trend reports (per analyst, window = last 20 entries) ─────────────
    const analyst_ids = analyst_id
      ? [analyst_id]
      : Array.from(new Set(raw_entries.map(e => e.analyst_id)));

    const trends: QualityTrend[] = [];
    for (const aid of analyst_ids) {
      const analyst_entries = await prisma.timelineEntry.findMany({
        where:   { analyst_id: aid },
        orderBy: { created_at: "desc" },
        take:    20,
      });

      if (analyst_entries.length === 0) continue;

      const mapped: TimelineEntryRecord[] = analyst_entries.map(e => ({
        id:               e.id,
        analysis_id:      e.analysis_id,
        eval_run_id:      e.eval_run_id,
        analyst_id:       e.analyst_id,
        ticker:           e.ticker,
        dim_scores:       e.dim_scores as unknown as TimelineEntryRecord["dim_scores"],
        drift_norm:       e.drift_norm,
        anomaly_flags:    e.anomaly_flags,
        pipeline_version: e.pipeline_version,
        worker_processed: e.worker_processed,
        created_at:       e.created_at,
      }));

      const report = computeTrendReport({ analyst_id: aid, entries: mapped });
      if (!report) continue;

      trends.push({
        analyst_id:      report.analyst_id,
        window_size:     report.window_size,
        period_start:    report.period_start.toISOString(),
        period_end:      report.period_end.toISOString(),
        means: {
          overall:                 report.means.overall,
          argument_quality:        report.means.argument_quality,
          scenario_coherence:      report.means.scenario_coherence,
          probability_calibration: report.means.probability_calibration,
        },
        trend_direction: report.trend_direction,
        best_dimension:  report.best_dimension,
        worst_dimension: report.worst_dimension,
        anomaly_rate:    report.anomaly_rate,
      });
    }

    // ── Observability states ───────────────────────────────────────────────
    const raw_states = await prisma.agentObservabilityState.findMany({
      where: analyst_id ? { analyst_id } : {},
      orderBy: { updated_at: "desc" },
    });

    const obs_states: QualityObsState[] = raw_states.map(s => ({
      analyst_id:             s.analyst_id,
      total_entries_scanned:  s.total_entries_scanned,
      total_anomalies_raised: s.total_anomalies_raised,
      total_analyses:         s.total_analyses,
      rolling_means:          s.rolling_means as Record<string, number>,
      last_worker_run_at:     s.last_worker_run_at?.toISOString() ?? null,
    }));

    const data: QualityData = {
      timeline,
      anomalies,
      trends,
      obs_states,
      generated_at: new Date().toISOString(),
    };

    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/observatory/quality]", err);
    return NextResponse.json({ error: "Failed to compute quality data" }, { status: 500 });
  }
}

// ─── PATCH /api/observatory/quality — resolve an anomaly ─────────────────────

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { anomaly_id?: string; resolved_by?: string };
    const { anomaly_id, resolved_by } = body;

    if (!anomaly_id) {
      return NextResponse.json({ error: "anomaly_id is required" }, { status: 400 });
    }

    await prisma.anomalyEvent.update({
      where: { id: anomaly_id },
      data: {
        resolved_at: new Date(),
        resolved_by: resolved_by ?? "observatory_ui",
      },
    });

    return NextResponse.json({ ok: true, anomaly_id });
  } catch (err) {
    console.error("[PATCH /api/observatory/quality]", err);
    return NextResponse.json({ error: "Failed to resolve anomaly" }, { status: 500 });
  }
}
