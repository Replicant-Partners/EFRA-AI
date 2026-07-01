import { runScout } from "@/src/agents/01-scout/index";
import { runIntel } from "@/src/agents/02-intel/index";
import { runCriticalFactor } from "@/src/agents/03-critical-factor/index";
import { runForensic } from "@/src/agents/04-forensic/index";
import { runValuation } from "@/src/agents/05-valuation/index";
import { runKata } from "@/src/agents/08-kata/index";
import { runCommunication } from "@/src/agents/06-communication/index";
import { runLens } from "@/src/agents/09-lens/index";
import { runCompany } from "@/src/agents/13-company/index";
import { runGorilla } from "@/src/agents/10-gorilla/index";
import { runImagine } from "@/src/agents/11-imagine/index";
import { runThesis } from "@/src/agents/12-thesis/index";
import type { CompanyBoard, GorillaInput } from "@/src/shared/types";
import { buildLLM } from "@/src/configurator";
import type { ILanguageModel, ChatParams } from "@/src/core/ports/ILanguageModel";
import type { PipelineState, ScoutInput } from "@/src/shared/types";

// ─── Analyst Context LLM wrapper ─────────────────────────────────────────────
// Wraps any ILanguageModel and prepends analyst notes to every user message.
// This is how analyst corrections written at approval time reach the agents.

