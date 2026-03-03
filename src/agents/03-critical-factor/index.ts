import { chat, MODELS } from "../../shared/client.js";
import type {
  IntelBundle,
  ForensicProfile,
  CFOutput,
  DownstreamMode,
  HorizonTag,
} from "../../shared/types.js";

const SYSTEM_PROMPT = `
Eres CRITICAL FACTOR, el Agente 03 del sistema Efrain AI.
Rol: thesis_engine

Identificas 2–4 factores críticos y generas escenarios Bull/Base/Bear.

UMBRALES EPS:
- Valentine: eps_impact_pct > 5% (relajar a 3% si no hay factores al 5%)
- Gunn:      eps_impact_pct > 4% (relajar a 3%)
- Si no hay factores al 3%: factores vacío, expected_value_pt = 0

GUNN MODE: calcular build_to_last_score (management 0–33, tam 0–33, moat 0–34).

PROBABILIDADES: deben sumar exactamente 1.0.

Devuelve SIEMPRE un JSON válido con esta estructura exacta (usa valores reales, no estos):
{
  "factors": [
    { "id": "cf-1", "description": "H100 GPU shipment cadence vs. hyperscaler capex plans", "eps_impact_pct": 18 },
    { "id": "cf-2", "description": "China export restrictions — ~15% of data center revenue at risk", "eps_impact_pct": 9 }
  ],
  "scenarios": [
    { "type": "Bull", "probability": 0.30, "implied_pt": 185 },
    { "type": "Base", "probability": 0.50, "implied_pt": 148 },
    { "type": "Bear", "probability": 0.20, "implied_pt": 95 }
  ],
  "expected_value_pt": 148,
  "build_to_last_score": null,
  "hypotheses": []
}
`.trim();

export async function runCriticalFactor(
  intel_bundle: IntelBundle,
  forensic_profile: ForensicProfile,
  downstream_mode: DownstreamMode,
  horizon_tag: HorizonTag,
): Promise<CFOutput> {
  const isGunn = downstream_mode !== "valentine";

  const userMessage = `
DOWNSTREAM MODE: ${downstream_mode}
HORIZON TAG:     ${horizon_tag}

INTEL (${intel_bundle.surfaced_count} noticias):
Hipótesis: ${intel_bundle.hypotheses.map((h) => h.statement).join(" | ") || "Ninguna"}
mgmt_comm_score: ${intel_bundle.mgmt_comm_score}

FORENSIC:
risk_score: ${forensic_profile.risk_score}
mgmt_trust_score: ${forensic_profile.mgmt_trust_score}
Flags: ${forensic_profile.flags.map((f) => `SEV-${f.severity}: ${f.description}`).join(", ") || "Ninguno"}

Identifica 2–4 Critical Factors con eps_impact_pct.
Genera escenarios Bull/Base/Bear (probabilidades suman 1.0).
${isGunn ? "Incluye build_to_last_score (Gunn mode)." : "build_to_last_score debe ser null."}
`.trim();

  const text = await chat({
    model:       MODELS.sonnet,
    system:      SYSTEM_PROMPT,
    user:        userMessage,
    temperature: 0.3,
    max_tokens:  2048,
    json_mode:   true,
  });

  // Extract JSON from possible markdown wrapping
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ?? [null, text];
  const output = JSON.parse(jsonMatch[1] ?? text) as CFOutput;

  // Auto-normalize probabilities if needed
  const probSum = output.scenarios.reduce((s, sc) => s + sc.probability, 0);
  const deviation = Math.abs(probSum - 1.0);
  if (deviation > 0.001 && deviation < 0.1) {
    output.scenarios = output.scenarios.map((sc) => ({
      ...sc,
      probability: parseFloat((sc.probability / probSum).toFixed(4)),
    }));
    console.warn(`[CF] Probabilidades auto-normalizadas (desv: ${deviation.toFixed(3)})`);
  }

  return output;
}
