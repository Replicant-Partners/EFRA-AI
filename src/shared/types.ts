// ─────────────────────────────────────────────
// Efrain AI — Shared Types  v2.2.0
// ─────────────────────────────────────────────

export type HorizonTag = "SHORT" | "MEDIUM" | "COMPOUNDER";
export type DownstreamMode = "valentine" | "gunn" | "dual";
export type Decision = "MUST_COVER" | "DROP" | "REVIEW_ZONE";
export type Recommendation = "BLOCK" | "CONDITIONAL" | "CLEAR";
export type Rating = "BUY" | "HOLD" | "UNDERPERFORM";
export type OutputType = "FLASH_NOTE" | "INITIATION" | "ALERT" | "QUARTERLY";
export type Severity = 1 | 2 | 3 | 4 | 5;
export type HypothesisLifecycle =
  | "PENDING"
  | "PENDING_CONTACT_UNAVAILABLE"
  | "VALIDATED"
  | "UNRESOLVABLE";

// ─── Agent 01 — SCOUT ────────────────────────

export interface ScoutInput {
  ticker: string;
  analyst_id: string;
  catalyst: string;
  idea_source_tag?: string;
  in_excellence_universe?: boolean;  // analyst pre-confirmed S1-S11 pass
}

export interface AlphaScore {
  coverage_gap_score: number;   // 0–25
  market_cap_fit: number;       // 0–20
  sector_relevance: number;     // 0–25
  valuation_anomaly: number;    // 0–30
  em_gdp_bonus: number;         // 0 or 10
  bessembinder_bonus: number;   // 0 or 10
  low_coverage_bonus: number;   // 0 or 5
  gunn_bonus: number;           // sum of three bonuses above
  total: number;                // min(base + gunn_bonus, 100)
}

export interface ScoreReasoning {
  coverage_gap_rationale: string;
  market_cap_fit_rationale: string;
  sector_relevance_rationale: string;
  valuation_anomaly_rationale: string;
  gunn_bonus_rationale?: string;
}

export interface ScoutOutput {
  alpha_score: AlphaScore;
  score_reasoning: ScoreReasoning;
  horizon_tag: HorizonTag;
  downstream_mode: DownstreamMode;
  decision: Decision;
  decision_rationale: string;        // max 200 chars
  confidence: number;                // 0.0–1.0
  fallback_level: "none" | "L1_cache" | "L2_edgar" | "L_manual";
  conf_adjustment: number;           // 0 | -0.05 | -0.15 | -0.25
  rescreen_eligible_after?: string;  // ISO date, set when DROP
  forensic_pre_result?: "pass" | "conditional" | "block" | "skipped";
  forensic_reorientation?: string;   // set when conditional
}

// ─── Agent 02 — INTEL ────────────────────────

export interface BusinessContext {
  executive_summary: string; // Step 0: 3 plain-language paragraphs — what, how, why it matters
  moat_type: string;         // Step 4: marca | costos | red | regulación | otra
  moat_evidence: string;     // Step 4: concrete evidence for the moat
  growth_trend: string;      // Step 7: organic/inorganic, consistent? 1 sentence
  catalyst_assessment: string; // Step 8: catalyst + is it priced in?
  business_memo: string;     // Final: 200-word investment memo paragraph
}

export interface NewsItem {
  id: string;
  headline: string;
  source: "news_api" | "edgar_sec" | "crm";
  source_tier: 1 | 2;
  score: number;
  published_at: string;
  summary: string;   // 1-sentence: why this matters for the thesis
}

export interface Hypothesis {
  id: string;
  statement: string;
  lifecycle: HypothesisLifecycle;
  crm_contact_id?: string;
}

export interface IntelBundle {
  business_context: BusinessContext;
  surfaced_count: number;
  suppressed_count: number;
  mosaic_clear: boolean;
  news_items: NewsItem[];
  hypotheses: Hypothesis[];
  mgmt_comm_score: number;    // 0–100
  analyst_briefing: string;   // 3-4 sentence synthesis of what the analyst must know
}

