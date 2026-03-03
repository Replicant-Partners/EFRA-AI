import { chat, MODELS } from "../../shared/client.js";
import type { ForensicInput, ForensicProfile } from "../../shared/types.js";

const SYSTEM_PROMPT = `
Eres FORENSIC, el Agente 04 del sistema Efrain AI.
Rol: risk_and_trust_engine

Analizas calidad contable, gobierno corporativo y confiabilidad del management.

QUICK SCAN: 10-K delay, going concern, SEC investigation reciente.
FULL SCAN:  accrual ratio, DSO, auditor quality, insider txns 30d, governance, Shadow Test 3Y.

SEVERIDADES:
SEV-5 (Fraud): eps_haircut_pct=30, dr_add_bps=300 → BLOCK
SEV-4 (Going concern): 20, 200 → CONDITIONAL
SEV-3 (Governance): 10, 150 → CONDITIONAL
SEV-2 (DSO): 5, 75 → CLEAR
SEV-1 (Minor): 0, 25 → CLEAR

RESULTADO:
- risk_score > 75 con SEV-5 → recommendation = "BLOCK"
- risk_score > 75 sin SEV-5 → "CONDITIONAL"
- risk_score <= 75          → "CLEAR"

Devuelve SIEMPRE JSON válido:
{
  "risk_score": 0,
  "mgmt_trust_score": 0,
  "flags": [{ "severity": 1, "description": "", "eps_haircut_pct": 0, "dr_add_bps": 0 }],
  "eps_haircut_total": 0,
  "dr_add_bps_total": 0,
  "recommendation": "CLEAR" | "CONDITIONAL" | "BLOCK"
}
`.trim();

const JSON_SCHEMA = {
  type: "object",
  properties: {
    risk_score:        { type: "number" },
    mgmt_trust_score:  { type: "number" },
    flags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity:        { type: "number", enum: [1,2,3,4,5] },
          description:     { type: "string" },
          eps_haircut_pct: { type: "number" },
          dr_add_bps:      { type: "number" },
        },
        required: ["severity","description","eps_haircut_pct","dr_add_bps"],
        additionalProperties: false,
      },
    },
    eps_haircut_total: { type: "number" },
    dr_add_bps_total:  { type: "number" },
    recommendation:    { type: "string", enum: ["BLOCK","CONDITIONAL","CLEAR"] },
  },
  required: ["risk_score","mgmt_trust_score","flags","eps_haircut_total","dr_add_bps_total","recommendation"],
  additionalProperties: false,
};

export async function runForensic(input: ForensicInput): Promise<ForensicProfile> {
  const userMessage = `
Ticker:   ${input.ticker}
Idea ID:  ${input.idea_id}
Run mode: ${input.run_mode}

${
  input.run_mode === "PRE-SCREEN"
    ? "Realiza QUICK SCAN: 10-K delay, going concern, SEC investigation."
    : "Realiza FULL SCAN completo: accrual ratio, DSO, auditor, insider txns, governance, Shadow Test."
}

Clasifica flags (SEV 1–5), calcula totales y determina recommendation.
`.trim();

  const text = await chat({
    model:       MODELS.sonnet,
    system:      SYSTEM_PROMPT,
    user:        userMessage,
    temperature: 0.1,
    max_tokens:  1024,
    json_schema: JSON_SCHEMA,
  });

  const profile = JSON.parse(text) as ForensicProfile;

  if (profile.recommendation === "BLOCK") {
    console.error(`[FORENSIC] BLOCK — risk_score: ${profile.risk_score}`);
  }

  return profile;
}
