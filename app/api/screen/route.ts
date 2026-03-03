import { chat, MODELS } from "@/src/shared/client";

export const maxDuration = 60;

const SYSTEM_PROMPT = `
You are the Excellence Universe Screener for Efrain AI — a multi-agent equity research system.

Your task: given a set of quantitative screening criteria (based on the Excellence Universe S1–S11 framework),
identify real publicly traded companies that are LIKELY to meet those criteria based on your knowledge.

IMPORTANT:
- Return only companies traded on major Western exchanges (NYSE, NASDAQ, LSE, Euronext, ASX, TSX, etc.)
- Respect exchange exclusions strictly
- Be honest: if a company is a high-confidence match, say so; if it's an educated estimate, note it
- Focus on quality: fewer great matches > many weak matches
- For each candidate, explain WHY it likely meets the criteria
- criteria_notes should flag any criterion the company might NOT fully satisfy (as a caveat)
- If sector_focus is specified, limit results to that sector

Respond ONLY with valid JSON in this exact format:
{
  "candidates": [
    {
      "ticker": "NVDA",
      "company_name": "NVIDIA Corporation",
      "market_cap_estimate": "$2.8T",
      "sector": "Technology",
      "exchange": "NASDAQ",
      "rationale": "2-3 sentence explanation of why this company fits the criteria",
      "criteria_notes": "Any caveats about criteria not perfectly met, or empty string"
    }
  ]
}
`.trim();

export async function POST(request: Request) {
  try {
    const criteria = await request.json();

    const excludedExchanges = [
      criteria.exclude_china  && "China (SSE/SZSE/HKEX)",
      criteria.exclude_india  && "India (NSE/BSE)",
      criteria.exclude_saudi  && "Saudi Arabia (Tadawul)",
      criteria.exclude_russia && "Russia (MOEX)",
      criteria.exclude_taiwan && "Taiwan (TWSE)",
      criteria.exclude_korea  && "South Korea (KRX)",
    ].filter(Boolean).join(", ");

    const userMessage = `
Screen the Excellence Universe with these parameters:

EXCHANGE EXCLUSIONS:
${excludedExchanges || "None — all exchanges included"}

QUANTITATIVE CRITERIA:
S4  Min price:                   $${criteria.min_price}
S5  Working Capital / Revenue ≤  ${criteria.working_capital_revenue_max}
S6  Total Debt / Assets ≤        ${criteria.debt_assets_max_pct}%
S7  10Y Gross Margin Stability ≤ ${criteria.gm_stability_max}
S8  Gross Margin range:          ${criteria.gm_min_pct}% – ${criteria.gm_max_pct}%
S9  Gross Profitability ≥        ${criteria.gross_profitability_min_pct}%
S10 Market Cap ≥                 $${criteria.market_cap_min_usd_m}M
S11 Sales Growth (Q vs 5Y avg) ≥ ${criteria.sales_growth_min_pct}%

${criteria.sector_focus ? `SECTOR FOCUS: ${criteria.sector_focus}` : "SECTOR FOCUS: All sectors"}

TARGET: Return ${criteria.max_results} best-fit candidates. Quality over quantity.
`.trim();

    const text = await chat({
      model:       MODELS.sonnet,
      system:      SYSTEM_PROMPT,
      user:        userMessage,
      temperature: 0.3,
      max_tokens:  2048,
      json_mode:   true,
    });

    const parsed = JSON.parse(text) as { candidates: unknown[] };
    return Response.json(parsed);
  } catch (err) {
    return Response.json({ candidates: [], error: String(err) }, { status: 500 });
  }
}