export interface IntelInput {
  idea_id: string;
  ticker: string;
  horizon_tag: HorizonTag;
  downstream_mode: DownstreamMode;
}

// ─── Agent 03 — CRITICAL FACTOR ──────────────

export interface CriticalFactor {
  id: string;
  description: string;
  eps_impact_pct: number;
}

export interface Scenario {
  type: "Bull" | "Base" | "Bear";
  probability: number;           // 0–1, sum must = 1.0
  implied_pt: number;
  price_derivation: string;      // math: how implied_pt was calculated (e.g. "EPS $2.50 × P/E 74x")
  triggers: string;              // what must happen for this scenario to materialize
  narrative?: string;            // 2-3 sentences: what the world looks like in this scenario
  key_assumption?: string;       // single most critical assumption underlying this scenario
  invalidation?: string;         // what would invalidate / kill this scenario
}

export interface BuildToLastScore {
  management: number;
  tam: number;
  moat: number;
  total: number;
}

export interface CFOutput {
  factors: CriticalFactor[];    // 2–4 factors
  scenarios: Scenario[];
  expected_value_pt: number;
  build_to_last_score?: BuildToLastScore; // Gunn mode only
  hypotheses: Hypothesis[];
}

// ─── Agent 04 — FORENSIC ─────────────────────

export interface YellowFlag {
  severity: Severity;
  description: string;
  eps_haircut_pct: number;
  dr_add_bps: number;
}

export interface ManagementProfile {
  founder_profile: string;      // Step 1: founder + current control level
  ceo_profile: string;          // Step 2: CEO + appointment origin
  team_stability: string;       // Step 3: key execs + stability observation
  incentive_alignment: string;  // Step 4: compensation structure + alignment judgment
  key_decisions: string;        // Step 5: 3-5 key decisions + evaluation
  management_summary: string;   // Final: 200-word investment memo paragraph
}

export interface ForensicProfile {
  risk_score: number;           // 0–100
  mgmt_trust_score: number;     // 0–100 (Shadow Test)
  flags: YellowFlag[];
  eps_haircut_total: number;
  dr_add_bps_total: number;
  recommendation: Recommendation;
  management_profile?: ManagementProfile; // only present in FULL SCAN
}

export interface ForensicInput {
  idea_id: string;
  ticker: string;
  run_mode: "PRE-SCREEN" | "FULL";
}

// ─── Agent 05 — VALUATION ────────────────────

export interface FaVeSScore {
  frequency: number;  // F
  visibility: number; // V
  significance: number; // S
  total: number;      // 1–9
}

export interface ValuationModel {
  pt_12m: number;
  pt_5y?: number;              // Gunn mode only
  rating: Rating;
  rr_ratio: number;
  faves_score: FaVeSScore;
  ic_premium?: number;         // 0–1.5, Gunn mode only
  conf_adj: number;            // cumulative confidence adjustment
  // 8-step framework outputs
  valuation_exec_summary?: string; // Step 0: how market values the company today
  current_multiples?: string;      // Step 2: P/S, P/E, EV/EBITDA, P/FCF snapshot
  market_assumptions?: string;     // Step 3: what the market is discounting
  peer_comparison?: string;        // Step 4: comparable companies + relative value
  margin_of_safety?: string;       // Step 8: margin of safety + re-rating catalyst
  valuation_summary?: string;      // Final: 200-word investment memo paragraph
}

export interface ValuationInput {
  ticker: string;
  forensic_profile: ForensicProfile;
  cf_scenarios: Scenario[];
  intel_bundle: IntelBundle;
  build_to_last_score?: BuildToLastScore;
  downstream_mode: DownstreamMode;
}

// ─── Agent 06 — COMMUNICATION ────────────────

export interface EnterGateResult {
  edge: boolean;
  new_catalyst: boolean;
  timely: boolean;
  examples: boolean;
  revealing: boolean;
  effective_score: number;     // 0–5 minus forensic_penalty
}

