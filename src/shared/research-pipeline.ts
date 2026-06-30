import { runGorilla } from "../agents/10-gorilla/index.js";
import { runImagine } from "../agents/11-imagine/index.js";
import { runThesis } from "../agents/12-thesis/index.js";
import { runCompany } from "../agents/13-company/index.js";
import type { ILanguageModel } from "../core/ports/ILanguageModel.js";
import type {
  GorillaBoard,
  ImagineBoard,
  ThesisBoard,
  CompanyBoard,
  GorillaInput,
  ImagineInput,
  ThesisInput,
  CompanyInput,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Research Pipeline State
// ─────────────────────────────────────────────────────────────────────────────

export interface ResearchPipelineState {
  id: string;
  ticker: string;
  company_name?: string;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  started_at: string;
  completed_at?: string;

  // Agent outputs
  company?: CompanyBoard;
  gorilla?: GorillaBoard;
  imagine?: ImagineBoard;
  thesis?: ThesisBoard;

  // Error tracking
  error?: string;
  failed_agent?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline Input
// ─────────────────────────────────────────────────────────────────────────────

export interface ResearchPipelineInput {
  ticker: string;
  company_name?: string;
  analyst_note?: string;
  analyst_id?: string;
  edgar_facts?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Event types for streaming
// ─────────────────────────────────────────────────────────────────────────────

export type ResearchPipelineEvent =
  | { type: "log"; msg: string }
  | { type: "agent_start"; agent: string; step: number }
  | { type: "agent_done"; agent: string; step: number }
  | { type: "sources"; sources: { title: string; url: string }[] }
  | { type: "done"; result: ResearchPipelineState }
  | { type: "error"; error: string };

// ─────────────────────────────────────────────────────────────────────────────
// Research Pipeline (Agents 10-13)
// ─────────────────────────────────────────────────────────────────────────────
//
// Flow:
//   COMPANY (13) → GORILLA (10) → IMAGINE (11) → THESIS (12)
//
// Each agent builds on the previous:
//   - COMPANY: Deep company analysis (franchise, management, financials)
//   - GORILLA: Value Gorilla assessment using company analysis
//   - IMAGINE: Long-range imagination using gorilla + company context
//   - THESIS: Final investment thesis synthesizing all prior work
//
// ─────────────────────────────────────────────────────────────────────────────

export async function* runResearchPipeline(
  llm: ILanguageModel,
  input: ResearchPipelineInput,
): AsyncGenerator<ResearchPipelineEvent, ResearchPipelineState> {
  const id = `research_${Date.now()}`;
  const ticker = input.ticker.toUpperCase().trim();

  const state: ResearchPipelineState = {
    id,
    ticker,
    company_name: input.company_name,
    status: "RUNNING",
    started_at: new Date().toISOString(),
  };

  yield { type: "log", msg: `═══════════════════════════════════════════════════════` };
  yield { type: "log", msg: `RESEARCH PIPELINE — ${ticker} — ${id}` };
  yield { type: "log", msg: `═══════════════════════════════════════════════════════` };

  try {
    // ── Agent 13: COMPANY ─────────────────────────────────────────────────────
    yield { type: "agent_start", agent: "COMPANY", step: 1 };
    yield { type: "log", msg: `[1/4] COMPANY — Deep company analysis…` };

    const companyInput: CompanyInput = {
      ticker,
      company_name: input.company_name,
      analyst_note: input.analyst_note,
      edgar_facts: input.edgar_facts,
    };

    state.company = await runCompany(llm, companyInput);
    yield { type: "agent_done", agent: "COMPANY", step: 1 };
    yield { type: "log", msg: `      Moat: ${state.company.franchise?.moat_depth ?? "?"} · ${state.company.franchise?.moat_source ?? "?"}` };
    yield { type: "log", msg: `      Thesis: ${state.company.thesis_statement?.thesis_quality?.toUpperCase().replace("_", " ") ?? "?"}` };

    // ── Agent 10: GORILLA ─────────────────────────────────────────────────────
    yield { type: "agent_start", agent: "GORILLA", step: 2 };
    yield { type: "log", msg: `[2/4] GORILLA — Value Gorilla assessment…` };

    const gorillaInput: GorillaInput = {
      ticker,
      company_name: input.company_name,
      analyst_id: input.analyst_id ?? "research_pipeline",
      // Pass context from COMPANY analysis
      business_summary: state.company.franchise?.executive_summary ?? "",
      economic_domain: state.company.franchise?.identity ?? "",
      geographic_exposure: state.company.franchise?.geography ?? "",
      moat_type: state.company.franchise?.moat_source ?? "",
      moat_evidence: state.company.franchise?.moat_evidence ?? "",
      key_metrics: state.company.financials?.financial_memo ?? "",
      management_notes: state.company.owner_operator?.trust_rationale ?? "",
      main_thesis: state.company.thesis_statement?.thesis ?? "",
      catalyst: state.company.franchise?.catalyst_assessment ?? "",
      bull_triggers: state.company.gorilla_elevator?.why_likely_to_succeed ?? "",
      base_narrative: state.company.gorilla_elevator?.economic_opportunity ?? "",
      bear_risk: state.company.thesis_statement?.key_risks?.join("; ") ?? "",
      invalidation: state.company.analyst_questions?.join("; ") ?? "",
      news_headlines: state.company.invisible_layer?.not_on_the_page ?? [],
    };

    state.gorilla = await runGorilla(llm, gorillaInput);
    yield { type: "agent_done", agent: "GORILLA", step: 2 };
    yield { type: "log", msg: `      Verdict: ${state.gorilla.gorilla_verdict} (score: ${state.gorilla.gorilla_total})` };
    yield { type: "log", msg: `      Invisible: ${state.gorilla.invisible_gorilla?.score ?? "?"}/100` };

    // ── Agent 11: IMAGINE ─────────────────────────────────────────────────────
    yield { type: "agent_start", agent: "IMAGINE", step: 3 };
    yield { type: "log", msg: `[3/4] IMAGINE — Long-range scenarios…` };

    const imagineInput: ImagineInput = {
      ticker,
      company_name: input.company_name,
      analyst_id: input.analyst_id ?? "research_pipeline",
      // Business context from COMPANY
      business_summary: state.company.franchise?.executive_summary ?? "",
      economic_domain: state.company.franchise?.identity ?? "",
      geographic_exposure: state.company.franchise?.geography ?? "",
      moat_type: state.company.franchise?.moat_source ?? "",
      moat_evidence: state.company.franchise?.moat_evidence ?? "",
      key_metrics: state.company.financials?.financial_memo ?? "",
      management_notes: state.company.owner_operator?.trust_rationale ?? "",
      // Thesis context from COMPANY + GORILLA
      main_thesis: state.company.thesis_statement?.thesis ?? "",
      catalyst: state.company.franchise?.catalyst_assessment ?? "",
      bull_triggers: state.gorilla.combinatorial?.new_combination ?? "",
      base_narrative: state.company.gorilla_elevator?.economic_opportunity ?? "",
      bear_risk: state.company.thesis_statement?.key_risks?.join("; ") ?? "",
      invalidation: state.gorilla.key_questions?.join("; ") ?? "",
      // Evidence
      news_headlines: state.company.invisible_layer?.not_on_the_page ?? [],
    };

    state.imagine = await runImagine(llm, imagineInput);
    yield { type: "agent_done", agent: "IMAGINE", step: 3 };
    yield { type: "log", msg: `      Digital stage: ${state.imagine.digital_stage}` };
    yield { type: "log", msg: `      Growth driver: ${state.imagine.growth_driver}` };
    yield { type: "log", msg: `      Scenarios: ${state.imagine.scenarios?.length ?? 0} horizons` };

    // ── Agent 12: THESIS ──────────────────────────────────────────────────────
    yield { type: "agent_start", agent: "THESIS", step: 4 };
    yield { type: "log", msg: `[4/4] THESIS — Investment thesis synthesis…` };

    // Build thesis input from accumulated context
    const thesisInput: ThesisInput = {
      ticker,
      company_name: input.company_name,
      analyst_id: input.analyst_id ?? "research_pipeline",
      // Business context
      business_summary: state.company.franchise?.executive_summary ?? "",
      economic_domain: state.company.franchise?.identity ?? "",
      geographic_exposure: state.company.franchise?.geography ?? "",
      moat_type: state.company.franchise?.moat_source ?? "",
      moat_evidence: state.company.franchise?.moat_evidence ?? "",
      key_metrics: state.company.financials?.financial_memo ?? "",
      management_notes: `${state.company.owner_operator?.ceo_profile ?? ""}\n${state.company.owner_operator?.trust_rationale ?? ""}`,
      // Thesis context
      main_thesis: state.company.thesis_statement?.thesis ?? "",
      catalyst: state.company.franchise?.catalyst_assessment ?? "",
      bull_triggers: state.gorilla.combinatorial?.new_combination ?? "",
      base_narrative: state.company.gorilla_elevator?.economic_opportunity ?? "",
      bear_risk: state.company.thesis_statement?.key_risks?.join("; ") ?? "",
      invalidation: state.gorilla.key_questions?.join("; ") ?? "",
      // Evidence from imagination
      news_headlines: state.imagine.not_in_the_price ?? [],
    };

    state.thesis = await runThesis(llm, thesisInput);
    yield { type: "agent_done", agent: "THESIS", step: 4 };
    yield { type: "log", msg: `      Quality: ${state.thesis.thesis_quality?.toUpperCase().replace("_", " ") ?? "?"}` };

    // ── Pipeline complete ─────────────────────────────────────────────────────
    state.status = "COMPLETED";
    state.completed_at = new Date().toISOString();

    yield { type: "log", msg: `═══════════════════════════════════════════════════════` };
    yield { type: "log", msg: `RESEARCH PIPELINE COMPLETE` };
    yield { type: "log", msg: `  Gorilla: ${state.gorilla.gorilla_verdict} (${state.gorilla.gorilla_total}/100)` };
    yield { type: "log", msg: `  Thesis:  ${state.thesis.thesis_quality}` };
    yield { type: "log", msg: `═══════════════════════════════════════════════════════` };

    yield { type: "done", result: state };

  } catch (err) {
    state.status = "FAILED";
    state.error = String(err);
    yield { type: "error", error: state.error };
  }

  return state;
}
