import { chat, MODELS, extractJSON } from "../../shared/client.js";
import type { ScoutInput, ScoutOutput } from "../../shared/types.js";

const SYSTEM_PROMPT = `
You are Scout, Agent 01 of Efrain AI — a multi-agent equity research system built
on the Valentine (12M, event-driven) and Gunn (3–20Y, compounder-focused) dual framework.

Your role is Coverage Universe Optimizer. You are the first and cheapest filter in the
pipeline. Your decision determines whether 40+ hours of analysis get committed or not.

## ALPHA SCORE FORMULA
base = (coverage_gap_score × weight)
     + (market_cap_fit × weight)
     + (sector_relevance × weight)
     + (valuation_anomaly × weight)

Components and max values:
- coverage_gap_score:  0–25  (analyst coverage gap — fewer analysts = higher gap)
- market_cap_fit:      0–20  (fit within the $200M–$50B target universe)
- sector_relevance:    0–25  (sector momentum, thematic tailwinds, peer activity)
- valuation_anomaly:   0–30  (observable mispricing vs peers or historical range)

gunn_bonus (each is independent, can stack):
- em_gdp_bonus:        +10   if home country GDP per capita < $15K USD
- bessembinder_bonus:  +10   if profile matches Bessembinder long-term compounder dataset
- low_coverage_bonus:  +5    if < 5 sell-side analysts cover the name
- gunn_bonus = em_gdp_bonus + bessembinder_bonus + low_coverage_bonus

total = MIN(base + gunn_bonus, 100)

## GATE RULES
≥ 70 → MUST_COVER: proceed to full pipeline immediately
65–70 → REVIEW_ZONE: flag for human analyst review within 48h — pipeline proceeds with flag
< 65  → DROP: rescreen_eligible_after = today + 90 days

## HORIZON TAGGING
SHORT      → Valentine mode, 12M catalyst-driven thesis
MEDIUM     → Valentine mode, 3Y structural thesis
COMPOUNDER → Gunn mode, 5–20Y compounding thesis, EM priority

## DOWNSTREAM MODE
- 0 Gunn flags + catalyst → "valentine" (horizon: SHORT or MEDIUM)
- 2+ Gunn flags           → "gunn"     (horizon: COMPOUNDER)
- 1 Gunn flag + catalyst  → "dual"     (horizon: MEDIUM or COMPOUNDER)

## FORENSIC PRE-SCREEN RULE
If alpha_score >= 65, always assess the forensic pre-screen:
- "pass"        → thesis confirmed, proceed
- "conditional" → reorient thesis, do not auto-drop (a conditional is often the thesis itself)
- "block"       → severe accounting/fraud concern, drop
- "skipped"     → alpha_score < 65, not evaluated

## EXCELLENCE UNIVERSE CRITERIA (all 11 must pass for inclusion)
S1  Trading Status: Active
S2  Primary Security of company only
S3  Exchanges: −China −India −Saudi Arabia −Russia −Taiwan −South Korea
S4  Price 1 day ago > $0.50
S5  LF Working Capital < T12M Revenue × 0.33
S6  LF Total Debt / Total Assets < 30%
S7  10yr Gross Margin Stability ≤ 5
S8  20% ≤ Latest FY Gross Margin ≤ 80%
S9  Gross Profitability > 20%
S10 Current Market Cap (USD) > $200M
S11 Latest Quarterly Sales – 5Y Average Growth > 7%

## CONFIDENCE & FALLBACK
Since you operate without live MCP data in this context:
- fallback_level = "none" if you have sufficient context from the catalyst
- fallback_level = "L1_cache" if relying on general knowledge only
- conf_adjustment: 0 (normal) | -0.05 (L1) | -0.15 (L2) | -0.25 (manual)
- confidence = base confidence (0.7–0.95) + conf_adjustment

## OUTPUT FORMAT
Respond ONLY with valid JSON — no markdown, no prose.
decision_rationale must be ≤ 200 characters.

Example structure (use real numbers, not these placeholders):
{
  "alpha_score": {
    "coverage_gap_score": 18,
    "market_cap_fit": 15,
    "sector_relevance": 20,
    "valuation_anomaly": 22,
    "em_gdp_bonus": 0,
    "bessembinder_bonus": 0,
    "low_coverage_bonus": 5,
    "gunn_bonus": 5,
    "total": 80
  },
  "score_reasoning": {
    "coverage_gap_rationale": "...",
    "market_cap_fit_rationale": "...",
    "sector_relevance_rationale": "...",
    "valuation_anomaly_rationale": "...",
    "gunn_bonus_rationale": null
  },
  "horizon_tag": "SHORT",
  "downstream_mode": "valentine",
  "decision": "MUST_COVER",
  "decision_rationale": "Strong alpha score driven by valuation anomaly and sector tailwinds.",
  "confidence": 0.82,
  "fallback_level": "L1_cache",
  "conf_adjustment": -0.05,
  "rescreen_eligible_after": null,
  "forensic_pre_result": "pass",
  "forensic_reorientation": null
}
`.trim();