export interface AuditTrail {
  agents_run: string[];
  confidence_adjustments: { agent: string; code: string; adj: number }[];
  fallback_flags: string[];
  final_confidence: number;
}

export interface FinalSummary {
  business:   string;   // 1-2 sentences: what the company does and its moat
  management: string;   // 1-2 sentences: management quality and trust score
  valuation:  string;   // 1-2 sentences: PT, rating, and key valuation insight
}

export interface CommOutput {
  output_type: OutputType;
  enter_gate: EnterGateResult;
  audit_trail: AuditTrail;
  publication_possible: boolean;
  content?: string;            // generated report/note text (CASCADE format)
  summary?: FinalSummary;      // structured 3-part synthesis
}

export interface CommInput {
  valuation_model: ValuationModel;
  forensic_profile: ForensicProfile;
  cf_output: CFOutput;
  intel_bundle: IntelBundle;
  downstream_mode: DownstreamMode;
}

// ─── Pipeline ─────────────────────────────────

export interface PipelineState {
  idea_id: string;
  ticker: string;
  status:
    | "RUNNING"
    | "PAUSED_FORENSIC_UNAVAILABLE"
    | "COMPLIANCE_HALT"
    | "COMPLETED"
    | "DROPPED";
  scout?: ScoutOutput;
  intel?: IntelBundle;
  cf?: CFOutput;
  forensic?: ForensicProfile;
  valuation?: ValuationModel;
  communication?: CommOutput;
  kata?: KataBoard;
  lens?: LensBoard;
  // Analyst notes added at each approval step.
  // Key = the agent that just completed (e.g. "scout", "intel").
  // Value = the note the analyst wrote before approving and continuing.
  // These are injected into subsequent agent prompts as analyst context.
  analyst_notes?: Record<string, string>;
}

// ─── UI Event ─────────────────────────────────────────────

export type AgentEvent = {
  agent: string;
  status: "running" | "done" | "dropped" | "halted" | "error";
  result?: unknown;
  reason?: string;
  final?: boolean;
  error?: string;
};

// ─── Agent 09 — LENS ──────────────────────────

export interface LensLoopScore {
  score:                       number;       // 0–100
  domain:                      "biological" | "physical" | "digital" | "mixed";
  variant_expectations:        boolean;
  distributes_future:          boolean;
  valuation_anchor_consistent: boolean;
  assessment:                  string;
}

export interface LensSuperforecastingScore {
  score:                   number;       // 0–100
  probabilities_granular:  boolean;
  inside_outside_balanced: boolean;
  invalidation_specific:   boolean;
  causal_forces_balanced:  boolean;
  assessment:              string;
}

export interface LensDunningKruger {
  flag:                   "low" | "medium" | "high";
  overconfidence_signals: string[];
  knowledge_gap_count:    number;
  confidence_gap:         string;
  assessment:             string;
}

export interface LensHiddenChampion {
  fit:                     "none" | "partial" | "strong";
  characteristics_present: string[];
  characteristics_missing: string[];
  assessment:              string;
}

export interface LensKauffman {
  ergodic_assumption:       boolean;
  adjacent_possible:        string;
  preadaptations:           string[];
  complement_or_substitute: "complement" | "substitute" | "mixed";
  assessment:               string;
}

export interface LensBoard {
  loop:             LensLoopScore;
  superforecasting: LensSuperforecastingScore;
  dunning_kruger:   LensDunningKruger;
  hidden_champion:  LensHiddenChampion;
  kauffman:         LensKauffman;
  overall_verdict:  "CONSISTENT" | "PARTIAL" | "INCONSISTENT";
  verdict_rationale:string;
  key_tensions:     string[];   // 2–3 specific contradictions
  recommendations:  string[];   // 2–3 concrete actions for the PM
  pm_memo:          string;     // 200 words max
}

export interface LensInput {
  ticker:          string;
  downstream_mode: DownstreamMode;
  scout:           ScoutOutput;
  intel:           IntelBundle;
  forensic:        ForensicProfile;
  cf:              CFOutput;
  valuation:       ValuationModel;
  communication?:  CommOutput;
  kata?:           KataBoard;
}

