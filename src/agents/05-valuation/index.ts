import { chat, MODELS } from "../../shared/client.js";
import type { ValuationInput, ValuationModel } from "../../shared/types.js";

const SYSTEM_PROMPT = `
Eres VALUATION, el Agente 05 del sistema Efrain AI.
Rol: price_target_engine

Calculas price targets usando PE, EV/EBITDA y DCF ponderados por sector.

PESOS POR SECTOR:
Tech hardware:       PE 25%, EV/EBITDA 40%, DCF 35%
Fintech pre-revenue: PE 15%, EV/EBITDA 25%, DCF 60%
Consumer staples:    PE 45%, EV/EBITDA 35%, DCF 20%
Gunn compounder EM:  PE 20%, EV/EBITDA 30%, DCF 50%
Default Valentine:   PE 40%, EV/EBITDA 35%, DCF 25%

AJUSTES FORENSIC: aplica eps_haircut_total al EPS, suma dr_add_bps_total al WACC.
Si recommendation = BLOCK → rating = "UNDERPERFORM" forzado.

DIVERGENCIA > 30%: usar bound conservador (BUY=lower, SELL=upper), conf_adj -= 0.08.

FaVeS (1–9 total):
F Frequency:   catalyst 2–4x/año → 1–3 pts
V Visibility:  pre-announced     → 1–3 pts
S Significance: eps_impact > 5%  → 1–3 pts

Si RR < 2:1 o gap < 5%: rating = "UNDERPERFORM", rr_ratio < 2.

IC PREMIUM (Gunn, 0–1.5): basado en mgmt_trust + build_to_last + moat.

Devuelve SIEMPRE JSON válido:
{
  "pt_12m": 0,
  "pt_5y": 0 | null,
  "rating": "BUY" | "HOLD" | "UNDERPERFORM",
  "rr_ratio": 0,
  "faves_score": { "frequency": 0, "visibility": 0, "significance": 0, "total": 0 },
  "ic_premium": 0 | null,
  "conf_adj": 0
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
    ic_premium: { type: ["number","null"] },
    conf_adj:   { type: "number" },
  },
  required: ["pt_12m","pt_5y","rating","rr_ratio","faves_score","ic_premium","conf_adj"],
  additionalProperties: false,
};

export async function runValuation(input: ValuationInput): Promise<ValuationModel> {
  const { forensic_profile, cf_scenarios, intel_bundle, build_to_last_score, downstream_mode } = input;

  const userMessage = `
DOWNSTREAM MODE: ${downstream_mode}

FORENSIC:
eps_haircut_total:  ${forensic_profile.eps_haircut_total}%
dr_add_bps_total:   ${forensic_profile.dr_add_bps_total} bps
mgmt_trust_score:   ${forensic_profile.mgmt_trust_score}
recommendation:     ${forensic_profile.recommendation}

CF SCENARIOS:
${cf_scenarios.map((s) => `${s.type}: prob=${s.probability.toFixed(2)}, implied_pt=${s.implied_pt}`).join("\n")}

mgmt_comm_score: ${intel_bundle.mgmt_comm_score}
${build_to_last_score ? `BUILD-TO-LAST: management=${build_to_last_score.management}, tam=${build_to_last_score.tam}, moat=${build_to_last_score.moat}` : "No Gunn mode — pt_5y y ic_premium = null."}

Calcula pt_12m, rating, rr_ratio y FaVeS. Aplica ajustes Forensic.
`.trim();

  const text = await chat({
    model:       MODELS.opus,
    system:      SYSTEM_PROMPT,
    user:        userMessage,
    temperature: 0.2,
    max_tokens:  4096,
    thinking:    true,
    json_schema: JSON_SCHEMA,
  });

  return JSON.parse(text) as ValuationModel;
}
