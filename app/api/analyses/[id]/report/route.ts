import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { buildReportContent } from "@/src/lib/report-builder";
import { runCommunication } from "@/src/agents/06-communication/index.js";
import type { PipelineState, ReportContent } from "@/src/shared/types";

export const maxDuration = 60;

// GET — return report_content, generating it if missing (backfill for old analyses)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const analysis = await prisma.analysis.findUnique({
      where:  { id },
      select: { full_state: true, report_content: true },
    });

    if (!analysis) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (analysis.report_content) {
      return NextResponse.json(analysis.report_content);
    }

    // Backfill: generate on demand for analyses saved before this feature
    const state = analysis.full_state as unknown as PipelineState;
    const report = buildReportContent(state);
    await prisma.analysis.update({
      where: { id },
      data:  { report_content: report as object },
    });
    return NextResponse.json(report);
  } catch (err) {
    console.error("[GET /api/analyses/[id]/report]", err);
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 });
  }
}

// PATCH — three actions: update_section | update_scenarios | regenerate_cascade
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as {
      action:       "update_section" | "update_scenarios" | "regenerate_cascade";
      section_key?: string;
      content?:     string;
      scenarios?:   ReportContent["scenarios"];
    };

    const analysis = await prisma.analysis.findUnique({
      where:  { id },
      select: { full_state: true, report_content: true },
    });

    if (!analysis) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const report = analysis.report_content as unknown as ReportContent;
    const now = new Date().toISOString();

    // ── update a single section's text ──────────────────────────────────────
    if (body.action === "update_section") {
      const updatedSections = report.sections.map((s) =>
        s.key === body.section_key
          ? { ...s, content: body.content ?? s.content, updated_at: now }
          : s
      );
      await prisma.analysis.update({
        where: { id },
        data:  { report_content: { ...report, sections: updatedSections } as object },
      });
      return NextResponse.json({ ok: true });
    }

    // ── replace scenarios array ──────────────────────────────────────────────
    if (body.action === "update_scenarios") {
      await prisma.analysis.update({
        where: { id },
        data:  { report_content: { ...report, scenarios: body.scenarios ?? report.scenarios } as object },
      });
      return NextResponse.json({ ok: true });
    }

    // ── re-run communication agent with updated scenarios ────────────────────
    if (body.action === "regenerate_cascade") {
      const state = analysis.full_state as unknown as PipelineState;

      if (!state.valuation || !state.forensic || !state.cf || !state.intel || !state.scout) {
        return NextResponse.json({ error: "Incomplete pipeline state for re-run" }, { status: 400 });
      }

      // Inject analyst-edited scenarios into the pipeline state
      const modifiedCf = { ...state.cf, scenarios: report.scenarios };

      const commResult = await runCommunication({
        valuation_model:  state.valuation,
        forensic_profile: state.forensic,
        cf_output:        modifiedCf,
        intel_bundle:     state.intel,
        downstream_mode:  state.scout.downstream_mode,
      });

      const updatedReport: ReportContent = {
        ...report,
        cascade_text:       commResult.content ?? "",
        cascade_updated_at: now,
      };

      await prisma.analysis.update({
        where: { id },
        data:  { report_content: updatedReport as object },
      });

      return NextResponse.json({ cascade_text: commResult.content ?? "" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[PATCH /api/analyses/[id]/report]", err);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}