// ─── Report Document ──────────────────────────────────────

export interface ReportSection {
  key:         string;
  label:       string;
  content:     string;
  source:      string;
  updated_at?: string;
}

export interface ReportScenario {
  type:             "Bull" | "Base" | "Bear";
  probability:      number;
  implied_pt:       number;
  price_derivation: string;
  triggers:         string;
}

// ─── Agent 08 — KATA ──────────────────────────

export interface KnowledgeGap {
  id:           string;
  description:  string;
  source_agent: string; // which agent produced (or missed) this information
}

export interface AssumptionRisk {
  id:          string;
  description: string;
  impact:      "high" | "medium" | "low";
}

export interface KataObstacle {
  id:              string;
  description:     string;
  addressing_now:  boolean; // exactly one must be true
  next_step:       string;
  checkpoint_date: string;  // ISO date
}

export interface PdcaCycle {
  plan:  string; // what the analyst intends to do + expected learning
  do:    string; // specific action: call IR, check EDGAR, run sensitivity
  check: string; // signal that confirms or denies the hypothesis
  act:   string; // "If confirmed: X. If denied: Y."
}

export interface KataBoard {
  challenge:          string;
  current_condition:  string;
  knowledge_gaps:     KnowledgeGap[];
  assumption_risks:   AssumptionRisk[];
  target_condition:   string;
  target_horizon:     string;         // e.g. "48h", "1 week", "next earnings"
  obstacles:          KataObstacle[];
  pdca_cycle:         PdcaCycle;
  coaching_memo:      string;         // max 200 words, Socratic mentor voice
  process_confidence: number;         // 0.0–1.0
  next_review_date:   string;         // ISO date
}

export interface KataInput {
  ticker:          string;
  downstream_mode: DownstreamMode;
  scout:           ScoutOutput;
  intel:           IntelBundle;
  forensic:        ForensicProfile;
  cf:              CFOutput;
  valuation:       ValuationModel;
  communication?:  CommOutput;  // optional — KATA runs before COMMUNICATION in UI flow
}

// ─── Agent 10 — GORILLA ───────────────────────────────────────────────────────

export interface GorillaInput {
  ticker: string;
  company_name?: string;
  analyst_id: string;
  // Business tab
  business_summary: string;
  economic_domain: string;
  geographic_exposure: string;
  moat_type: string;
  moat_evidence: string;
  key_metrics: string;
  management_notes: string;
  // Thesis tab
  main_thesis: string;
  catalyst: string;
  bull_triggers: string;
  base_narrative: string;
  bear_risk: string;
  invalidation: string;
  // Evidence tab
  news_headlines: string[];
}

export interface GorillaDimension {
  score:      number;   // 0–100
  assessment: string;   // 2–3 sentences with specific evidence
}

export interface GorillaObviousProblem extends GorillaDimension {
  evidence: string[];   // 2–4 concrete facts that make this a large, known problem
}

export interface GorillaInvisible extends GorillaDimension {
  why_invisible:     string;   // specific reason the market can't see the solution
  market_assumption: string;   // the wrong consensus assumption
}

export interface GorillaCombinatorial extends GorillaDimension {
  existing_technologies: string[];  // old components being assembled
  new_combination:       string;    // what is novel about this specific assembly
}

export interface GorillaChokePoint extends GorillaDimension {
  value_chain: string;   // which industry value chain
  position:    string;   // where in the chain (upstream / midstream / platform / last-mile)
}

export interface GorillaValuationGap {
  consistent:      boolean;  // does valuation match the "invisible gorilla" thesis?
  current_pricing: string;   // what expectations the current price embeds
  assessment:      string;
}

