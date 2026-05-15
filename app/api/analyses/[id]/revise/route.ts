/**
 * POST /api/analyses/[id]/revise
 *
 * Re-runs the pipeline from a chosen agent forward, with an analyst correction
 * note injected into every subsequent agent's context.
 *
 * The existing analysis state is used as the starting point — agents that ran
 * BEFORE the chosen start agent keep their original outputs. Only the chosen
 * agent and everything after it re-run.
 *
 * The revised analysis is saved as a NEW record in the Library with:
 *   - status: "COMPLETED"
 *   - catalyst: original catalyst + " [REVISED: <note excerpt>]"
 *   - analyst_notes: { [start_agent]: correction_note }
 *   - full_state: the merged state (original agents + re-run agents)
 *
 * Streaming: uses the same SSE format as /api/agent so the frontend can
 * show live logs from the re-run.
 *
 * Request body:
 *   start_agent: AgentKey   — which agent to start from (and re-run everything after)
 *   note:        string     — the analyst's correction / revised thesis
 *   analyst_id?: string     — override analyst_id (defaults to original)
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { buildLLM } from "@/src/configurator";
import { buildReportContent } from "@/src/lib/report-builder";
import { runScout } from "@/src/agents/01-scout/index";
import { runIntel } from "@/src/agents/02-intel/index";
import { runCriticalFactor } from "@/src/agents/03-critical-factor/index";
import { runForensic } from "@/src/agents/04-forensic/index";
import { runValuation } from "@/src/agents/05-valuation/index";
import { runKata } from "@/src/agents/08-kata/index";
import { runCommunication } from "@/src/agents/06-communication/index";
import { runLens } from "@/src/agents/09-lens/index";
import type { ILanguageModel, ChatParams } from "@/src/core/ports/ILanguageModel";
import type { PipelineState } from "@/src/shared/types";

export const maxDuration = 300;

// ─── Agent order (matches pipeline execution order) ───────────────────────────

type AgentKey = "scout" | "intel" | "forensic_pre" | "cf" | "forensic" | "valuation" | "kata" | "communication" | "lens";

const AGENT_ORDER: AgentKey[] = [
  "scout", "intel", "forensic_pre", "cf", "forensic",
  "valuation", "kata", "communication", "lens",
];

const AGENT_LABELS: Record<AgentKey, string> = {
  scout:         "01 · SCOUT",
  intel:         "02 · INTEL",
  forensic_pre:  "03 · FORENSIC (pre)",
  cf:            "04 · CRITICAL FACTOR",
  forensic:      "05 · FORENSIC (full)",
  valuation:     "06 · VALUATION",
  kata:          "07 · KATA",
  communication: "08 · COMMUNICATION",
  lens:          "09 · LENS",
};

// ─── Context-injecting LLM wrapper (same pattern as /api/agent) ──────────────

class AnalystContextLLM implements ILanguageModel {
  constructor(private base: ILanguageModel, private context: string) {}
  async chat(p: ChatParams) {
    return this.base.chat({ ...p, user: p.user + this.context });
  }
  async *chatStream(p: ChatParams) {
    return yield* this.base.chatStream({ ...p, user: p.user + this.context });
  }
}

function buildContext(note: string, start_agent: string): string {
  return `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANALYST REVISION NOTE (written after reviewing the original analysis):
  ${note}

This note represents the analyst's correction of the prior analysis.
It overrides any assumption you would make independently.
If it contradicts a prior agent's output, defer to this note.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as {
    start_agent: AgentKey;
    note:        string;
    analyst_id?: string;
  };
  const { start_agent, note } = body;

  if (!note?.trim()) {
    return NextResponse.json({ error: "note is required" }, { status: 400 });
  }
  if (!AGENT_ORDER.includes(start_agent)) {
    return NextResponse.json({ error: "invalid start_agent" }, { status: 400 });
  }

  // Load original analysis
  const original = await prisma.analysis.findUnique({ where: { id } });
  if (!original) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  const orig_state  = original.full_state as unknown as PipelineState;
  const analyst_id  = body.analyst_id ?? original.analyst_id;
  const ticker      = original.ticker;
  const mode        = (orig_state.scout?.downstream_mode ?? original.mode) as "valentine" | "gunn" | "dual";

  const encoder    = new TextEncoder();
  const context    = buildContext(note.trim(), start_agent);
  const llm        = new AnalystContextLLM(buildLLM(), context);

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      const log = (msg: string) => send({ type: "log", msg });

      try {
        // Start from the original state, will be mutated as agents run
        const state: Partial<PipelineState> & { analyst_notes?: Record<string, string> } = {
          ...orig_state,
          analyst_notes: { [start_agent]: note.trim() },
        };

        const start_idx = AGENT_ORDER.indexOf(start_agent);

        send({ type: "log", msg: `Re-running pipeline from ${AGENT_LABELS[start_agent]}…` });
        send({ type: "log", msg: `Correction: "${note.trim().slice(0, 120)}${note.length > 120 ? "…" : ""}"` });

        // ── Re-run agents from start_idx forward ─────────────────────────
        for (let i = start_idx; i < AGENT_ORDER.length; i++) {
          const agent = AGENT_ORDER[i];
          send({ type: "agent_start", agent, label: AGENT_LABELS[agent] });
          log(`Running ${AGENT_LABELS[agent]}…`);

          try {
            if (agent === "scout") {
              const result = await runScout(llm, {
                ticker,
                analyst_id,
                catalyst:        original.catalyst,
                idea_source_tag: `revised_${mode}`,
              });
              state.scout = result;
              send({ type: "agent_done", agent, result });

            } else if (agent === "intel") {
              const result = await runIntel(llm, {
                idea_id:         state.idea_id ?? `idea_${Date.now()}`,
                ticker,
                horizon_tag:     state.scout?.horizon_tag     ?? "SHORT",
                downstream_mode: state.scout?.downstream_mode ?? mode,
              }, []);
              state.intel = result;
              send({ type: "agent_done", agent, result });

            } else if (agent === "forensic_pre") {
              const result = await runForensic(llm, {
                idea_id:  state.idea_id ?? `idea_${Date.now()}`,
                ticker,
                run_mode: "PRE-SCREEN",
              });
              state.forensic = result;
              send({ type: "agent_done", agent, result });

            } else if (agent === "cf") {
              const result = await runCriticalFactor(
                llm,
                state.intel!,
                state.forensic!,
                state.scout?.downstream_mode ?? mode,
                state.scout?.horizon_tag     ?? "SHORT",
              );
              state.cf = result;
              send({ type: "agent_done", agent, result });

            } else if (agent === "forensic") {
              const result = await runForensic(llm, {
                idea_id:  state.idea_id ?? `idea_${Date.now()}`,
                ticker,
                run_mode: "FULL",
              });
              state.forensic = result;
              send({ type: "agent_done", agent, result });

            } else if (agent === "valuation") {
              const result = await runValuation(llm, {
                ticker,
                forensic_profile:    state.forensic!,
                cf_scenarios:        state.cf?.scenarios        ?? [],
                intel_bundle:        state.intel!,
                build_to_last_score: state.cf?.build_to_last_score,
                downstream_mode:     state.scout?.downstream_mode ?? mode,
              });
              state.valuation = result;
              send({ type: "agent_done", agent, result });

            } else if (agent === "kata") {
              const result = await runKata(llm, {
                ticker,
                downstream_mode: state.scout?.downstream_mode ?? mode,
                scout:           state.scout!,
                intel:           state.intel!,
                forensic:        state.forensic!,
                cf:              state.cf!,
                valuation:       state.valuation!,
                communication:   state.communication,
              });
              state.kata = result;
              send({ type: "agent_done", agent, result });

            } else if (agent === "communication") {
              const result = await runCommunication(llm, {
                valuation_model:  state.valuation!,
                forensic_profile: state.forensic!,
                cf_output:        state.cf!,
                intel_bundle:     state.intel!,
                downstream_mode:  state.scout?.downstream_mode ?? mode,
              });
              state.communication = result;
              send({ type: "agent_done", agent, result });

            } else if (agent === "lens") {
              const result = await runLens(llm, {
                ticker,
                downstream_mode: state.scout?.downstream_mode ?? mode,
                scout:           state.scout!,
                intel:           state.intel!,
                forensic:        state.forensic!,
                cf:              state.cf!,
                valuation:       state.valuation!,
                communication:   state.communication,
                kata:            state.kata,
              });
              state.lens = result;
              send({ type: "agent_done", agent, result });
            }

            log(`${AGENT_LABELS[agent]} complete`);
          } catch (err) {
            log(`${AGENT_LABELS[agent]} failed: ${String(err)}`);
            // Continue — non-fatal agents (kata, lens) can fail
            if (agent === "kata" || agent === "lens") continue;
            throw err;
          }
        }

        // ── Save revised analysis ────────────────────────────────────────
        log("Saving revised analysis to Library…");

        const final_state: PipelineState = {
          ticker,
          status:  "COMPLETED",
          idea_id: state.idea_id ?? `idea_${Date.now()}`,
          ...state,
        } as PipelineState;

        const report_content = buildReportContent(final_state);
        const note_excerpt = note.trim().slice(0, 60) + (note.length > 60 ? "…" : "");

        const saved = await prisma.analysis.create({
          data: {
            ticker:         ticker.toUpperCase(),
            analyst_id,
            catalyst:       `${original.catalyst} [REVISED from ${AGENT_LABELS[start_agent]}: ${note_excerpt}]`,
            mode:           original.mode,
            status:         "COMPLETED",
            full_state:     final_state as object,
            report_content: report_content as object,
            rating:         final_state.valuation?.rating      ?? null,
            pt_12m:         final_state.valuation?.pt_12m      ?? null,
            sector:         final_state.intel?.business_context?.moat_type ?? null,
          },
          select: { id: true },
        });

        log(`Saved — new analysis ID: ${saved.id}`);
        send({ type: "done", new_analysis_id: saved.id, state: final_state });

      } catch (err) {
        send({ type: "error", error: String(err) });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
    },
  });
}
