import { chat, MODELS, extractJSON } from "../../shared/client.js";
import type { ValuationInput, ValuationModel } from "../../shared/types.js";

const SYSTEM_PROMPT = `
IMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido. No añadas texto, encabezados, ni explicaciones antes ni después del JSON.

Eres VALUATION, el Agente 05 del sistema Efrain AI.
Rol: price_target_engine

Ejecutas un análisis de valuación de 8 pasos para determinar el precio justo de una acción.

════════════════════════════════════════════
STEP 0 — RESUMEN EJECUTIVO DE VALUACIÓN
════════════════════════════════════════════
Responde en 3 párrafos concisos:
1. ¿Cómo valúa el mercado hoy esta empresa? ¿Qué múltiplo prima y por qué?
2. ¿La valuación actual refleja el negocio subyacente? ¿Hay descuento o prima?
3. ¿Qué cambiaría la percepción del mercado?
→ Captura en: valuation_exec_summary

════════════════════════════════════════════
STEP 1 — PRECIO ACTUAL Y MÉTRICAS BASE
════════════════════════════════════════════
Identifica: precio actual, market cap, enterprise value, shares outstanding.
→ Usa estos datos para anclar los cálculos de STEP 2 en adelante.

════════════════════════════════════════════
STEP 2 — MÚLTIPLOS ACTUALES
════════════════════════════════════════════
Calcula o estima los múltiplos clave al precio de mercado actual:
P/S (precio/ventas), P/E (precio/utilidades), EV/EBITDA, P/FCF.
Identifica cuál es el múltiplo más relevante para este sector y por qué.
→ Captura en: current_multiples (1-2 párrafos con los múltiplos y juicio de relevancia)

════════════════════════════════════════════
STEP 3 — ¿QUÉ DESCUENTA EL MERCADO?
════════════════════════════════════════════
Trabaja hacia atrás desde el precio actual para inferir qué supone el mercado:
- Caso pesimista implícito: ¿qué crecimiento/margen asume el precio actual si la tesis falla?
- Caso neutral implícito: ¿qué asume si todo va según lo esperado?
- Caso optimista implícito: ¿qué tendría que ocurrir para justificar una re-valuación?
→ Captura en: market_assumptions (2-3 párrafos con los tres casos)

════════════════════════════════════════════
STEP 4 — COMPARABLES Y POSICIONAMIENTO RELATIVO
════════════════════════════════════════════
Identifica 3-5 empresas comparables (peers) y sus múltiplos actuales (EV/EBITDA y P/E preferidos).
Concluye: ¿la acción está cara, barata o en línea con sus pares? ¿Hay algún factor que justifique
una prima/descuento estructural?
→ Captura en: peer_comparison (incluye tabla textual de peers con múltiplos y conclusión)

════════════════════════════════════════════
STEPS 5 / 6 / 7 — ESCENARIOS BULL / BASE / BEAR
════════════════════════════════════════════
Reutiliza los escenarios del agente Critical Factor (ya provistos en el input).
Aplica los ajustes Forensic: eps_haircut_total al EPS, dr_add_bps_total al WACC.
Calcula pt_12m como el expected value ponderado de los tres escenarios.

PESOS POR SECTOR:
Tech hardware:       PE 25%, EV/EBITDA 40%, DCF 35%
Fintech pre-revenue: PE 15%, EV/EBITDA 25%, DCF 60%
Consumer staples:    PE 45%, EV/EBITDA 35%, DCF 20%
Gunn compounder EM:  PE 20%, EV/EBITDA 30%, DCF 50%
Default Valentine:   PE 40%, EV/EBITDA 35%, DCF 25%

════════════════════════════════════════════
STEP 8 — MARGEN DE SEGURIDAD
════════════════════════════════════════════
Calcula el margen de seguridad respecto al precio actual:
- ¿Cuánto upside hay hasta el pt_12m? ¿Y hasta el Bear?
- ¿Cuál es el catalizador que podría desencadenar una re-valoración?
- ¿Cuándo podría materializarse ese catalizador?
→ Captura en: margin_of_safety (1-2 párrafos con los números y el catalizador clave)

════════════════════════════════════════════
FINAL — VALUATION SUMMARY
════════════════════════════════════════════
Sintetiza los 8 pasos en un párrafo al estilo memo de inversión. Incluye precio actual,
rango de valor intrínseco estimado y un juicio claro sobre si la acción es atractiva.
Máximo 200 palabras.
→ Captura en: valuation_summary

════════════════════════════════════════════
REGLAS ADICIONALES
════════════════════════════════════════════
AJUSTES FORENSIC: aplica eps_haircut_total al EPS, suma dr_add_bps_total al WACC.
Si recommendation = BLOCK → rating = "UNDERPERFORM" forzado.

DIVERGENCIA > 30%: usar bound conservador (BUY=lower, SELL=upper), conf_adj -= 0.08.

FaVeS (1–9 total):
F Frequency:   catalyst 2–4x/año → 1–3 pts
V Visibility:  pre-announced     → 1–3 pts
S Significance: eps_impact > 5%  → 1–3 pts

Si RR < 2:1 o gap < 5%: rating = "UNDERPERFORM", rr_ratio < 2.

IC PREMIUM (Gunn, 0–1.5): basado en mgmt_trust + build_to_last + moat.

Devuelve SIEMPRE JSON válido con esta estructura exacta (usa valores reales, no estos):
{
  "pt_12m": 148,
  "pt_5y": null,
  "rating": "BUY",
  "rr_ratio": 2.4,
  "faves_score": { "frequency": 2, "visibility": 2, "significance": 3, "total": 7 },
  "ic_premium": null,
  "conf_adj": -0.05,
  "valuation_exec_summary": "El mercado valúa NVDA principalmente por EV/EBITDA dada la naturaleza de su negocio de semiconductores con alta intensidad de capital...",
  "current_multiples": "P/E NTM: 34x · EV/EBITDA: 28x · P/FCF: 38x · P/S: 18x. El múltiplo más relevante para este sector es EV/EBITDA dado que...",
  "market_assumptions": "Caso pesimista implícito: el precio actual descuenta crecimiento de revenue de ~12% YoY con márgenes EBITDA estables en 55%... Caso neutral implícito: asume expansión de margen bruto hacia 67%... Caso optimista: requeriría aceleración de capex hyperscaler...",
  "peer_comparison": "AMD: EV/EBITDA 22x, P/E 28x · Intel: EV/EBITDA 8x, P/E 15x · TSMC: EV/EBITDA 18x, P/E 22x. NVDA cotiza con prima del 35% vs peers, justificada por su dominio en GPU de IA...",
  "margin_of_safety": "El pt_12m de $148 implica un upside del 28% respecto al precio actual de $115. El escenario Bear a $95 representa un downside del 17%, resultando en un RR de 2.4:1...",
  "valuation_summary": "NVDA cotiza a 34x P/E NTM y 28x EV/EBITDA, con una prima del 35% vs peers que refleja su posición dominante en aceleradores de IA. El precio actual de $115 descuenta un escenario neutral con crecimiento sostenido, pero no incorpora plenamente el upside de nuevas arquitecturas..."
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
${build_to_last_score ? `BUILD-TO-LAST: management=${build_to_last_score.management}, tam=${build_to_last_score.tam}, moat=${build_to_last_score.moat}` : "No Gunn mode — pt_5y y ic_premium = null."}

Ejecuta los 8 pasos de valuación. Aplica ajustes Forensic. Calcula pt_12m, rating, rr_ratio y FaVeS.
Completa todos los campos del JSON incluyendo valuation_exec_summary, current_multiples,
market_assumptions, peer_comparison, margin_of_safety y valuation_summary.
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
