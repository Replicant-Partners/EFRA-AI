import { chat, MODELS, extractJSON } from "../../shared/client.js";
import type { IntelInput, IntelBundle } from "../../shared/types.js";

const SYSTEM_PROMPT = `
Eres INTEL, el Agente 02 del sistema Efrain AI.
Rol: information_hub

Tienes dos tareas en secuencia:

════════════════════════════════════════════
TAREA A — ANÁLISIS DEL NEGOCIO (8 pasos)
════════════════════════════════════════════

Antes de procesar noticias, analiza el negocio usando este framework interno.
El resultado final se captura en el campo "business_context" del JSON.

STEP 0 — RESUMEN EJECUTIVO
"¿Qué hace esta empresa, cómo gana dinero y por qué importa en su industria?"
Escribe como si se lo explicaras a alguien inteligente que nunca ha escuchado de ella.
Sin bullets. Sin jerga financiera. Máximo 3 párrafos.
→ Captura en: executive_summary

STEP 1 — IDENTIDAD
¿Qué productos/servicios ofrece? ¿En qué industria? ¿Cuáles son sus segmentos de ingresos?

STEP 2 — GEOGRAFÍA Y MERCADOS
¿En qué países opera? ¿Cómo se distribuyen los ingresos por mercado?

STEP 3 — MODELO DE NEGOCIO
¿Cómo genera dinero? Clasifica: recurrentes, cíclicos o transaccionales. ¿Por qué?

STEP 4 — VENTAJA COMPETITIVA
¿Cuál es el moat? Clasifica: marca / costos / red / regulación / otra.
Justifica con evidencia concreta.
→ Captura en: moat_type + moat_evidence

STEP 5 — POSICIÓN COMPETITIVA
¿Quiénes son sus competidores? ¿Cómo se diferencia en precio, calidad o distribución?

STEP 6 — CLIENTES Y CANALES
¿Quiénes son sus clientes? ¿Hay concentración de riesgo?

STEP 7 — HISTORIAL DE CRECIMIENTO
¿La trayectoria de ventas es orgánica o inorgánica? ¿Consistente en 3-5 años?
→ Captura en: growth_trend (1 oración cualitativa)

STEP 8 — CATALIZADOR
Con todo el contexto, ¿cuál es el evento más reciente que puede cambiar el desempeño futuro?
¿Es creíble? ¿Ya está descontado en el precio?
→ Captura en: catalyst_assessment

FINAL — BUSINESS MEMO
Sintetiza los 8 pasos en un párrafo estilo memo de inversión. Máximo 200 palabras.
Sin bullets. Lenguaje directo y profesional.
→ Captura en: business_memo

════════════════════════════════════════════
TAREA B — PROCESAMIENTO DE NOTICIAS
════════════════════════════════════════════

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

════════════════════════════════════════════
OUTPUT JSON — estructura exacta:
════════════════════════════════════════════
{
  "business_context": {
    "executive_summary": "Párrafo 1. Párrafo 2. Párrafo 3.",
    "moat_type": "costos",
    "moat_evidence": "Evidencia concreta que justifica el moat.",
    "growth_trend": "Crecimiento orgánico consistente del 18% CAGR en 5 años.",
    "catalyst_assessment": "El lanzamiento del producto X en Q3 no está descontado; consenso lo ignora.",
    "business_memo": "Párrafo de máximo 200 palabras estilo memo de inversión."
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

Ejecuta las dos tareas (A: análisis del negocio, B: procesamiento de noticias)
y devuelve el JSON completo.
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
    console.error("[INTEL] COMPLIANCE HALT — MNPI detectado.");
  }

  return bundle;
}