export interface GorillaBoard {
  obvious_problem:   GorillaObviousProblem;
  invisible_gorilla: GorillaInvisible;
  combinatorial:     GorillaCombinatorial;
  choke_point:       GorillaChokePoint;
  valuation_gap:     GorillaValuationGap;
  gorilla_total:     number;                               // weighted score 0–100
  gorilla_verdict:   "GORILLA" | "SMALL_ANIMAL" | "PEDESTRIAN";
  verdict_rationale: string;
  key_questions:     string[];   // 3 most important questions to resolve
  gorilla_memo:      string;     // 200-word memo — direct, no hedging
}

// ─── Agent 11 — IMAGINE ───────────────────────────────────────────────────────

export interface ImagineInput {
  ticker: string;
  company_name?: string;
  analyst_id: string;
  // Business tab
  business_summary: string;
  economic_domain: string;
  geographic_exposure: string;
  moat_type: string;
  moat_evidence: string;
  key_metrics: string;
  management_notes: string;
  // Thesis tab
  main_thesis: string;
  catalyst: string;
  bull_triggers: string;
  base_narrative: string;
  bear_risk: string;
  invalidation: string;
  // Evidence tab
  news_headlines: string[];
}

export type DigitalStage = "model" | "shadow" | "twin" | "source";
export type GrowthDriver  = "innovation" | "demographic" | "both" | "neither";

export interface FalsifiablePrediction {
  prediction:  string;   // specific, observable claim
  test:        string;   // what data point or event would confirm or deny it
  horizon:     string;   // "6 months" | "1 year" | "3 years" | "5 years"
  confidence:  number;   // 0–1
}

export interface LongRangeScenario {
  horizon:     "5y" | "10y" | "20y";
  world:       string;   // what the world looks like at this horizon for this business
  company:     string;   // what the company looks like in this world
  key_force:   string;   // single most important force driving this scenario
  probability: number;   // 0–1
}

export interface ImagineBoard {
  // Digital transformation stage
  digital_stage:           DigitalStage;
  digital_stage_rationale: string;         // why this stage, what's next

  // Growth driver
  growth_driver:           GrowthDriver;
  growth_driver_rationale: string;         // innovation vs demographic vs both

  // Long-range scenarios
  scenarios:               LongRangeScenario[];   // one per horizon: 5y, 10y, 20y

  // What's not on the page and not in the price
  not_on_the_page:         string[];   // 3–5 things the analyst's notes don't capture
  not_in_the_price:        string[];   // 3–5 things the market is not pricing in

  // Falsifiable predictions
  predictions:             FalsifiablePrediction[];  // 3–5 testable claims

  // Overall imagination confidence
  imagination_confidence:  number;   // 0–1
  confidence_rationale:    string;

  // Memo
  imagine_memo:            string;   // 200-word memo — direct, forward-looking
}

// ─── Agent 12 — THESIS ────────────────────────────────────────────────────────

export interface ThesisInput {
  ticker: string;
  company_name?: string;
  analyst_id: string;
  business_summary: string;
  economic_domain: string;
  geographic_exposure: string;
  moat_type: string;
  moat_evidence: string;
  key_metrics: string;
  management_notes: string;
  main_thesis: string;
  catalyst: string;
  bull_triggers: string;
  base_narrative: string;
  bear_risk: string;
  invalidation: string;
  news_headlines: string[];
}

export type MoatStrength             = "wide" | "narrow" | "none" | "building";
export type ThesisDurability         = "high" | "medium" | "low";
export type CapitalAllocationVerdict = "excellent" | "good" | "fair" | "poor" | "unknown";
export type WorkingCapitalTrend      = "stable" | "improving" | "deteriorating" | "unknown";
export type SignpostScore            = "strong" | "moderate" | "weak" | "unknown";
export type LtCapitalVerdict         = "good" | "concerning" | "mixed" | "unknown";
export type ValueDriver              = "sales" | "book" | "mixed";
export type ThesisQuality            = "investment_grade" | "needs_work" | "incomplete";

export interface BusinessFranchise {
  summary:                  string;
  moat_strength:            MoatStrength;
  value_creation_mechanism: string;
  durability:               ThesisDurability;
  key_risks:                string[];
}

