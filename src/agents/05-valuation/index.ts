import { chat, MODELS, extractJSON } from "../../shared/client.js";
import type { ValuationInput, ValuationModel } from "../../shared/types.js";

const SYSTEM_PROMPT = `
IMPORTANT: Respond ONLY with a valid JSON object. Do not add text, headers, or explanations before or after the JSON.

You are VALUATION, Agent 05 of the Efrain AI system.
Role: price_target_engine

You run an 8-step valuation analysis to determine the fair value of a stock.

════════════════════════════════════════════
STEP 0 — VALUATION EXECUTIVE SUMMARY
════════════════════════════════════════════
Answer in 3 concise paragraphs:
1. How does the market value this company today? Which multiple dominates and why?
2. Does the current valuation reflect the underlying business? Is there a discount or premium?
3. What would change the market's perception?
→ Capture in: valuation_exec_summary

════════════════════════════════════════════
STEP 1 — CURRENT PRICE & BASE METRICS
════════════════════════════════════════════
Identify: current price, market cap, enterprise value, shares outstanding.
→ Use these data points to anchor calculations in STEP 2 onward.

════════════════════════════════════════════
STEP 2 — CURRENT MULTIPLES
════════════════════════════════════════════
Calculate or estimate key multiples at the current market price:
P/S (price/sales), P/E (price/earnings), EV/EBITDA, P/FCF.
Identify which multiple is most relevant for this sector and why.
→ Capture in: current_multiples (1–2 paragraphs with multiples and relevance judgment)

════════════════════════════════════════════
STEP 3 — WHAT IS THE MARKET PRICING IN?
════════════════════════════════════════════
Work backwards from the current price to infer what the market assumes:
- Implicit bearish case: what growth/margin does the current price assume if the thesis fails?
- Implicit neutral case: what does it assume if everything goes as expected?
- Implicit bullish case: what would need to happen to justify a re-rating?
→ Capture in: market_assumptions (2–3 paragraphs covering the three cases)

════════════════════════════════════════════
STEP 4 — COMPARABLES & RELATIVE POSITIONING
════════════════════════════════════════════
Identify 3–5 comparable companies (peers) and their current multiples (EV/EBITDA and P/E preferred).
Conclude: is the stock expensive, cheap, or in line with peers? Is there any factor justifying
a structural premium or discount?
→ Capture in: peer_comparison (include a text table of peers with multiples and a conclusion)

════════════════════════════════════════════
STEPS 5 / 6 / 7 — BULL / BASE / BEAR SCENARIOS
════════════════════════════════════════════
Reuse the scenarios from the Critical Factor agent (already provided in the input).
Apply Forensic adjustments: eps_haircut_total to EPS, dr_add_bps_total to WACC.
Calculate pt_12m as the probability-weighted expected value of the three scenarios.

SECTOR WEIGHTS:
Tech hardware:       PE 25%, EV/EBITDA 40%, DCF 35%
Fintech pre-revenue: PE 15%, EV/EBITDA 25%, DCF 60%
Consumer staples:    PE 45%, EV/EBITDA 35%, DCF 20%
Gunn compounder EM:  PE 20%, EV/EBITDA 30%, DCF 50%
Default Valentine:   PE 40%, EV/EBITDA 35%, DCF 25%

════════════════════════════════════════════
STEP 8 — MARGIN OF SAFETY
════════════════════════════════════════════
Calculate the margin of safety relative to the current price:
- How much upside is there to pt_12m? And to the Bear case?
- What is the catalyst that could trigger a re-rating?
- When could that catalyst materialize?
→ Capture in: margin_of_safety (1–2 paragraphs with the numbers and key catalyst)

════════════════════════════════════════════
FINAL — VALUATION SUMMARY
════════════════════════════════════════════
Synthesize the 8 steps in an investment memo paragraph. Include current price,
estimated intrinsic value range, and a clear judgment on whether the stock is attractive.
Maximum 200 words.
→ Capture in: valuation_summary

════════════════════════════════════════════
ADDITIONAL RULES
════════════════════════════════════════════
FORENSIC ADJUSTMENTS: apply eps_haircut_total to EPS, add dr_add_bps_total to WACC.
If recommendation = BLOCK → rating = "UNDERPERFORM" forced.

DIVERGENCE > 30%: use conservative bound (BUY=lower, SELL=upper), conf_adj -= 0.08.

FaVeS (1–9 total):
F Frequency:   catalyst 2–4x/year → 1–3 pts
V Visibility:  pre-announced      → 1–3 pts
S Significance: eps_impact > 5%   → 1–3 pts

If RR < 2:1 or gap < 5%: rating = "UNDERPERFORM", rr_ratio < 2.

IC PREMIUM (Gunn, 0–1.5): based on mgmt_trust + build_to_last + moat.

Always return valid JSON with this exact structure (use real values, not these):
{
  "pt_12m": 148,
  "pt_5y": null,
  "rating": "BUY",
  "rr_ratio": 2.4,
  "faves_score": { "frequency": 2, "visibility": 2, "significance": 3, "total": 7 },
  "ic_premium": null,
  "conf_adj": -0.05,
  "valuation_exec_summary": "The market values NVDA primarily by EV/EBITDA given the capital-intensive nature of its semiconductor business...",
  "current_multiples": "P/E NTM: 34x · EV/EBITDA: 28x · P/FCF: 38x · P/S: 18x. The most relevant multiple for this sector is EV/EBITDA because...",
  "market_assumptions": "Implicit bearish case: the current price discounts ~12% YoY revenue growth with stable EBITDA margins at 55%... Implicit neutral case: assumes gross margin expansion toward 67%... Implicit bullish case: would require hyperscaler capex acceleration...",
  "peer_comparison": "AMD: EV/EBITDA 22x, P/E 28x · Intel: EV/EBITDA 8x, P/E 15x · TSMC: EV/EBITDA 18x, P/E 22x. NVDA trades at a 35% premium vs peers, justified by its dominance in AI GPUs...",
  "margin_of_safety": "The pt_12m of $148 implies 28% upside from the current price of $115. The Bear scenario at $95 represents 17% downside, resulting in an RR of 2.4:1...",
  "valuation_summary": "NVDA trades at 34x P/E NTM and 28x EV/EBITDA, with a 35% premium vs peers reflecting its dominant position in AI accelerators. The current price of $115 discounts a neutral scenario with sustained growth but does not fully incorporate the upside from new architectures..."
}
`.trim();

