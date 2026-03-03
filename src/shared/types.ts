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

export interface NewsItem {
  id: string;
  headline: string;
  source_tier: 1 | 2;
  score: number;
  published_at: string;
}

export interface Hypothesis {
  id: string;
  statement: string;
  lifecycle: HypothesisLifecycle;
  crm_contact_id?: string;
}

export interface IntelBundle {
  surfaced_count: number;
  suppressed_count: number;
  mosaic_clear: boolean;
  news_items: NewsItem[];
  hypotheses: Hypothesis[];
  mgmt_comm_score: number; // 0–100
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

export interface ForensicProfile {
  risk_score: number;           // 0–100
  mgmt_trust_score: number;     // 0–100 (Shadow Test)
  flags: YellowFlag[];
  eps_haircut_total: number;
  dr_add_bps_total: number;
  recommendation: Recommendation;
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
}

export interface ValuationInput {
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

export interface CommOutput {
  output_type: OutputType;
  enter_gate: EnterGateResult;
  audit_trail: AuditTrail;
  publication_possible: boolean;
  content?: string;            // generated report/note text
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
}
