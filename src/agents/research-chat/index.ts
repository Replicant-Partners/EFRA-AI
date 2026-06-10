import { MODELS } from "../../core/ports/ILanguageModel.js";
import type { ILanguageModel } from "../../core/ports/ILanguageModel.js";
import type { ResearchDraftPatch, ResearchSource } from "../../shared/types.js";

// ─── Web Research ──────────────────────────────────────────────────────────────

/**
 * Fetches a URL and returns the plain text of the page (stripped of HTML tags).
 * Used to pull SEC EDGAR filings, IR pages, etc.
 */
async function fetchPage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "EfrainAI-ResearchBot/1.0 (contact@efrain.ai)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    // Strip HTML tags, condense whitespace, limit to 6000 chars
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 6000);
  } catch {
    return "";
  }
}

/**
 * Queries SEC EDGAR full-text search for the ticker.
 * Returns the 3 most recent filing snippets.
 */
async function fetchEdgarFilings(ticker: string): Promise<ResearchSource[]> {
  const sources: ResearchSource[] = [];
  try {
    // EDGAR company search to get CIK
    const searchUrl = `https://efts.sec.gov/LATEST/search-index?q=%22${encodeURIComponent(ticker)}%22&dateRange=custom&startdt=2024-01-01&forms=10-K,10-Q,8-K&hits.hits._source.period_of_report=true`;
    const res = await fetch(searchUrl, {
      headers: { "User-Agent": "EfrainAI-ResearchBot/1.0" },
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const data = await res.json() as { hits?: { hits?: { _source?: { display_names?: string[]; period_of_report?: string; form_type?: string; file_date?: string; entity_name?: string } }[] } };
      const hits = data?.hits?.hits ?? [];
      for (const hit of hits.slice(0, 3)) {
        const src = hit._source;
        if (src) {
          sources.push({
            title: `${src.entity_name ?? ticker} — ${src.form_type ?? "Filing"} (${src.period_of_report ?? src.file_date ?? ""})`,
            url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(ticker)}&type=10-K&dateb=&owner=include&count=5`,
            type: "sec_filing",
            snippet: `${src.form_type} filed ${src.file_date ?? ""}`,
          });
        }
      }
    }
  } catch {
    // silently skip
  }

  // Fallback: direct EDGAR full-text search
  if (sources.length === 0) {
    const url = `https://efts.sec.gov/LATEST/search-index?q=%22${encodeURIComponent(ticker)}%22&forms=10-K&hits.hits.total.value=true`;
    sources.push({
      title: `${ticker} — SEC EDGAR Filings`,
      url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(ticker)}&type=10-K&dateb=&owner=include&count=5`,
      type: "sec_filing",
      snippet: `Latest 10-K filings for ${ticker}`,
    });
    void url; // suppress unused warning
  }

  return sources;
}

/**
 * Fetches a brief content snippet from SEC EDGAR company facts (XBRL data).
 * Returns key financial figures as text context for the LLM.
 */
async function fetchEdgarFacts(ticker: string): Promise<string> {
  try {
    // Get CIK from EDGAR company tickers JSON
    const tickerRes = await fetch("https://www.sec.gov/files/company_tickers.json", {
      headers: { "User-Agent": "EfrainAI-ResearchBot/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!tickerRes.ok) return "";

    const tickerMap = await tickerRes.json() as Record<string, { cik_str: number; ticker: string; title: string }>;
    const entry = Object.values(tickerMap).find(
      e => e.ticker.toLowerCase() === ticker.toLowerCase()
    );
    if (!entry) return "";

    const cik = String(entry.cik_str).padStart(10, "0");
    const factsRes = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, {
      headers: { "User-Agent": "EfrainAI-ResearchBot/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!factsRes.ok) return "";

    const facts = await factsRes.json() as {
      entityName?: string;
      facts?: {
        "us-gaap"?: Record<string, { units?: { USD?: { end?: string; val?: number; form?: string }[] } }>;
      };
    };

    const gaap = facts.facts?.["us-gaap"] ?? {};
    const lines: string[] = [`Company: ${facts.entityName ?? ticker}`];

    const metrics: Record<string, string> = {
      Revenues:             "Revenue",
      RevenueFromContractWithCustomerExcludingAssessedTax: "Revenue",
      NetIncomeLoss:        "Net Income",
      GrossProfit:          "Gross Profit",
      OperatingIncomeLoss:  "Operating Income",
      Assets:               "Total Assets",
      LiabilitiesAndStockholdersEquity: "Total Liabilities + Equity",
      CashAndCashEquivalentsAtCarryingValue: "Cash",
    };

    for (const [key, label] of Object.entries(metrics)) {
      const series = gaap[key]?.units?.USD;
      if (!series) continue;
      // Get most recent annual (10-K) value
      const annual = series
        .filter(v => v.form === "10-K" && v.end && v.val !== undefined)
        .sort((a, b) => (b.end ?? "").localeCompare(a.end ?? ""));
      if (annual[0]) {
        const val = annual[0].val!;
        const formatted = val >= 1e9
          ? `$${(val / 1e9).toFixed(1)}B`
          : val >= 1e6
          ? `$${(val / 1e6).toFixed(0)}M`
          : `$${val.toLocaleString()}`;
        lines.push(`${label} (${annual[0].end?.slice(0, 4) ?? ""}): ${formatted}`);
      }
    }

    return lines.join("\n");
  } catch {
    return "";
  }
}

// ─── System Prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(ticker: string, factsContext: string): string {
  return `
You are a Socratic investment research partner helping an equity analyst build a rigorous investment thesis for ${ticker}.

Your role is collaborative, not directive. You:
1. Ask sharp, focused questions that surface what the analyst hasn't yet articulated
2. Challenge weak assumptions with evidence (cite SEC data when available)
3. Offer your own analysis only when you have grounded data to back it
4. Keep each turn SHORT — 3-5 sentences max, then ONE specific question
5. Alternate between: probing the business model → the moat → the financials → the valuation → the risk

LIVE FINANCIAL DATA (from SEC EDGAR):
${factsContext || "No EDGAR data available — work from analyst's inputs."}

RESEARCH RULES:
- If the analyst states something factually wrong, correct it with a source
- Always distinguish "I believe" (your inference) from "SEC filings show" (fact)
- Never pad with generic investment advice — be specific to ${ticker}
- When you have enough information on a topic, shift to the next dimension
- After 4-6 turns, start weaving the threads into a coherent thesis

DRAFT EXTRACTION:
At the end of EVERY response, output a JSON block wrapped in <draft_patch> tags.
Extract ONLY what has been clearly established in the conversation so far.
Leave fields empty ("") if not yet established. Do NOT invent or hallucinate values.

Example format (always include the tags and valid JSON):
<draft_patch>
{
  "business_summary": "...",
  "moat_type": "network | brand | costs | regulatory | other | ",
  "moat_evidence": "...",
  "management_notes": "...",
  "key_metrics": "...",
  "main_thesis": "...",
  "bull_triggers": "...",
  "base_narrative": "...",
  "bear_risk": "...",
  "invalidation": "...",
  "catalyst": "...",
  "geographic_exposure": "...",
  "economic_domain": "biological | physical | digital | mixed | "
}
</draft_patch>
`.trim();
}

// ─── Chat Turn ─────────────────────────────────────────────────────────────────

export interface ChatTurnInput {
  ticker:   string;
  messages: { role: "user" | "assistant"; content: string }[];
  draft:    ResearchDraftPatch;
}

export interface ChatTurnOutput {
  content:  string;
  sources:  ResearchSource[];
  patch:    ResearchDraftPatch;
}

/**
 * Runs one turn of the Socratic research chat.
 * Returns a streaming-friendly generator that yields text tokens,
 * then resolves with the full output (sources + draft patch).
 */
export async function* runChatTurn(
  llm: ILanguageModel,
  input: ChatTurnInput,
): AsyncGenerator<string, ChatTurnOutput> {
  const { ticker, messages, draft } = input;

  // 1. Fetch live data on first turn or when ticker changes
  const isFirstTurn = messages.filter(m => m.role === "assistant").length === 0;
  let factsContext = "";
  const sources: ResearchSource[] = [];

  if (isFirstTurn) {
    // Parallel fetch: EDGAR facts + filing index
    const [facts, edgarSources] = await Promise.all([
      fetchEdgarFacts(ticker),
      fetchEdgarFilings(ticker),
    ]);
    factsContext = facts;
    sources.push(...edgarSources);
  }

  // 2. Build conversation history for the LLM
  // Strip <draft_patch> blocks from previous assistant messages to keep context clean
  const cleanMessages = messages.map(m => ({
    role: m.role,
    content: m.role === "assistant"
      ? m.content.replace(/<draft_patch>[\s\S]*?<\/draft_patch>/g, "").trim()
      : m.content,
  }));

  // 3. Build user message with current draft context
  const lastUserMsg = cleanMessages[cleanMessages.length - 1];
  const draftSummary = buildDraftSummary(draft);
  const enrichedUser = draftSummary
    ? `${lastUserMsg.content}\n\n[Current research draft state:\n${draftSummary}]`
    : lastUserMsg.content;

  const historyForLLM = [
    ...cleanMessages.slice(0, -1),
    { role: lastUserMsg.role, content: enrichedUser },
  ];

  // 4. Stream the response
  const systemPrompt = buildSystemPrompt(ticker, factsContext);

  // Build user content combining full history
  const userContent = historyForLLM
    .map(m => `[${m.role.toUpperCase()}]: ${m.content}`)
    .join("\n\n");

  let fullText = "";
  const stream = llm.chatStream({
    model:       MODELS.sonnet,
    system:      systemPrompt,
    user:        userContent,
    temperature: 0.5,
    max_tokens:  1500,
  });

  for await (const token of stream) {
    fullText += token;
    yield token;
  }

  // 5. Extract draft patch from the response
  const patch = extractDraftPatch(fullText, draft);

  return { content: fullText, sources, patch };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function buildDraftSummary(draft: ResearchDraftPatch): string {
  const lines: string[] = [];
  if (draft.business_summary)    lines.push(`Business: ${draft.business_summary.slice(0, 120)}`);
  if (draft.moat_type)           lines.push(`Moat: ${draft.moat_type} — ${(draft.moat_evidence ?? "").slice(0, 80)}`);
  if (draft.main_thesis)         lines.push(`Thesis: ${draft.main_thesis.slice(0, 120)}`);
  if (draft.catalyst)            lines.push(`Catalyst: ${draft.catalyst.slice(0, 80)}`);
  if (draft.key_metrics)         lines.push(`Metrics: ${draft.key_metrics.slice(0, 100)}`);
  if (draft.bear_risk)           lines.push(`Bear risk: ${draft.bear_risk.slice(0, 80)}`);
  return lines.join("\n");
}

function extractDraftPatch(text: string, existing: ResearchDraftPatch): ResearchDraftPatch {
  const match = text.match(/<draft_patch>([\s\S]*?)<\/draft_patch>/);
  if (!match) return existing;
  try {
    const raw = JSON.parse(match[1].trim()) as Record<string, string | { headline: string; why: string }[]>;
    const patch: ResearchDraftPatch = { ...existing };

    const stringFields = [
      "business_summary", "moat_type", "moat_evidence", "management_notes",
      "key_metrics", "main_thesis", "bull_triggers", "bull_pt",
      "base_narrative", "base_pt", "bear_risk", "invalidation",
      "catalyst", "geographic_exposure", "economic_domain",
      "ticker", "company_name",
    ] as const;

    for (const field of stringFields) {
      const val = raw[field];
      if (typeof val === "string" && val.trim()) {
        (patch as Record<string, unknown>)[field] = val.trim();
      }
    }

    // Merge news items if present
    if (Array.isArray(raw.news_items) && raw.news_items.length > 0) {
      patch.news_items = raw.news_items as { headline: string; why: string }[];
    }

    return patch;
  } catch {
    return existing;
  }
}

/**
 * Generates the opening message for a new research session.
 * The AI kicks off with a context-aware opening based on any EDGAR data found.
 */
export async function* runOpeningMessage(
  llm: ILanguageModel,
  ticker: string,
): AsyncGenerator<string, ChatTurnOutput> {
  const [factsContext, edgarSources] = await Promise.all([
    fetchEdgarFacts(ticker),
    fetchEdgarFilings(ticker),
  ]);

  const systemPrompt = buildSystemPrompt(ticker, factsContext);
  const userContent = `[USER]: I want to build an investment thesis for ${ticker}.`;

  let fullText = "";
  const stream = llm.chatStream({
    model:       MODELS.sonnet,
    system:      systemPrompt,
    user:        userContent,
    temperature: 0.5,
    max_tokens:  600,
  });

  for await (const token of stream) {
    fullText += token;
    yield token;
  }

  const patch = extractDraftPatch(fullText, { ticker });
  return { content: fullText, sources: edgarSources, patch };
}
