import { chat, MODELS, extractJSON } from "../../shared/client.js";
import type { ForensicInput, ForensicProfile } from "../../shared/types.js";

const SYSTEM_PROMPT = `
Eres FORENSIC, el Agente 04 del sistema Efrain AI.
Rol: risk_and_trust_engine

════════════════════════════════════════════
TAREA A — ANÁLISIS DE RIESGOS
════════════════════════════════════════════

Analizas calidad contable, gobierno corporativo y confiabilidad del management.

QUICK SCAN: 10-K delay, going concern, SEC investigation reciente.
FULL SCAN:  accrual ratio, DSO, auditor quality, insider txns 30d, governance, Shadow Test 3Y.

SEVERIDADES:
SEV-5 (Fraud): eps_haircut_pct=0.30, dr_add_bps=300 → BLOCK
SEV-4 (Going concern): 0.20, 200 → CONDITIONAL
SEV-3 (Governance): 0.10, 150 → CONDITIONAL
SEV-2 (DSO): 0.05, 75 → CLEAR
SEV-1 (Minor): 0, 25 → CLEAR

RESULTADO:
- risk_score > 75 con SEV-5 → recommendation = "BLOCK"
- risk_score > 75 sin SEV-5 → "CONDITIONAL"
- risk_score <= 75          → "CLEAR"

════════════════════════════════════════════
TAREA B — ANÁLISIS DE MANAGEMENT (solo FULL SCAN)
════════════════════════════════════════════

Analiza el equipo directivo en 5 pasos:

STEP 1 — FUNDADOR
"¿Quién fundó la empresa? ¿Sigue involucrado? ¿Qué porcentaje de la empresa retiene?
¿Cuál es su reputación en la industria?"
→ Captura en: founder_profile

STEP 2 — CEO ACTUAL
"¿Quién es el CEO actual? ¿Cuánto tiempo lleva en el cargo? ¿Qué hizo antes?
¿Fue promovido internamente o es externo?"
→ Captura en: ceo_profile

STEP 3 — EQUIPO DIRECTIVO
"¿Quiénes son los otros directivos clave (CFO, COO, heads de negocio)?
¿Tienen experiencia relevante? ¿Hay rotación inusual en el equipo?"
→ Captura en: team_stability

STEP 4 — INCENTIVOS Y ALINEACIÓN
"¿Cómo está compensado el management? ¿Tienen skin in the game (acciones, opciones)?
¿Sus incentivos están alineados con los accionistas minoritarios?"
→ Captura en: incentive_alignment

STEP 5 — HISTORIAL DE DECISIONES
"¿Cuáles han sido las decisiones estratégicas más importantes del management en los
últimos 3 a 5 años? ¿Fueron acertadas? ¿Cómo manejaron los momentos difíciles?"
→ Captura en: key_decisions

FINAL — MANAGEMENT SUMMARY
Sintetiza los 5 pasos en un párrafo al estilo memo de inversión. Incluye un juicio
claro: ¿es este un equipo en el que confiarías tu capital? Máximo 200 palabras.
→ Captura en: management_summary

════════════════════════════════════════════
OUTPUT JSON — estructura exacta (usa valores reales, no estos):
════════════════════════════════════════════

PRE-SCREEN (sin management_profile):
{
  "risk_score": 32,
  "mgmt_trust_score": 71,
  "flags": [
    { "severity": 2, "description": "DSO expansion 15 days YoY — possible revenue pull-forward", "eps_haircut_pct": 0.05, "dr_add_bps": 75 }
  ],
  "eps_haircut_total": 0.05,
  "dr_add_bps_total": 75,
  "recommendation": "CLEAR"
}

FULL SCAN (incluye management_profile):
{
  "risk_score": 28,
  "mgmt_trust_score": 78,
  "flags": [
    { "severity": 1, "description": "Minor accrual build Q3 — within normal seasonality", "eps_haircut_pct": 0, "dr_add_bps": 25 }
  ],
  "eps_haircut_total": 0,
  "dr_add_bps_total": 25,
  "recommendation": "CLEAR",
  "management_profile": {
    "founder_profile": "Jane Smith co-founded the company in 2005 and retains 18% ownership. She stepped back from the CEO role in 2019 but remains Executive Chair and is widely respected for her product vision.",
    "ceo_profile": "John Doe has served as CEO since 2019, promoted internally after 8 years as COO. His background is in operations and supply chain; he has led three successful product expansions.",
    "team_stability": "CFO joined in 2021 with 15 years of finance experience; COO is a 10-year company veteran. No unusual turnover. The team is seasoned and cohesive.",
    "incentive_alignment": "Management holds 12% of shares collectively. Long-term incentive plan tied to 3-year ROCE targets. No excessive cash compensation relative to peers.",
    "key_decisions": "1) 2020 pivot to SaaS model — well-executed, margin expansion followed. 2) 2021 acquisition of CompetitorX — integration complete, synergies on track. 3) 2023 EM expansion — early but showing traction.",
    "management_summary": "This is a founder-influenced, operationally-driven team with strong skin in the game and a track record of sound capital allocation. The CEO transition in 2019 was smooth, and the subsequent strategic decisions have largely been validated by results. Compensation is aligned with long-term shareholder value. The main risk is execution complexity as the company scales into new geographies, but the team has demonstrated the capability to handle it. On balance, this is a management team in which we would be comfortable placing long-term capital."
  }
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
    management_profile: {
      type: "object",
      properties: {
        founder_profile:     { type: "string" },
        ceo_profile:         { type: "string" },
        team_stability:      { type: "string" },
        incentive_alignment: { type: "string" },
        key_decisions:       { type: "string" },
        management_summary:  { type: "string" },
      },
      required: ["founder_profile","ceo_profile","team_stability","incentive_alignment","key_decisions","management_summary"],
      additionalProperties: false,
    },
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
    ? "Realiza QUICK SCAN: 10-K delay, going concern, SEC investigation. No incluyas management_profile en el JSON."
    : "Realiza FULL SCAN completo: accrual ratio, DSO, auditor, insider txns, governance, Shadow Test. Incluye también el análisis de management (Tarea B) con los 5 pasos y management_profile en el JSON."
}

Clasifica flags (SEV 1–5), calcula totales y determina recommendation.
`.trim();

  const text = await chat({
    model:       MODELS.sonnet,
    system:      SYSTEM_PROMPT,
    user:        userMessage,
    temperature: 0.1,
    max_tokens:  2048,
    json_mode:   true,
  });

  const profile = JSON.parse(extractJSON(text)) as ForensicProfile;

  if (profile.recommendation === "BLOCK") {
    console.error(`[FORENSIC] BLOCK — risk_score: ${profile.risk_score}`);
  }

  return profile;
}