export interface ManagementQuality {
  summary:                    string;
  capital_allocation_verdict: CapitalAllocationVerdict;
  leadership_assessment:      string;
  culture_indicators:         string[];
  red_flags:                  string[];
}

export interface FinancialSignposts {
  gross_margin_stability: {
    score:      SignpostScore;
    assessment: string;
  };
  negative_working_capital: {
    present:    boolean | null;
    assessment: string;
  };
  long_term_capital_allocation: {
    verdict:    LtCapitalVerdict;
    evidence:   string;
    assessment: string;
  };
  short_term_capital_allocation: {
    consistency: WorkingCapitalTrend;
    assessment:  string;
  };
}

export interface Stage3Terminal {
  long_term_growth:        string;
  long_term_profitability: string;
  implied_multiple:        string;
  target_multiple:         string;
}

export interface ValueExpectations {
  value_driver:              ValueDriver;
  stage1_consensus:          string;
  stage2_normalization:      string;
  stage3_terminal:           Stage3Terminal;
  balance_sheet_adjustments: string;
  return_expectation:        string;
}

export interface TurdBlossom {
  is_turd_blossom:    boolean;
  current_reputation: string;
  early_shoots:       string[];
  blossom_thesis:     string;
}

export interface ThesisBoard {
  thesis_statement:    string;
  business_franchise:  BusinessFranchise;
  management_quality:  ManagementQuality;
  financial_signposts: FinancialSignposts;
  value_expectations:  ValueExpectations;
  gorilla_summary:     string;
  turd_blossom:        TurdBlossom;
  thesis_quality:      ThesisQuality;
  quality_rationale:   string;
  thesis_memo:         string;
}

// ─── Report Document ──────────────────────────────────────

export interface ReportContent {
  version:            1;
  generated_at:       string;
  sections:           ReportSection[];
  scenarios:          ReportScenario[];
  cascade_text:       string;
  cascade_updated_at: string;
}

// ─── Research Chat ─────────────────────────────────────────

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id:         string;
  role:       ChatRole;
  content:    string;
  sources?:   ResearchSource[];   // web sources cited in this turn
  timestamp:  string;             // ISO
}

export interface ResearchSource {
  title: string;
  url:   string;
  type:  "sec_filing" | "ir_page" | "news" | "regulatory" | "other";
  snippet?: string;
}

/** Subset of ResearchDraft that the chat agent builds incrementally */
export interface ResearchDraftPatch {
  ticker?:              string;
  company_name?:        string;
  mode?:                "valentine" | "gunn" | "dual";
  business_summary?:    string;
  economic_domain?:     string;
  geographic_exposure?: string;
  moat_type?:           string;
  moat_evidence?:       string;
  management_notes?:    string;
  key_metrics?:         string;
  main_thesis?:         string;
  bull_triggers?:       string;
  bull_pt?:             string;
  base_narrative?:      string;
  base_pt?:             string;
  bear_risk?:           string;
  invalidation?:        string;
  catalyst?:            string;
  news_items?:          { headline: string; why: string }[];
}

export interface ResearchChatRequest {
  ticker:   string;
  messages: { role: ChatRole; content: string }[];
  draft:    ResearchDraftPatch;
}

export interface ResearchChatChunk {
  type:    "token" | "sources" | "draft_patch" | "done" | "error";
  token?:  string;
  sources?: ResearchSource[];
  patch?:  ResearchDraftPatch;
  error?:  string;
}

// ─── Agent 13 — COMPANY ───────────────────────────────────────────────────────

export interface CompanyInput {
  ticker:       string;
  company_name?: string;
  analyst_note?: string;   // optional analyst context injected before analysis
  edgar_facts?:  string;   // pre-fetched EDGAR XBRL data
}

// Self-assessment: how the company sees itself
export interface CompanySelfView {
  how_they_describe_themselves: string;  // from filings/IR language
  stated_strategy:              string;  // what management says they are doing
  key_metrics_management_uses:  string;  // what they track and report
  red_flags_in_language:        string;  // hedging, vagueness, complexity
}

