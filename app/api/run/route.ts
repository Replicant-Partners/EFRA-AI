import { runScout } from "@/src/agents/01-scout/index";
import { runIntel } from "@/src/agents/02-intel/index";
import { runCriticalFactor } from "@/src/agents/03-critical-factor/index";
import { runForensic } from "@/src/agents/04-forensic/index";
import { runValuation } from "@/src/agents/05-valuation/index";
import { runCommunication } from "@/src/agents/06-communication/index";
import type { PipelineState, ScoutInput } from "@/src/shared/types";

export const maxDuration = 300; // 5 minutes — Railway/Vercel limit

export async function POST(request: Request) {
  const body = await request.json();
  const { ticker, analyst_id, catalyst, mode, news } = body as {
    ticker: string;
    analyst_id: string;
    catalyst: string;
    mode: "valentine" | "gunn" | "dual";
    news: string[];
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      const idea_id = `idea_${Date.now()}`;
      const state: PipelineState = {
        idea_id,
        ticker,
        status: "RUNNING",
      };

      const scoutInput: ScoutInput = {
        ticker,
        analyst_id,
        catalyst,
        idea_source_tag: `web_${mode}`,
      };

      try {
        // ── 01 SCOUT ────────────────────────────────────
        send({ agent: "scout", status: "running" });
        state.scout = await runScout(scoutInput);
        send({ agent: "scout", status: "done", result: state.scout });

        if (state.scout.decision === "DROP") {
          state.status = "DROPPED";
          send({
            agent: "pipeline",
            status: "dropped",
            reason: "scout_drop",
            result: state,
            final: true,
          });
          controller.close();
          return;
        }

        // ── 02 INTEL ────────────────────────────────────
        send({ agent: "intel", status: "running" });
        state.intel = await runIntel(
          {
            idea_id,
            ticker,
            horizon_tag: state.scout.horizon_tag,
            downstream_mode: state.scout.downstream_mode,
          },
          news
        );
        send({ agent: "intel", status: "done", result: state.intel });

        if (!state.intel.mosaic_clear) {
          state.status = "COMPLIANCE_HALT";
          send({
            agent: "pipeline",
            status: "halted",
            reason: "mnpi_detected",
            result: state,
            final: true,
          });
          controller.close();
          return;
        }

        // ── 04 FORENSIC PRE-SCREEN ───────────────────────
        send({ agent: "forensic_pre", status: "running" });
        state.forensic = await runForensic({ idea_id, ticker, run_mode: "PRE-SCREEN" });
        send({ agent: "forensic_pre", status: "done", result: state.forensic });

        if (state.forensic.recommendation === "BLOCK") {
          state.status = "DROPPED";
          send({
            agent: "pipeline",
            status: "dropped",
            reason: "forensic_block",
            result: state,
            final: true,
          });
          controller.close();
          return;
        }

        // ── 03 CRITICAL FACTOR ──────────────────────────
        send({ agent: "cf", status: "running" });
        state.cf = await runCriticalFactor(
          state.intel,
          state.forensic,
          state.scout.downstream_mode,
          state.scout.horizon_tag
        );
        send({ agent: "cf", status: "done", result: state.cf });

        // ── 04 FORENSIC FULL ────────────────────────────
        // Full scan enriches flags/haircuts for Valuation — does NOT block
        // (blocking was already decided at PRE-SCREEN)
        send({ agent: "forensic", status: "running" });
        state.forensic = await runForensic({ idea_id, ticker, run_mode: "FULL" });
        send({ agent: "forensic", status: "done", result: state.forensic });

        // ── 05 VALUATION ────────────────────────────────
        send({ agent: "valuation", status: "running" });
        state.valuation = await runValuation({
          forensic_profile: state.forensic,
          cf_scenarios: state.cf.scenarios,
          intel_bundle: state.intel,
          build_to_last_score: state.cf.build_to_last_score,
          downstream_mode: state.scout.downstream_mode,
        });
        send({ agent: "valuation", status: "done", result: state.valuation });

        // ── 06 COMMUNICATION ────────────────────────────
        send({ agent: "communication", status: "running" });
        state.communication = await runCommunication({
          valuation_model: state.valuation,
          forensic_profile: state.forensic,
          cf_output: state.cf,
          intel_bundle: state.intel,
          downstream_mode: state.scout.downstream_mode,
        });
        send({ agent: "communication", status: "done", result: state.communication });

        // Always COMPLETED if pipeline ran to the end — Communication's
        // publication_possible is shown in the UI output, not used as a hard drop
        state.status = "COMPLETED";

        send({
          agent: "pipeline",
          status: state.status === "COMPLETED" ? "done" : "dropped",
          result: state,
          final: true,
        });
      } catch (err) {
        send({
          agent: "pipeline",
          status: "error",
          error: String(err),
          result: state,
          final: true,
        });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