const JSON_SCHEMA = {
  type: "object",
  properties: {
    alpha_score: {
      type: "object",
      properties: {
        coverage_gap_score:  { type: "number" },
        market_cap_fit:      { type: "number" },
        sector_relevance:    { type: "number" },
        valuation_anomaly:   { type: "number" },
        em_gdp_bonus:        { type: "number" },
        bessembinder_bonus:  { type: "number" },
        low_coverage_bonus:  { type: "number" },
        gunn_bonus:          { type: "number" },
        total:               { type: "number" },
      },
      required: [
        "coverage_gap_score","market_cap_fit","sector_relevance","valuation_anomaly",
        "em_gdp_bonus","bessembinder_bonus","low_coverage_bonus","gunn_bonus","total",
      ],
      additionalProperties: false,
    },
    score_reasoning: {
      type: "object",
      properties: {
        coverage_gap_rationale:     { type: "string" },
        market_cap_fit_rationale:   { type: "string" },
        sector_relevance_rationale: { type: "string" },
        valuation_anomaly_rationale:{ type: "string" },
        gunn_bonus_rationale:       { type: ["string", "null"] },
      },
      required: [
        "coverage_gap_rationale","market_cap_fit_rationale",
        "sector_relevance_rationale","valuation_anomaly_rationale","gunn_bonus_rationale",
      ],
      additionalProperties: false,
    },
    horizon_tag:             { type: "string", enum: ["SHORT","MEDIUM","COMPOUNDER"] },
    downstream_mode:         { type: "string", enum: ["valentine","gunn","dual"] },
    decision:                { type: "string", enum: ["MUST_COVER","DROP","REVIEW_ZONE"] },
    decision_rationale:      { type: "string" },
    confidence:              { type: "number" },
    fallback_level:          { type: "string", enum: ["none","L1_cache","L2_edgar","L_manual"] },
    conf_adjustment:         { type: "number" },
    rescreen_eligible_after: { type: ["string","null"] },
    forensic_pre_result:     { type: ["string","null"], enum: ["pass","conditional","block","skipped",null] },
    forensic_reorientation:  { type: ["string","null"] },
  },
  required: [
    "alpha_score","score_reasoning","horizon_tag","downstream_mode",
    "decision","decision_rationale","confidence","fallback_level","conf_adjustment",
    "rescreen_eligible_after","forensic_pre_result",
  ],
  additionalProperties: false,
};

export async function runScout(input: ScoutInput): Promise<ScoutOutput> {
  const userMessage = `
Evaluate this investment idea:

Ticker:                  ${input.ticker}
Analyst ID:              ${input.analyst_id}
Catalyst:                ${input.catalyst}
Idea source tag:         ${input.idea_source_tag ?? "N/A"}
Excellence Universe:     ${input.in_excellence_universe ? "YES — analyst confirms S1–S11 all pass" : "NOT CONFIRMED — assess independently"}

Calculate the Alpha Score using the formula, apply gate rules, assign horizon_tag and
downstream_mode, assess forensic_pre_result if alpha_score >= 65, and emit the full JSON.
`.trim();

  const text = await chat({
    model:       MODELS.sonnet,
    system:      SYSTEM_PROMPT,
    user:        userMessage,
    temperature: 0.2,
    max_tokens:  1500,
    json_mode:   true,
  });

  return JSON.parse(extractJSON(text)) as ScoutOutput;
}
