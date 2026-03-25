import { chat, MODELS, extractJSON } from "../../shared/client.js";
import type { IntelInput, IntelBundle } from "../../shared/types.js";

const SYSTEM_PROMPT = `
IMPORTANT: Respond ONLY with a valid JSON object. Do not add text, headers, or explanations before or after the JSON.

You are INTEL, Agent 02 of the Efrain AI system.
Role: information_hub

You have two tasks in sequence:

════════════════════════════════════════════
TASK A — BUSINESS ANALYSIS (8 steps)
════════════════════════════════════════════

Before processing news, analyze the business using this internal framework.
The final result is captured in the "business_context" JSON field.

STEP 0 — EXECUTIVE SUMMARY
"What does this company do, how does it make money, and why does it matter in its industry?"
Write as if explaining to an intelligent person who has never heard of it.
No bullets. No financial jargon. Maximum 3 paragraphs.
→ Capture in: executive_summary

STEP 1 — IDENTITY
What products/services does it offer? In which industry? What are its revenue segments?

STEP 2 — GEOGRAPHY & MARKETS
In which countries does it operate? How is revenue distributed across markets?

STEP 3 — BUSINESS MODEL
How does it make money? Classify: recurring, cyclical, or transactional. Why?

STEP 4 — COMPETITIVE ADVANTAGE
What is the moat? Classify: brand / costs / network / regulation / other.
Justify with concrete evidence.
→ Capture in: moat_type + moat_evidence

STEP 5 — COMPETITIVE POSITIONING
Who are its competitors? How does it differentiate on price, quality, or distribution?

STEP 6 — CUSTOMERS & CHANNELS
Who are its customers? Is there customer concentration risk?

STEP 7 — GROWTH HISTORY
Is the revenue trajectory organic or inorganic? Consistent over 3–5 years?
→ Capture in: growth_trend (1 qualitative sentence)

STEP 8 — CATALYST
With all the context, what is the most recent event that could change future performance?
Is it credible? Is it already priced in?
→ Capture in: catalyst_assessment

FINAL — BUSINESS MEMO
Synthesize the 8 steps in an investment memo paragraph. Maximum 200 words.
No bullets. Direct and professional language.
→ Capture in: business_memo

════════════════════════════════════════════
TASK B — NEWS PROCESSING
════════════════════════════════════════════

NEWS SCORING (0–100):
- keyword_relevance:  0–25
- eps_impact:         0–30
- source_quality:     0–25
- timeliness:         0–20

Only news with score >= 40 passes into the bundle (surfaced).

MNPI: If you detect material non-public information → mosaic_clear = false.

Assign the "source" field to each news item based on its origin:
- "news_api"   → articles from Bloomberg, Reuters, The Information, Axios, etc.
- "edgar_sec"  → 8-K, 10-K, 10-Q, DEF 14A or other SEC/EDGAR filings
- "crm"        → signals from CRM contacts

For each surfaced news item, write a "summary" of 1 sentence explaining why
it matters for the investment thesis (what changes, confirms, or contradicts it).

Finally, write an "analyst_briefing" of 3–4 sentences with the most important
synthesis the analyst needs to know: key catalysts, emerging risks,
and which hypotheses remain validated or open.

════════════════════════════════════════════
OUTPUT JSON — exact structure:
════════════════════════════════════════════
{
  "business_context": {
    "executive_summary": "Paragraph 1. Paragraph 2. Paragraph 3.",
    "moat_type": "costs",
    "moat_evidence": "Concrete evidence justifying the moat.",
    "growth_trend": "Consistent organic growth of 18% CAGR over 5 years.",
    "catalyst_assessment": "The product X launch in Q3 is not priced in; consensus ignores it.",
    "business_memo": "Paragraph of maximum 200 words in investment memo style."
  },
  "surfaced_count": 0,
  "suppressed_count": 0,
  "mosaic_clear": true,
  "news_items": [{ "id": "", "headline": "", "source": "news_api", "source_tier": 1, "score": 0, "published_at": "", "summary": "" }],
  "hypotheses": [{ "id": "", "statement": "", "lifecycle": "PENDING", "crm_contact_id": null }],
  "mgmt_comm_score": 0,
  "analyst_briefing": ""
}
`.trim();

const JSON_SCHEMA = {
  type: "object",
  properties: {
    business_context: {
      type: "object",
      properties: {
        executive_summary:    { type: "string" },
        moat_type:            { type: "string" },
        moat_evidence:        { type: "string" },
        growth_trend:         { type: "string" },
        catalyst_assessment:  { type: "string" },
        business_memo:        { type: "string" },
      },
      required: ["executive_summary","moat_type","moat_evidence","growth_trend","catalyst_assessment","business_memo"],
      additionalProperties: false,
    },
    surfaced_count:   { type: "number" },
    suppressed_count: { type: "number" },
    mosaic_clear:     { type: "boolean" },
    news_items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id:          { type: "string" },
          headline:    { type: "string" },
          source:      { type: "string", enum: ["news_api", "edgar_sec", "crm"] },
          source_tier: { type: "number", enum: [1, 2] },
          score:       { type: "number" },
          published_at:{ type: "string" },
          summary:     { type: "string" },
        },
        required: ["id","headline","source","source_tier","score","published_at","summary"],
        additionalProperties: false,
      },
    },
    hypotheses: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id:             { type: "string" },
          statement:      { type: "string" },
          lifecycle:      { type: "string" },
          crm_contact_id: { type: ["string","null"] },
        },
        required: ["id","statement","lifecycle","crm_contact_id"],
        additionalProperties: false,
      },
    },
    mgmt_comm_score:  { type: "number" },
    analyst_briefing: { type: "string" },
  },
  required: [
    "business_context",
    "surfaced_count","suppressed_count","mosaic_clear",
    "news_items","hypotheses","mgmt_comm_score","analyst_briefing",
  ],
  additionalProperties: false,
};

export async function runIntel(
  input: IntelInput,
  rawNewsPool: string[],
): Promise<IntelBundle> {
  const userMessage = `
Ticker:          ${input.ticker}
Idea ID:         ${input.idea_id}
Horizon tag:     ${input.horizon_tag}
Downstream mode: ${input.downstream_mode}

RAW NEWS POOL (${rawNewsPool.length} items):
${rawNewsPool.map((n, i) => `[${i + 1}] ${n}`).join("\n")}

Execute both tasks (A: business analysis, B: news processing)
and return the complete JSON.
`.trim();

  const text = await chat({
    model:       MODELS.sonnet,
    system:      SYSTEM_PROMPT,
    user:        userMessage,
    temperature: 0.1,
    max_tokens:  4096,
    json_mode:   true,
  });

  const bundle = JSON.parse(extractJSON(text)) as IntelBundle;

  if (!bundle.mosaic_clear) {
    console.error("[INTEL] COMPLIANCE HALT — MNPI detected.");
  }

  return bundle;
}