// Owner operator analysis
export interface OwnerOperatorProfile {
  is_owner_operator:        boolean;
  founder_involvement:      string;   // founder-led / professional mgmt / post-founder
  insider_ownership_pct:    string;   // % or "unknown"
  agency_risk:              "low" | "medium" | "high";
  incentive_alignment:      string;   // how compensation aligns with long-term value
  key_decisions_assessment: string;   // 2-3 key decisions and what they reveal
  imagine_running_it:       string;   // "If you were running this business, what would you do?" — gaps/concerns
}

export type MoatSource    = "brand" | "costs" | "network" | "regulatory" | "switching" | "other" | "none";
export type MoatDepth     = "wide" | "narrow" | "building" | "none";
export type MoatDurability = "high" | "medium" | "low";

// Business franchise deep analysis
export interface CompanyFranchise {
  executive_summary:        string;          // 3 paragraphs — what, how, why it matters
  identity:                 string;          // products, industry, revenue segments
  geography:                string;          // countries, revenue distribution
  business_model_type:      "recurring" | "cyclical" | "transactional" | "mixed";
  business_model_logic:     string;          // why that classification
  // Moat — full framework
  moat_source:              MoatSource;      // primary source of competitive advantage
  moat_depth:               MoatDepth;       // Wide / Narrow / Building / None
  moat_durability:          MoatDurability;  // High / Medium / Low
  value_creation_mechanism: string;          // how moat → shareholder value (1 sentence)
  moat_evidence:            string;          // concrete evidence: margins, ROIC, pricing power
  // Rest of franchise
  competitive_position:     string;          // competitors, differentiation
  customers_channels:       string;          // who buys, concentration risk
  growth_history:           string;          // organic/inorganic, CAGR, consistency
  catalyst_assessment:      string;          // most recent event — is it priced in?
}

// Seeing what isn't there yet
export interface InvisibleLayer {
  not_on_the_page:        string[];  // 3 things the filings/reports don't say
  not_in_the_price:       string[];  // 3 things the market is not pricing in
  market_wrong_assumption: string;   // the single biggest consensus mistake
  analyst_blind_spots:    string[];  // what most analysts are missing
}

// Turd blossom assessment
export interface CompanyTurdBlossom {
  is_turd_blossom:    boolean;
  current_reputation: string;   // why the market dislikes/ignores it
  early_shoots:       string[]; // signs of improvement
  blossom_thesis:     string;   // path from turd to blossom
  blossom_timeline:   string;   // when could this re-rate
}

// Value Gorilla elevator pitch
export interface CompanyGorillaElevator {
  is_gorilla_candidate:   boolean;
  economic_opportunity:   string;  // what large problem are they exploiting
  exploitation_method:    string;  // what are they doing to exploit it
  why_likely_to_succeed:  string;  // why will they win
  why_market_doubts_it:   string;  // why is the stock priced as if they won't
  elevator_pitch:         string;  // 2-3 sentence synthesis
}

// Investment thesis (qualitative only — durable, timeless)
export interface CompanyThesisStatement {
  thesis:            string;   // 1-3 paragraphs — the firm's answer to "why is this a value gorilla?"
  three_year_test:   string;   // would this thesis still be true in 3 years?
  key_risks:         string[]; // 2-3 durable risks that could invalidate it
  thesis_quality:    "investment_grade" | "needs_work" | "incomplete";
  quality_rationale: string;
}

export interface CompanyBoard {
  self_view:          CompanySelfView;
  franchise:          CompanyFranchise;
  owner_operator:     OwnerOperatorProfile;
  invisible_layer:    InvisibleLayer;
  turd_blossom:       CompanyTurdBlossom;
  gorilla_elevator:   CompanyGorillaElevator;
  thesis_statement:   CompanyThesisStatement;
  business_memo:      string;  // 200-word synthesis — investment memo style
  analyst_questions:  string[]; // 3 most important open questions
}
