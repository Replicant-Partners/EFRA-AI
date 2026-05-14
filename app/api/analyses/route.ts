import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import type { PipelineState } from "@/src/shared/types";
import { buildReportContent } from "@/src/lib/report-builder";
import { writeEpisode, type Provenance } from "@/src/lib/episode-store";
import { runEvaluatorRegistry } from "@/src/lib/evaluator-registry";
import { writeTimelineEntry } from "@/src/lib/timeline-writer";
import { scanAnalyst } from "@/src/lib/background-worker";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      ticker:     string;
      analyst_id: string;
      catalyst:   string;
      mode:       string;
      state:      PipelineState;
    };

    const { ticker, analyst_id, catalyst, mode, state } = body;

    const rating  = state.valuation?.rating  ?? null;
    const pt_12m  = state.valuation?.pt_12m  ?? null;
    const sector  = state.intel?.business_context?.moat_type ?? null;

    const report_content = buildReportContent(state);

    const analysis = await prisma.analysis.create({
      data: {
        ticker:         ticker.toUpperCase(),
        analyst_id,
        catalyst,
        mode,
        status:         state.status,
        full_state:     state as object,
        report_content: report_content as object,
        rating,
        pt_12m,
        sector,
      },
    });

    // ── Write episodes for every agent that ran ───────────────────────────
    // We do this after saving so we have the analysis_id.
    // Provenance is determined by pipeline outcome:
    //   - COMPLETED → all agents = "auto_pass" (analyst approved each step)
    //   - DROPPED / COMPLIANCE_HALT → terminal agent = "auto_drop"
    // In a future step, we will upgrade provenance to "human_approved" or
    // "human_corrected" when the analyst adds notes during approval.
    void writeEpisodesFromState({
      analysis_id: analysis.id,
      analyst_id,
      ticker:      ticker.toUpperCase(),
      state,
    });

    // ── Run Evaluator Registry (Plane B) + Longitudinal Observer (Plane C) ──
    // Non-blocking pipeline: EvalRegistry → TimelineWriter → BackgroundWorker
    // Each step is chained but never fails the analysis save.
    void (async () => {
      try {
        // Plane B — Evaluator Registry
        const registry_outcome = await runEvaluatorRegistry({
          analysis_id: analysis.id,
          analyst_id,
          ticker:      ticker.toUpperCase(),
          state,
        });

        if (!registry_outcome) return; // skipped (non-COMPLETED status)

        // Plane C — Timeline Writer (inline hot-path write)
        await writeTimelineEntry({
          analysis_id:      analysis.id,
          analyst_id,
          ticker:           ticker.toUpperCase(),
          registry_outcome,
        });

        // Plane C — Background Worker (async two-pass scan, non-blocking)
        void scanAnalyst(analyst_id).catch(err => {
          console.warn("[BackgroundWorker] Scan failed:", err);
        });

      } catch (err) {
        console.warn("[ObservabilityPipeline] Failed:", err);
      }
    })();

    return NextResponse.json({ id: analysis.id }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/analyses]", err);
    return NextResponse.json({ error: "Failed to save analysis" }, { status: 500 });
  }
}

// ─── Episode emission ─────────────────────────────────────────────────────────
// Called non-blocking (void) after analysis is saved.
// Iterates over every agent output in the state and writes one Episode per agent.

async function writeEpisodesFromState({
  analysis_id,
  analyst_id,
  ticker,
  state,
}: {
  analysis_id: string;
  analyst_id:  string;
  ticker:      string;
  state:       PipelineState;
}) {
  const isDropped = state.status === "DROPPED" || state.status === "COMPLIANCE_HALT";

  const agentMap: Array<{
    key:    string;
    result: object | undefined;
    isFinal?: boolean;
  }> = [
    { key: "scout",         result: state.scout         as object | undefined },
    { key: "intel",         result: state.intel         as object | undefined },
    { key: "forensic_pre",  result: state.forensic      as object | undefined },
    { key: "cf",            result: state.cf            as object | undefined },
    { key: "forensic",      result: state.forensic      as object | undefined },
    { key: "valuation",     result: state.valuation     as object | undefined },
    { key: "kata",          result: state.kata          as object | undefined },
    { key: "communication", result: state.communication as object | undefined },
    { key: "lens",          result: state.lens          as object | undefined, isFinal: true },
  ];

  for (const { key, result, isFinal } of agentMap) {
    if (!result) continue;

    // The last agent before a drop gets auto_drop provenance
    const isLastBeforeDrop = isDropped && isFinal;
    const provenance: Provenance = isLastBeforeDrop ? "auto_drop" : "auto_pass";

    // Build concise query summary
    const queryParts: string[] = [`ticker:${ticker}`, `agent:${key}`];
    if (state.scout)    queryParts.push(`alpha:${state.scout.alpha_score.total}`);
    if (state.forensic) queryParts.push(`risk:${state.forensic.risk_score}`);
    if (state.valuation)queryParts.push(`pt:${state.valuation.pt_12m}`, `rating:${state.valuation.rating}`);

    try {
      await writeEpisode({
        analysis_id,
        analyst_id,
        ticker,
        agent:      key,
        query:      queryParts.join(" | "),
        response:   result,
        provenance,
        // Denormalized scores
        alpha_score:        key === "scout"         ? (state.scout?.alpha_score.total)          : undefined,
        risk_score:         (key === "forensic_pre" || key === "forensic") ? (state.forensic?.risk_score) : undefined,
        confidence:         key === "scout"         ? (state.scout?.confidence)                 :
                            key === "communication" ? (state.communication?.audit_trail?.final_confidence) :
                            key === "kata"          ? (state.kata?.process_confidence)          : undefined,
        rr_ratio:           key === "valuation"     ? (state.valuation?.rr_ratio)               : undefined,
        enter_score:        key === "communication" ? (state.communication?.enter_gate?.effective_score) : undefined,
        process_confidence: key === "kata"          ? (state.kata?.process_confidence)          : undefined,
        lens_verdict:       key === "lens"          ? (state.lens?.overall_verdict)             : undefined,
        loop_score:         key === "lens"          ? (state.lens?.loop?.score)                 : undefined,
        dk_flag:            key === "lens"          ? (state.lens?.dunning_kruger?.flag)        : undefined,
      });
    } catch (err) {
      console.warn(`[EpisodeStore] Failed to write episode for ${key}:`, err);
    }
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get("ticker") ?? undefined;
    const rating = searchParams.get("rating") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const limit  = Math.min(Number(searchParams.get("limit")  ?? "30"), 100);
    const offset = Number(searchParams.get("offset") ?? "0");

    const where: Record<string, unknown> = {};
    if (ticker) where.ticker = ticker.toUpperCase();
    if (rating) where.rating = rating;
    if (status) where.status = status;

    const [analyses, total] = await prisma.$transaction([
      prisma.analysis.findMany({
        where,
        select: {
          id:         true,
          ticker:     true,
          analyst_id: true,
          catalyst:   true,
          mode:       true,
          status:     true,
          rating:     true,
          pt_12m:     true,
          sector:     true,
          created_at: true,
          _count:     { select: { intel_items: true } },
        },
        orderBy: { created_at: "desc" },
        take:    limit,
        skip:    offset,
      }),
      prisma.analysis.count({ where }),
    ]);

    return NextResponse.json({ analyses, total, limit, offset });
  } catch (err) {
    console.error("[GET /api/analyses]", err);
    return NextResponse.json({ error: "Failed to fetch analyses" }, { status: 500 });
  }
}
