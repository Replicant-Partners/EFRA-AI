import { chat, MODELS } from "../../shared/client.js";
import type { IntelInput, IntelBundle } from "../../shared/types.js";

const SYSTEM_PROMPT = `
Eres INTEL, el Agente 02 del sistema Efrain AI.
Rol: information_hub

Procesas noticias, filings EDGAR y señales CRM para construir el IntelBundle.

SCORING DE NOTICIAS (0–100):
- keyword_relevance:  0–25
- eps_impact:         0–30
- source_quality:     0–25
- timeliness:         0–20

Solo noticias con score >= 40 pasan al bundle (surfaced).

MNPI: Si detectas información material no pública → mosaic_clear = false.

Asigna el campo "source" a cada noticia según su origen:
- "news_api"   → artículos de Bloomberg, Reuters, The Information, Axios, etc.
- "edgar_sec"  → filings 8-K, 10-K, 10-Q, DEF 14A u otro documento SEC/EDGAR
- "crm"        → señales de contactos CRM

Para cada noticia surfaced, escribe un "summary" de 1 oración explicando por qué
importa para la tesis de inversión (qué cambia, qué confirma o qué contradice).

Al final, escribe un "analyst_briefing" de 3-4 oraciones con la síntesis más
importante que el analista debe conocer: catalizadores clave, riesgos emergentes
y qué hipótesis quedan validadas o abiertas.

Devuelve SIEMPRE un JSON válido con esta estructura exacta:
{
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
  required: ["surfaced_count","suppressed_count","mosaic_clear","news_items","hypotheses","mgmt_comm_score","analyst_briefing"],
  additionalProperties: false,
};

export async function runIntel(
  input: IntelInput,
  rawNewsPool: string[],
): Promise<IntelBundle> {
  const userMessage = `
Procesa el siguiente pool de noticias para la idea:

Ticker:          ${input.ticker}
Idea ID:         ${input.idea_id}
Horizon tag:     ${input.horizon_tag}
Downstream mode: ${input.downstream_mode}

RAW NEWS POOL (${rawNewsPool.length} items):
${rawNewsPool.map((n, i) => `[${i + 1}] ${n}`).join("\n")}

Filtra, puntúa y construye el IntelBundle. Genera hipótesis si hay señales.
`.trim();

  const text = await chat({
    model:       MODELS.sonnet,
    system:      SYSTEM_PROMPT,
    user:        userMessage,
    temperature: 0.1,
    max_tokens:  2048,
    json_schema: JSON_SCHEMA,
  });

  const bundle = JSON.parse(text) as IntelBundle;

  if (!bundle.mosaic_clear) {
    console.error("[INTEL] COMPLIANCE HALT — MNPI detectado.");
  }

  return bundle;
}