const JSON_SCHEMA = {
  type: "object",
  properties: {
    pt_12m:   { type: "number" },
    pt_5y:    { type: ["number","null"] },
    rating:   { type: "string", enum: ["BUY","HOLD","UNDERPERFORM"] },
    rr_ratio: { type: "number" },
    faves_score: {
      type: "object",
      properties: {
        frequency:    { type: "number" },
        visibility:   { type: "number" },
        significance: { type: "number" },
        total:        { type: "number" },
      },
      required: ["frequency","visibility","significance","total"],
      additionalProperties: false,
    },
    ic_premium:           { type: ["number","null"] },
    conf_adj:             { type: "number" },
    valuation_exec_summary: { type: "string" },
    current_multiples:    { type: "string" },
    market_assumptions:   { type: "string" },
    peer_comparison:      { type: "string" },
    margin_of_safety:     { type: "string" },
    valuation_summary:    { type: "string" },
  },
  required: [
    "pt_12m","pt_5y","rating","rr_ratio","faves_score","ic_premium","conf_adj",
    "valuation_exec_summary","current_multiples","market_assumptions",
    "peer_comparison","margin_of_safety","valuation_summary",
  ],
  additionalProperties: false,
};

export async function runValuation(input: ValuationInput): Promise<ValuationModel> {
  const { ticker, forensic_profile, cf_scenarios, intel_bundle, build_to_last_score, downstream_mode } = input;

  const userMessage = `
Ticker: ${ticker}
DOWNSTREAM MODE: ${downstream_mode}

FORENSIC:
eps_haircut_total:  ${forensic_profile.eps_haircut_total}%
dr_add_bps_total:   ${forensic_profile.dr_add_bps_total} bps
mgmt_trust_score:   ${forensic_profile.mgmt_trust_score}
recommendation:     ${forensic_profile.recommendation}

CF SCENARIOS:
${cf_scenarios.map((s) => `${s.type}: prob=${s.probability.toFixed(2)}, implied_pt=${s.implied_pt} | math: ${s.price_derivation} | triggers: ${s.triggers}`).join("\n")}

mgmt_comm_score: ${intel_bundle.mgmt_comm_score}
business_memo: ${intel_bundle.business_context?.business_memo ?? "N/A"}
${build_to_last_score ? `BUILD-TO-LAST: management=${build_to_last_score.management}, tam=${build_to_last_score.tam}, moat=${build_to_last_score.moat}` : "No Gunn mode — pt_5y and ic_premium = null."}

Run the 8 valuation steps. Apply Forensic adjustments. Calculate pt_12m, rating, rr_ratio, and FaVeS.
Complete all JSON fields including valuation_exec_summary, current_multiples,
market_assumptions, peer_comparison, margin_of_safety, and valuation_summary.
`.trim();

  const text = await chat({
    model:       MODELS.opus,
    system:      SYSTEM_PROMPT,
    user:        userMessage,
    temperature: 0.2,
    max_tokens:  4096,
    json_mode:   true,
  });

  return JSON.parse(extractJSON(text)) as ValuationModel;
}
