import { chat, MODELS, extractJSON } from "../../shared/client.js";

export interface CatalogInput {
  ticker:             string;
  intel_item_content: string;
  business_context:   string;
}

export interface CatalogOutput {
  impact_area: "valuation" | "management" | "business";
  sector:      string;
  severity:    "high" | "medium" | "low";
  summary:     string;
}

const SYSTEM_PROMPT = `
IMPORTANT: Respond with ONLY a valid JSON object. No text, no markdown fences before or after the JSON.

You are a classification agent for an investment research system.
Read an analyst insight and classify it precisely.

JSON schema (return exactly these 4 fields):
{
  "impact_area": "valuation" | "management" | "business",
  "sector":      string,
  "severity":    "high" | "medium" | "low",
  "summary":     string
}

Rules:
- impact_area "valuation": affects price target, multiples, earnings estimates, or discount rate
- impact_area "management": relates to leadership quality, incentives, capital allocation, or execution track record
- impact_area "business": relates to competitive position, product differentiation, market structure, or revenue model
- severity "high": material impact on investment thesis — changes conviction or target significantly
- severity "medium": notable factor that adds color but does not break or confirm the thesis
- severity "low": incremental detail, minor supporting or complicating nuance
- sector: derive from ticker + business context; use lowercase with underscores (e.g. "semiconductors", "fintech", "consumer_staples", "healthcare", "energy", "real_estate", "industrials", "telecom", "utilities", "materials", "software")
- summary: max 100 characters, present tense, investment-relevant. E.g.: "Margin compression risk from commodity input costs rising ~300bps YoY"
`.trim();

export async function runCatalog(input: CatalogInput): Promise<CatalogOutput> {
  const userMessage = `
Ticker: ${input.ticker}

Business context:
${input.business_context}

Analyst insight to classify:
"${input.intel_item_content}"

Classify this insight. Return only JSON.
`.trim();

  const text = await chat({
    model:       MODELS.haiku,
    system:      SYSTEM_PROMPT,
    user:        userMessage,
    temperature: 0.1,
    max_tokens:  300,
    json_mode:   true,
  });

  return JSON.parse(extractJSON(text)) as CatalogOutput;
}
