import { runScout } from "@/src/agents/01-scout/index";
import { runIntel } from "@/src/agents/02-intel/index";
import { runCriticalFactor } from "@/src/agents/03-critical-factor/index";
import { runForensic } from "@/src/agents/04-forensic/index";
import { runValuation } from "@/src/agents/05-valuation/index";
import { runCommunication } from "@/src/agents/06-communication/index";
import type { PipelineState, ScoutInput } from "@/src/shared/types";

export const maxDuration = 300;

export async function POST(request: Request) {
  const body = await request.json();
  const { agent, ticker, analyst_id, catalyst, mode, news, state } = body as {
    agent: string;
    ticker: string;
    analyst_id: string;
    catalyst: string;
    mode: "valentine" | "gunn" | "dual";
    news: string[];
    state: Partial<PipelineState> & { idea_id?: string };
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const log = (msg: string) => send({ type: "log", msg });
      const pause = (ms: number) => new Promise(r => setTimeout(r, ms));

      try {
        const idea_id = state.idea_id ?? `idea_${Date.now()}`;

        // ── 01 SCOUT ──────────────────────────────────────────────────────
        if (agent === "scout") {
          log(`Evaluating ${ticker} — scoring alpha across 4 dimensions…`);

          const scoutInput: ScoutInput = {
            ticker,
            analyst_id,
            catalyst,
            idea_source_tag: `web_${mode}`,
          };
          const result = await runScout(scoutInput);

          const a = result.alpha_score;
          await pause(80);  log(`Coverage gap:       ${a.coverage_gap_score}/25`);
          await pause(60);  log(`Market cap fit:     ${a.market_cap_fit}/20`);
          await pause(60);  log(`Sector relevance:   ${a.sector_relevance}/25`);
          await pause(60);  log(`Valuation anomaly:  ${a.valuation_anomaly}/30`);
          if (a.gunn_bonus > 0) {
            await pause(60);
            log(`Gunn bonus:         +${a.gunn_bonus}${a.bessembinder_bonus ? " (Bessembinder)" : ""}${a.em_gdp_bonus ? " (EM GDP)" : ""}${a.low_coverage_bonus ? " (Low Coverage)" : ""}`);
          }
          await pause(60);  log(`Total alpha score:  ${a.total}/100`);
          await pause(60);  log(`Decision:           ${result.decision} — ${result.horizon_tag} horizon`);
          if (result.score_reasoning?.coverage_gap_rationale) {
            await pause(60);
            log(`Coverage rationale: ${result.score_reasoning.coverage_gap_rationale}`);
          }
          if (result.decision_rationale) {
            await pause(60);
            log(`Decision rationale: ${result.decision_rationale}`);
          }

          send({ type: "done", result });

        // ── 02 INTEL ──────────────────────────────────────────────────────
        } else if (agent === "intel") {
          const n = (news ?? []).length;
          log(`Processing ${n} news item${n !== 1 ? "s" : ""} — building mosaic…`);

          const result = await runIntel(
            {
              idea_id,
              ticker,
              horizon_tag: state.scout!.horizon_tag,
              downstream_mode: state.scout!.downstream_mode,
            },
            news ?? []
          );

          await pause(80);  log(`Surfaced:     ${result.surfaced_count} relevant / ${result.suppressed_count} suppressed`);
          await pause(60);  log(`Mosaic:       ${result.mosaic_clear ? "CLEAR — no MNPI concern" : "HALT — possible MNPI concern flagged"}`);
          await pause(60);  log(`Mgmt comms:   score ${result.mgmt_comm_score}`);
          await pause(60);  log(`Hypotheses:   ${result.hypotheses?.length ?? 0} investment hypotheses generated`);

          if (result.news_items?.length) {
            await pause(60);
            log(`Top news items:`);
            for (const item of result.news_items.slice(0, 3)) {
              await pause(40);
              log(`  [${item.score}] ${item.headline}`);
            }
          }

          send({ type: "done", result });

        // ── 04 FORENSIC PRE-SCREEN ────────────────────────────────────────
        } else if (agent === "forensic_pre") {
          log(`Pre-screening ${ticker} — checking 10-K filings, going concern, SEC actions…`);

          const result = await runForensic({ idea_id, ticker, run_mode: "PRE-SCREEN" });
          const flags = result.flags ?? [];

          await pause(80);  log(`Risk score:    ${result.risk_score}/100`);
          await pause(60);  log(`Mgmt trust:    ${result.mgmt_trust_score}/100`);
          await pause(60);  log(`Recommendation: ${result.recommendation}`);
          if (flags.length === 0) {
            await pause(60);
            log(`Flags:         none detected`);
          } else {
            await pause(60);
            log(`Flags:         ${flags.length} identified:`);
            for (const f of flags) {
              await pause(40);
              log(`  SEV-${f.severity}: ${f.description} (−${(f.eps_haircut_pct * 100).toFixed(0)}% eps)`);
            }
          }
          await pause(60);  log(`EPS haircut:   ${(result.eps_haircut_total ?? 0).toFixed(0)}%`);

          send({ type: "done", result });

        // ── 03 CRITICAL FACTOR ────────────────────────────────────────────
        } else if (agent === "cf") {
          log(`Identifying critical factors — building probability-weighted scenarios…`);

          const result = await runCriticalFactor(
            state.intel!,
            state.forensic!,
            state.scout!.downstream_mode,
            state.scout!.horizon_tag
          );

          const factors = result.factors ?? [];
          const scenarios = result.scenarios ?? [];

          await pause(80);
          log(`Critical factors: ${factors.length} identified:`);
          for (const f of factors.slice(0, 4)) {
            await pause(50);
            log(`  ${f.description} (+${f.eps_impact_pct}% EPS impact)`);
          }

          await pause(80);
          log(`Scenarios:`);
          for (const s of scenarios) {
            await pause(50);
            log(`  ${s.type.padEnd(5)}: $${s.implied_pt}  (${(s.probability * 100).toFixed(0)}% probability)`);
          }

          await pause(60);
          log(`Expected value: $${result.expected_value_pt}`);

          if (result.build_to_last_score) {
            const b = result.build_to_last_score;
            await pause(60);
            log(`Build-to-Last:  Management ${b.management} · TAM ${b.tam} · Moat ${b.moat} · Total ${b.total}`);
          }

          send({ type: "done", result });

        // ── 04 FORENSIC FULL ──────────────────────────────────────────────
        } else if (agent === "forensic") {
          log(`Full forensic scan — accruals, DSO, auditor quality, insider activity, governance…`);

          const result = await runForensic({ idea_id, ticker, run_mode: "FULL" });
          const flags = result.flags ?? [];

          await pause(80);  log(`Risk score:    ${result.risk_score}/100`);
          await pause(60);  log(`Mgmt trust:    ${result.mgmt_trust_score}/100`);
          await pause(60);  log(`Recommendation: ${result.recommendation}`);
          if (flags.length === 0) {
            await pause(60);
            log(`Flags:         none detected`);
          } else {
            await pause(60);
            log(`Flags:         ${flags.length} identified:`);
            for (const f of flags) {
              await pause(40);
              log(`  SEV-${f.severity}: ${f.description} (−${(f.eps_haircut_pct * 100).toFixed(0)}% eps)`);
            }
          }
          await pause(60);  log(`Total EPS haircut: ${(result.eps_haircut_total ?? 0).toFixed(0)}%  |  DR add: ${result.dr_add_bps_total ?? 0}bps`);

          send({ type: "done", result });

        // ── 05 VALUATION ──────────────────────────────────────────────────
        } else if (agent === "valuation") {
          log(`Running sector-weighted DCF and multiples — applying forensic adjustments…`);

          const result = await runValuation({
            forensic_profile: state.forensic!,
            cf_scenarios: state.cf!.scenarios,
            intel_bundle: state.intel!,
            build_to_last_score: state.cf!.build_to_last_score,
            downstream_mode: state.scout!.downstream_mode,
          });

          await pause(80);  log(`Price target (12M): $${result.pt_12m}`);
          if (result.pt_5y) {
            await pause(60);
            log(`Price target (5Y):  $${result.pt_5y}`);
          }
          await pause(60);  log(`Rating:             ${result.rating}`);
          await pause(60);  log(`R/R ratio:          ${(result.rr_ratio ?? 0).toFixed(1)}:1`);
          const f = result.faves_score;
          if (f) {
            await pause(60);
            log(`FaVeS score:        ${f.total}/9  (Frequency ${f.frequency} · Visibility ${f.visibility} · Significance ${f.significance})`);
          }
          if (result.ic_premium) {
            await pause(60);
            log(`IC premium:         ${result.ic_premium}`);
          }

          send({ type: "done", result });

        // ── 06 COMMUNICATION ──────────────────────────────────────────────
        } else if (agent === "communication") {
          log(`Evaluating ENTER gate — drafting CASCADE research note…`);

          const result = await runCommunication({
            valuation_model: state.valuation!,
            forensic_profile: state.forensic!,
            cf_output: state.cf!,
            intel_bundle: state.intel!,
            downstream_mode: state.scout!.downstream_mode,
          });

          const g = result.enter_gate;
          await pause(80);  log(`ENTER gate score: ${g.effective_score}/5`);
          await pause(60);  log(`  E Edge:      ${g.edge        ? "✓ pass" : "✗ fail"}`);
          await pause(40);  log(`  N New:       ${g.new_catalyst ? "✓ pass" : "✗ fail"}`);
          await pause(40);  log(`  T Timely:    ${g.timely      ? "✓ pass" : "✗ fail"}`);
          await pause(40);  log(`  E Examples:  ${g.examples    ? "✓ pass" : "✗ fail"}`);
          await pause(40);  log(`  R Revealing: ${g.revealing   ? "✓ pass" : "✗ fail"}`);
          await pause(60);  log(`Publication:      ${result.publication_possible ? result.output_type : "DROP — gate below threshold"}`);
          await pause(60);  log(`Final confidence: ${((result.audit_trail?.final_confidence ?? 0) * 100).toFixed(0)}%`);

          send({ type: "done", result, final: true });
        }

      } catch (err) {
        send({ type: "error", error: String(err) });
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