function buildAnalystContextBlock(notes: Record<string, string>, current_agent: string): string {
  const relevant = Object.entries(notes);
  if (relevant.length === 0) return "";

  const lines = relevant.map(([agent, note]) =>
    `  [After ${agent.toUpperCase()}]: ${note}`
  ).join("\n");

  return `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANALYST CONTEXT (notes written by the analyst during pipeline review):
${lines}

These notes represent the analyst's corrections, additions, and opinions
on prior agent outputs. Treat them as authoritative analyst judgment —
they have higher weight than any assumption you would make independently.
If a note corrects or contradicts a prior agent's output, defer to the note.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

class AnalystContextLLM implements ILanguageModel {
  constructor(
    private readonly base: ILanguageModel,
    private readonly context_block: string,
  ) {}

  async chat(params: ChatParams): Promise<string> {
    if (!this.context_block) return this.base.chat(params);
    return this.base.chat({
      ...params,
      user: params.user + this.context_block,
    });
  }

  async *chatStream(params: ChatParams): AsyncGenerator<string, string> {
    if (!this.context_block) return yield* this.base.chatStream(params);
    return yield* this.base.chatStream({
      ...params,
      user: params.user + this.context_block,
    });
  }
}

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
      // Safe helpers so undefined never reaches the log lines
      const n  = (v: unknown, max?: number) => v != null ? (max ? `${v}/${max}` : `${v}`) : "?";
      const pct = (v: unknown, d = 0) => v != null ? `${(Number(v) * 100).toFixed(d)}%` : "?";

      try {
        const baseLLM = buildLLM();
        const analyst_notes = (state as PipelineState & { analyst_notes?: Record<string, string> }).analyst_notes ?? {};
        const context_block = buildAnalystContextBlock(analyst_notes, agent);
        const llm: ILanguageModel = context_block
          ? new AnalystContextLLM(baseLLM, context_block)
          : baseLLM;
        const idea_id = state.idea_id ?? `idea_${Date.now()}`;

        // ── 01 SCOUT ──────────────────────────────────────────────────────
        if (agent === "scout") {
          log(`Evaluating ${ticker} — scoring alpha across 4 dimensions…`);

          // Stream dimension work-in-progress logs while the LLM runs
          let abortWaiting = false;
          (async () => {
            const steps = [
              { delay: 2500, msg: `Dim 1/4 · Coverage gap — querying analyst density…` },
              { delay: 3500, msg: `Dim 2/4 · Market cap fit — sizing ${ticker} to universe…` },
              { delay: 3500, msg: `Dim 3/4 · Sector relevance — mapping exposure…` },
              { delay: 4000, msg: `Dim 4/4 · Valuation anomaly — screening multiples…` },
            ];
            for (const { delay, msg } of steps) {
              await pause(delay);
              if (abortWaiting) break;
              log(msg);
            }
          })();

          const scoutInput: ScoutInput = {
            ticker,
            analyst_id,
            catalyst,
            idea_source_tag: `web_${mode}`,
          };
          const result = await runScout(llm, scoutInput);
          abortWaiting = true;

          const a = result?.alpha_score;
          if (a) {
            log(`─────────────────────`);
            await pause(80);  log(`Coverage gap:       ${n(a.coverage_gap_score, 25)}`);
            await pause(60);  log(`Market cap fit:     ${n(a.market_cap_fit, 20)}`);
            await pause(60);  log(`Sector relevance:   ${n(a.sector_relevance, 25)}`);
            await pause(60);  log(`Valuation anomaly:  ${n(a.valuation_anomaly, 30)}`);
            if ((a.gunn_bonus ?? 0) > 0) {
              await pause(60);
              log(`Gunn bonus:         +${a.gunn_bonus}${a.bessembinder_bonus ? " (Bessembinder)" : ""}${a.em_gdp_bonus ? " (EM GDP)" : ""}${a.low_coverage_bonus ? " (Low Coverage)" : ""}`);
            }
            await pause(60);  log(`Total alpha score:  ${n(a.total, 100)}`);
          }
          if (result?.decision) {
            await pause(60);  log(`Decision:           ${result.decision} — ${result.horizon_tag ?? "?"} horizon`);
          }
          if (result?.score_reasoning?.coverage_gap_rationale) {
            await pause(60);
            log(`Coverage rationale: ${result.score_reasoning.coverage_gap_rationale}`);
          }
          if (result?.decision_rationale) {
            await pause(60);
            log(`Decision rationale: ${result.decision_rationale}`);
          }

          send({ type: "done", result });

        // ── 02 INTEL ──────────────────────────────────────────────────────
        } else if (agent === "intel") {
          const cnt = (news ?? []).length;
          log(`Analyzing business + processing ${cnt} news item${cnt !== 1 ? "s" : ""}…`);

          const scout = state.scout;
          const result = await runIntel(
            llm,
            {
              idea_id,
              ticker,
              horizon_tag:     scout?.horizon_tag     ?? "SHORT",
              downstream_mode: scout?.downstream_mode ?? (mode as "valentine" | "gunn" | "dual"),
            },
            news ?? []
          );

          // ── Business context ──────────────────────────────────────────
          const bc = result?.business_context;
          if (bc) {
            await pause(80);
            log(`─────────────────────`);
            log(`Business analysis:`);
            // executive_summary — wrap at 80 chars
            if (bc.executive_summary) {
              await pause(40);
              const words = bc.executive_summary.split(" ");
              let line = "";
              for (const word of words) {
                if ((line + " " + word).trim().length > 80) {
                  await pause(15); log(`  ${line.trim()}`);
                  line = word;
                } else {
                  line = (line + " " + word).trim();
                }
              }
              if (line) { await pause(15); log(`  ${line}`); }
            }
            await pause(60); log(`Moat:         ${bc.moat_type ?? "?"} — ${bc.moat_evidence ?? "?"}`);
            await pause(40); log(`Growth:       ${bc.growth_trend ?? "?"}`);
            await pause(40); log(`Catalyst:     ${bc.catalyst_assessment ?? "?"}`);
            await pause(60);
            log(`─────────────────────`);
          }

          // ── News mosaic ───────────────────────────────────────────────
          await pause(60);  log(`Surfaced:     ${n(result?.surfaced_count)} relevant / ${n(result?.suppressed_count)} suppressed`);
          await pause(60);  log(`Mosaic:       ${result?.mosaic_clear ? "CLEAR — no MNPI concern" : "HALT — possible MNPI concern flagged"}`);
          await pause(60);  log(`Mgmt comms:   score ${n(result?.mgmt_comm_score)}`);
          await pause(60);  log(`Hypotheses:   ${result?.hypotheses?.length ?? 0} investment hypotheses generated`);

          if (result?.news_items?.length) {
            const newsApi  = result.news_items.filter(i => (i.source ?? "news_api") === "news_api");
            const edgarSec = result.news_items.filter(i => i.source === "edgar_sec");
            const crm      = result.news_items.filter(i => i.source === "crm");

            if (newsApi.length) {
              await pause(60);
              log(`News API (${newsApi.length}):`);
              for (const item of newsApi.slice(0, 3)) {
                await pause(40);
                log(`  [${item.score ?? "?"}] ${item.headline ?? "—"}`);
                if (item.summary) { await pause(20); log(`       → ${item.summary}`); }
              }
            }
            if (edgarSec.length) {
              await pause(60);
              log(`EDGAR / SEC (${edgarSec.length}):`);
              for (const item of edgarSec.slice(0, 3)) {
                await pause(40);
                log(`  [${item.score ?? "?"}] ${item.headline ?? "—"}`);
                if (item.summary) { await pause(20); log(`       → ${item.summary}`); }
              }
            }
            if (crm.length) {
              await pause(60);
              log(`CRM signals (${crm.length}):`);
              for (const item of crm.slice(0, 2)) {
                await pause(40);
                log(`  [${item.score ?? "?"}] ${item.headline ?? "—"}`);
                if (item.summary) { await pause(20); log(`       → ${item.summary}`); }
              }
            }
          }

          if (result?.analyst_briefing) {
            await pause(80);
            log(`─────────────────────`);
            log(`Analyst briefing:`);
            // wrap at ~80 chars so it reads cleanly in the monospace log
            const words = result.analyst_briefing.split(" ");
            let line = "";
            for (const word of words) {
              if ((line + " " + word).trim().length > 80) {
                await pause(20); log(`  ${line.trim()}`);
                line = word;
              } else {
                line = (line + " " + word).trim();
              }
            }
            if (line) { await pause(20); log(`  ${line}`); }
          }

          send({ type: "done", result });

        // ── 04 FORENSIC PRE-SCREEN ────────────────────────────────────────
        } else if (agent === "forensic_pre") {
          log(`Pre-screening ${ticker} — checking 10-K filings, going concern, SEC actions…`);

          const result = await runForensic(llm, { idea_id, ticker, run_mode: "PRE-SCREEN" });
          const flags = result?.flags ?? [];

          await pause(80);  log(`Risk score:    ${n(result?.risk_score, 100)}`);
          await pause(60);  log(`Mgmt trust:    ${n(result?.mgmt_trust_score, 100)}`);
          await pause(60);  log(`Recommendation: ${result?.recommendation ?? "?"}`);
          if (flags.length === 0) {
            await pause(60);
            log(`Flags:         none detected`);
          } else {
            await pause(60);
            log(`Flags:         ${flags.length} identified:`);
            for (const f of flags) {
              await pause(40);
              log(`  SEV-${f.severity ?? "?"}: ${f.description ?? "—"} (−${f.eps_haircut_pct != null ? (f.eps_haircut_pct * 100).toFixed(0) : "?"}% eps)`);
            }
          }
          await pause(60);  log(`EPS haircut:   ${(result?.eps_haircut_total ?? 0).toFixed(0)}%`);

          send({ type: "done", result });

        // ── 03 CRITICAL FACTOR ────────────────────────────────────────────
        } else if (agent === "cf") {
          log(`Identifying critical factors — building probability-weighted scenarios…`);

          const scout = state.scout;
          const result = await runCriticalFactor(
            llm,
            state.intel!,
            state.forensic!,
            scout?.downstream_mode ?? (mode as "valentine" | "gunn" | "dual"),
            scout?.horizon_tag     ?? "SHORT"
          );

          const factors  = result?.factors  ?? [];
          const scenarios = result?.scenarios ?? [];

          await pause(80);
          log(`Critical factors: ${factors.length} identified:`);
          for (const f of factors.slice(0, 4)) {
            await pause(50);
            log(`  ${f.description ?? "—"} (+${f.eps_impact_pct ?? "?"}% EPS impact)`);
          }

          await pause(80);
          log(`Scenarios:`);
          for (const s of scenarios) {
            await pause(50);
            log(`  ${(s.type ?? "?").padEnd(5)}: $${s.implied_pt ?? "?"}  (${s.probability != null ? (s.probability * 100).toFixed(0) : "?"}% probability)`);
            if (s.price_derivation) { await pause(30); log(`         math:     ${s.price_derivation}`); }
            if (s.triggers)         { await pause(30); log(`         triggers: ${s.triggers}`); }
          }

          if (result?.expected_value_pt != null) {
            await pause(60);
            const evFormula = scenarios
              .map(s => `${(s.probability * 100).toFixed(0)}% × $${s.implied_pt}`)
              .join(" + ");
            log(`EV formula:  ${evFormula} = $${result.expected_value_pt}`);
          }

          if (result?.build_to_last_score) {
            const b = result.build_to_last_score;
            await pause(60);
            log(`Build-to-Last:  Management ${n(b.management)} · TAM ${n(b.tam)} · Moat ${n(b.moat)} · Total ${n(b.total)}`);
          }

          send({ type: "done", result });

        // ── 04 FORENSIC FULL ──────────────────────────────────────────────
        } else if (agent === "forensic") {
          log(`Full forensic scan — accruals, DSO, auditor quality, insider activity, governance…`);

          const result = await runForensic(llm, { idea_id, ticker, run_mode: "FULL" });
          const flags = result?.flags ?? [];

          await pause(80);  log(`Risk score:    ${n(result?.risk_score, 100)}`);
          await pause(60);  log(`Mgmt trust:    ${n(result?.mgmt_trust_score, 100)}`);
          await pause(60);  log(`Recommendation: ${result?.recommendation ?? "?"}`);
          if (flags.length === 0) {
            await pause(60);
            log(`Flags:         none detected`);
          } else {
            await pause(60);
            log(`Flags:         ${flags.length} identified:`);
            for (const f of flags) {
              await pause(40);
              log(`  SEV-${f.severity ?? "?"}: ${f.description ?? "—"} (−${f.eps_haircut_pct != null ? (f.eps_haircut_pct * 100).toFixed(0) : "?"}% eps)`);
            }
          }
          await pause(60);  log(`Total EPS haircut: ${(result?.eps_haircut_total ?? 0).toFixed(0)}%  |  DR add: ${result?.dr_add_bps_total ?? 0}bps`);

          // ── Management profile ────────────────────────────────────────
          const mp = result?.management_profile;
          if (mp) {
            await pause(80);
            log(`─────────────────────`);
            log(`Management analysis:`);
            await pause(40); log(`Founder:     ${mp.founder_profile}`);
            await pause(40); log(`CEO:         ${mp.ceo_profile}`);
            await pause(40); log(`Team:        ${mp.team_stability}`);
            await pause(40); log(`Incentives:  ${mp.incentive_alignment}`);
            await pause(40); log(`Decisions:   ${mp.key_decisions}`);
            await pause(80);
            log(`─────────────────────`);
            log(`Management summary:`);
            const words = mp.management_summary.split(" ");
            let line = "";
            for (const word of words) {
              if ((line + " " + word).trim().length > 80) {
                await pause(15); log(`  ${line.trim()}`);
                line = word;
              } else {
                line = (line + " " + word).trim();
              }
            }
            if (line) { await pause(15); log(`  ${line}`); }
          }

          send({ type: "done", result });

        // ── 05 VALUATION ──────────────────────────────────────────────────
        } else if (agent === "valuation") {
          log(`Running sector-weighted DCF and multiples — applying forensic adjustments…`);

          const scout = state.scout;
          const cf    = state.cf;
          const result = await runValuation(llm, {
            ticker,
            forensic_profile:    state.forensic!,
            cf_scenarios:        cf?.scenarios        ?? [],
            intel_bundle:        state.intel!,
            build_to_last_score: cf?.build_to_last_score,
            downstream_mode:     scout?.downstream_mode ?? (mode as "valentine" | "gunn" | "dual"),
          });

          // ── Core outputs ──────────────────────────────────────────────
          await pause(80);  log(`Price target (12M): $${result?.pt_12m ?? "?"}`);
          if (result?.pt_5y) {
            await pause(60);
            log(`Price target (5Y):  $${result.pt_5y}`);
          }
          await pause(60);  log(`Rating:             ${result?.rating ?? "?"}`);
          await pause(60);  log(`R/R ratio:          ${result?.rr_ratio != null ? result.rr_ratio.toFixed(1) : "?"}:1`);
          const f = result?.faves_score;
          if (f) {
            await pause(60);
            log(`FaVeS score:        ${n(f.total, 9)}  (Frequency ${n(f.frequency)} · Visibility ${n(f.visibility)} · Significance ${n(f.significance)})`);
          }
          if (result?.ic_premium) {
            await pause(60);
            log(`IC premium:         ${result.ic_premium}`);
          }

          // ── 8-step analysis ───────────────────────────────────────────
          if (result?.current_multiples) {
            await pause(80);
            log(`─────────────────────`);
            log(`Current multiples:`);
            await pause(40); log(`  ${result.current_multiples}`);
          }
          if (result?.market_assumptions) {
            await pause(80);
            log(`─────────────────────`);
            log(`Market assumptions:`);
            const words = result.market_assumptions.split(" ");
            let line = "";
            for (const word of words) {
              if ((line + " " + word).trim().length > 80) {
                await pause(15); log(`  ${line.trim()}`);
                line = word;
              } else {
                line = (line + " " + word).trim();
              }
            }
            if (line) { await pause(15); log(`  ${line}`); }
          }
          if (result?.peer_comparison) {
            await pause(80);
            log(`─────────────────────`);
            log(`Peer comparison:`);
            await pause(40); log(`  ${result.peer_comparison}`);
          }
          if (result?.margin_of_safety) {
            await pause(80);
            log(`─────────────────────`);
            log(`Margin of safety:`);
            await pause(40); log(`  ${result.margin_of_safety}`);
          }
          if (result?.valuation_summary) {
            await pause(80);
            log(`─────────────────────`);
            log(`Valuation summary:`);
            const words = result.valuation_summary.split(" ");
            let line = "";
            for (const word of words) {
              if ((line + " " + word).trim().length > 80) {
                await pause(15); log(`  ${line.trim()}`);
                line = word;
              } else {
                line = (line + " " + word).trim();
              }
            }
            if (line) { await pause(15); log(`  ${line}`); }
          }

          send({ type: "done", result });

        // ── 08 COMMUNICATION ──────────────────────────────────────────────
        } else if (agent === "communication") {
          log(`Evaluating ENTER gate — drafting CASCADE research note…`);

          const scout = state.scout;
          const result = await runCommunication(llm, {
            valuation_model:  state.valuation!,
            forensic_profile: state.forensic!,
            cf_output:        state.cf!,
            intel_bundle:     state.intel!,
            downstream_mode:  scout?.downstream_mode ?? (mode as "valentine" | "gunn" | "dual"),
          });

          const g = result?.enter_gate;
          if (g) {
            await pause(80);  log(`ENTER gate score: ${n(g.effective_score, 5)}`);
            await pause(60);  log(`  E Edge:      ${g.edge        ? "✓ pass" : "✗ fail"}`);
            await pause(40);  log(`  N New:       ${g.new_catalyst ? "✓ pass" : "✗ fail"}`);
            await pause(40);  log(`  T Timely:    ${g.timely      ? "✓ pass" : "✗ fail"}`);
            await pause(40);  log(`  E Examples:  ${g.examples    ? "✓ pass" : "✗ fail"}`);
            await pause(40);  log(`  R Revealing: ${g.revealing   ? "✓ pass" : "✗ fail"}`);
          }
          await pause(60);  log(`Publication:      ${result?.publication_possible ? result.output_type : "DROP — gate below threshold"}`);
          await pause(60);  log(`Final confidence: ${pct(result?.audit_trail?.final_confidence, 0)}`);

          send({ type: "done", result });

        // ── 07 KATA ───────────────────────────────────────────────────────
        } else if (agent === "kata") {
          log(`Applying Toyota Improvement Kata — analyzing research process…`);

          const scout = state.scout;
          const result = await runKata(llm, {
            ticker,
            downstream_mode: scout?.downstream_mode ?? (mode as "valentine" | "gunn" | "dual"),
            scout:           state.scout!,
            intel:           state.intel!,
            forensic:        state.forensic!,
            cf:              state.cf!,
            valuation:       state.valuation!,
            communication:   state.communication,   // optional — may not exist yet
          });

          await pause(80);
          log(`Process confidence: ${result?.process_confidence != null ? (result.process_confidence * 100).toFixed(0) : "?"}%`);
          await pause(60);
          log(`Knowledge gaps:     ${result?.knowledge_gaps?.length ?? 0} identified`);
          await pause(60);
          log(`Assumption risks:   ${result?.assumption_risks?.length ?? 0} identified`);
          await pause(60);
          log(`Obstacles:          ${result?.obstacles?.length ?? 0} mapped`);
          await pause(60);
          log(`Target horizon:     ${result?.target_horizon ?? "?"}`);
          await pause(60);
          log(`Next review:        ${result?.next_review_date ?? "?"}`);

          const active = result?.obstacles?.find(o => o.addressing_now);
          if (active) {
            await pause(60);
            log(`─────────────────────`);
            log(`Addressing now:     ${active.description}`);
            log(`Next step:          ${active.next_step}`);
          }

          send({ type: "done", result });

        // ── 09 LENS ───────────────────────────────────────────────────────
        } else if (agent === "lens") {
          log(`Auditing research consistency against firm's investment frameworks…`);

          const scout = state.scout;
          const result = await runLens(llm, {
            ticker,
            downstream_mode: scout?.downstream_mode ?? (mode as "valentine" | "gunn" | "dual"),
            scout:           state.scout!,
            intel:           state.intel!,
            forensic:        state.forensic!,
            cf:              state.cf!,
            valuation:       state.valuation!,
            communication:   state.communication,
            kata:            state.kata,
          });

          await pause(80);
          log(`─────────────────────`);
          log(`Overall verdict:     ${result?.overall_verdict ?? "?"}`);
          await pause(60);
          log(`The Loop:            ${result?.loop?.score ?? "?"}/100 · domain: ${result?.loop?.domain ?? "?"}`);
          await pause(60);
          log(`Superforecasting:    ${result?.superforecasting?.score ?? "?"}/100`);
          await pause(60);
          log(`Dunning-Kruger:      ${result?.dunning_kruger?.flag ?? "?"} risk`);
          await pause(60);
          log(`Hidden Champions:    ${result?.hidden_champion?.fit ?? "?"} fit`);
          await pause(60);
          log(`Kauffman:            ${result?.kauffman?.complement_or_substitute ?? "?"} · ergodic: ${result?.kauffman?.ergodic_assumption}`);
          if ((result?.key_tensions ?? []).length > 0) {
            await pause(80);
            log(`─────────────────────`);
            log(`Key tensions:`);
            for (const t of result.key_tensions) {
              await pause(40);
              log(`  · ${t}`);
            }
          }
          if ((result?.recommendations ?? []).length > 0) {
            await pause(80);
            log(`Recommendations:`);
            for (const r of result.recommendations) {
              await pause(40);
              log(`  · ${r}`);
            }
          }

          send({ type: "done", result, final: true });

        // ── 13 COMPANY ─────────────────────────────────────────────────────────────────
        } else if (agent === "company") {
          log(`Running deep company analysis for ${ticker}…`);
          log(`Part 1: Self-view · Part 2: Franchise · Part 3: Management…`);

          const result = await runCompany(llm, {
            ticker,
            company_name: undefined,
            analyst_note: (state as { analyst_notes?: Record<string, string> }).analyst_notes?.["company"],
          });

          log(`─────────────────────`);
          log(`Moat:        ${result?.franchise?.moat_source ?? "?"} — ${result?.franchise?.moat_depth ?? "?"} (${result?.franchise?.moat_durability ?? "?"})`);
          log(`Trust score: ${result?.owner_operator?.mgmt_trust_score ?? "?"}/100`);
          log(`Thesis:      ${result?.thesis_statement?.thesis_quality ?? "?"}`);
          log(`CEO verdict: ${result?.owner_operator?.ceo_scorecard?.verdict ?? "?"}`);
          if (result?.gorilla_elevator?.elevator_pitch) {
            log(`─────────────────────`);
            log(`Gorilla pitch: ${result.gorilla_elevator.elevator_pitch}`);
          }

          send({ type: "done", result });

        // ── 10 GORILLA ─────────────────────────────────────────────────────────────────
        } else if (agent === "gorilla") {
          log(`Applying Value Gorilla Framework — scoring 4 dimensions…`);
          log(`Obvious Problem · Invisible Gorilla · Combinatorial · Choke Point`);

          const company = state.company as CompanyBoard | undefined;
          const gorillaInput: GorillaInput = {
            ticker,
            company_name: company?.franchise?.identity,
            analyst_id,
            business_summary:   company?.franchise?.executive_summary ?? "",
            economic_domain:    company?.franchise?.identity          ?? "",
            geographic_exposure: company?.franchise?.geography        ?? "",
            moat_type:          company?.franchise?.moat_source       ?? "",
            moat_evidence:      company?.franchise?.moat_evidence     ?? "",
            key_metrics: [
              company?.financials?.signposts?.revenue_cagr_3y,
              company?.financials?.signposts?.gross_margin_latest,
              company?.financials?.signposts?.roic,
            ].filter(Boolean).join("; "),
            management_notes:   company?.owner_operator?.trust_rationale ?? "",
            main_thesis:        company?.thesis_statement?.thesis         ?? "",
            catalyst:           company?.franchise?.catalyst_assessment   ?? "",
            bull_triggers:      company?.gorilla_elevator?.why_likely_to_succeed ?? "",
            base_narrative:     company?.business_memo                    ?? "",
            bear_risk:          (company?.thesis_statement?.key_risks ?? []).join("; "),
            invalidation:       company?.thesis_statement?.key_risks?.[0] ?? "",
            news_headlines:     company?.analyst_questions                 ?? [],
          };

          const result = await runGorilla(llm, gorillaInput);

          log(`─────────────────────`);
          log(`Verdict:      ${result?.gorilla_verdict ?? "?"}`);
          log(`Total score:  ${result?.gorilla_total ?? "?"}/100`);
          log(`  Obvious:    ${result?.obvious_problem?.score ?? "?"}/100 (25%)`);
          log(`  Invisible:  ${result?.invisible_gorilla?.score ?? "?"}/100 (30%)`);
          log(`  Combin.:    ${result?.combinatorial?.score ?? "?"}/100 (25%)`);
          log(`  Choke pt:   ${result?.choke_point?.score ?? "?"}/100 (20%)`);

          send({ type: "done", result });

        // ── 11 IMAGINE ─────────────────────────────────────────────────────────────────
        } else if (agent === "imagine") {
          log(`Projecting ${ticker} at 5Y · 10Y · 20Y horizons…`);
          log(`Digital stage · Growth driver · Falsifiable predictions`);

          const company = state.company as CompanyBoard | undefined;
          const imagineInput: GorillaInput = {
            ticker,
            company_name: company?.franchise?.identity,
            analyst_id,
            business_summary:    company?.franchise?.executive_summary ?? "",
            economic_domain:     company?.franchise?.identity          ?? "",
            geographic_exposure: company?.franchise?.geography         ?? "",
            moat_type:           company?.franchise?.moat_source       ?? "",
            moat_evidence:       company?.franchise?.moat_evidence     ?? "",
            key_metrics: [
              company?.financials?.signposts?.revenue_cagr_3y,
              company?.financials?.signposts?.gross_margin_latest,
              company?.financials?.signposts?.roic,
            ].filter(Boolean).join("; "),
            management_notes:   company?.owner_operator?.trust_rationale          ?? "",
            main_thesis:        company?.thesis_statement?.thesis                  ?? "",
            catalyst:           company?.franchise?.catalyst_assessment            ?? "",
            bull_triggers:      company?.gorilla_elevator?.why_likely_to_succeed   ?? "",
            base_narrative:     company?.business_memo                             ?? "",
            bear_risk:          (company?.thesis_statement?.key_risks ?? []).join("; "),
            invalidation:       company?.thesis_statement?.key_risks?.[0]          ?? "",
            news_headlines:     company?.analyst_questions                          ?? [],
          };

          const result = await runImagine(llm, imagineInput);

          log(`─────────────────────`);
          log(`Digital stage:  ${result?.digital_stage ?? "?"}`);
          log(`Growth driver:  ${result?.growth_driver ?? "?"}`);
          log(`Confidence:     ${result?.imagination_confidence != null ? (result.imagination_confidence * 100).toFixed(0) : "?"}%`);
          log(`Scenarios:      ${result?.scenarios?.length ?? 0} horizons`);
          log(`Predictions:    ${result?.predictions?.length ?? 0} falsifiable`);

          send({ type: "done", result });

        // ── 12 THESIS ────────────────────────────────────────────────────────────────
        } else if (agent === "thesis") {
          log(`Synthesizing investment thesis — three pillars…`);
          log(`Business Franchise · Management Quality · Valuation Gap`);

          const company = state.company as CompanyBoard | undefined;
          const thesisInput: GorillaInput = {
            ticker,
            company_name: company?.franchise?.identity,
            analyst_id,
            business_summary:    company?.franchise?.executive_summary ?? "",
            economic_domain:     company?.franchise?.identity          ?? "",
            geographic_exposure: company?.franchise?.geography         ?? "",
            moat_type:           company?.franchise?.moat_source       ?? "",
            moat_evidence:       company?.franchise?.moat_evidence     ?? "",
            key_metrics: [
              company?.financials?.signposts?.revenue_cagr_3y,
              company?.financials?.signposts?.gross_margin_latest,
              company?.financials?.signposts?.roic,
            ].filter(Boolean).join("; "),
            management_notes:   company?.owner_operator?.trust_rationale         ?? "",
            main_thesis:        company?.thesis_statement?.thesis                 ?? "",
            catalyst:           company?.franchise?.catalyst_assessment           ?? "",
            bull_triggers:      company?.gorilla_elevator?.why_likely_to_succeed  ?? "",
            base_narrative:     company?.business_memo                            ?? "",
            bear_risk:          (company?.thesis_statement?.key_risks ?? []).join("; "),
            invalidation:       company?.thesis_statement?.key_risks?.[0]         ?? "",
            news_headlines:     company?.analyst_questions                         ?? [],
          };

          const result = await runThesis(llm, thesisInput);

          log(`─────────────────────`);
          log(`Thesis quality:  ${result?.thesis_quality ?? "?"}`);
          log(`Moat strength:   ${result?.business_franchise?.moat_strength ?? "?"}`);
          log(`Durability:      ${result?.business_franchise?.durability ?? "?"}`);
          log(`Capital alloc.:  ${result?.management_quality?.capital_allocation_verdict ?? "?"}`);

          send({ type: "done", result, final: true });
        }

      } catch (err) {
        const raw = String(err);
        // Surface a clean, actionable message instead of raw TypeError
        const isNetwork = raw.includes("network") || raw.includes("fetch") || raw.includes("ECONNRESET") || raw.includes("ETIMEDOUT");
        const message = isNetwork
          ? `OpenRouter connection failed after retries (agent: ${agent}). This is usually a transient issue — click Approve & Continue to retry this step.`
          : raw;
        send({ type: "error", error: message });
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
