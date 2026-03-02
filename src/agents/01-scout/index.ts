import { chat, MODELS } from "../../shared/client.js";
import type { ScoutInput, ScoutOutput } from "../../shared/types.js";

const SYSTEM_PROMPT = `
Eres SCOUT, el Agente 01 del sistema Efrain AI.
Rol: coverage_universe_optimizer

Tu tarea es calcular el Alpha Score (0–100) de una idea de inversión y determinar
si debe avanzar al pipeline completo.

SCORING:
- coverage_gap_score:   0–25  (¿existe un gap de cobertura analista?)
- market_cap_fit:       0–20  (¿encaja en el universo de cobertura?)
- sector_relevance:     0–25  (¿relevancia sectorial actual?)
- valuation_anomaly:    0–30  (¿anomalía de valoración observable?)
- gunn_bonus:           +10 por cada Gunn flag confirmado (EM compounder)

DECISIONES:
- total >= 70  → MUST_COVER
- total 65–70  → REVIEW_ZONE
- total < 65   → DROP (rescreen en 90 días)

DOWNSTREAM_MODE:
- 0–1 Gunn flags + catalyst → "valentine" (horizonte SHORT 12M)
- 2+ Gunn flags             → "gunn"     (horizonte COMPOUNDER 5Y)
- 1 Gunn flag + catalyst    → "dual"     (horizonte MEDIUM)

Devuelve SIEMPRE un JSON válido con esta estructura exacta:
{
  "alpha_score": { "coverage_gap_score": 0, "market_cap_fit": 0, "sector_relevance": 0, "valuation_anomaly": 0, "gunn_bonus": 0, "total": 0 },
  "horizon_tag": "SHORT" | "MEDIUM" | "COMPOUNDER",
  "downstream_mode": "valentine" | "gunn" | "dual",
  "decision": "MUST_COVER" | "DROP" | "REVIEW_ZONE",
  "rescreen_eligible_after": "ISO date or null",
  "forensic_pre_result": "PASS" | "CONDITIONAL" | "BLOCK" | null
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
        gunn_bonus:          { type: "number" },
        total:               { type: "number" },
      },
      required: ["coverage_gap_score","market_cap_fit","sector_relevance","valuation_anomaly","gunn_bonus","total"],
      additionalProperties: false,
    },
    horizon_tag:              { type: "string", enum: ["SHORT","MEDIUM","COMPOUNDER"] },
    downstream_mode:          { type: "string", enum: ["valentine","gunn","dual"] },
    decision:                 { type: "string", enum: ["MUST_COVER","DROP","REVIEW_ZONE"] },
    rescreen_eligible_after:  { type: ["string","null"] },
    forensic_pre_result:      { type: ["string","null"], enum: ["PASS","CONDITIONAL","BLOCK",null] },
  },
  required: ["alpha_score","horizon_tag","downstream_mode","decision","rescreen_eligible_after","forensic_pre_result"],
  additionalProperties: false,
};

export async function runScout(input: ScoutInput): Promise<ScoutOutput> {
  const userMessage = `
Evalúa esta idea de inversión:

Ticker:          ${input.ticker}
Analyst ID:      ${input.analyst_id}
Catalyst:        ${input.catalyst}
Idea source tag: ${input.idea_source_tag ?? "N/A"}

Calcula el Alpha Score, determina downstream_mode, horizon_tag y decision.
`.trim();

  const text = await chat({
    model:       MODELS.haiku,
    system:      SYSTEM_PROMPT,
    user:        userMessage,
    temperature: 0.2,
    max_tokens:  1024,
    json_schema: JSON_SCHEMA,
  });

  return JSON.parse(text) as ScoutOutput;
}
