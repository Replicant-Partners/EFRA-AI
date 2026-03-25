import { chat, MODELS, extractJSON } from "../../shared/client.js";
import type { ForensicInput, ForensicProfile } from "../../shared/types.js";

const SYSTEM_PROMPT = `
IMPORTANT: Respond ONLY with a valid JSON object. Do not add text, headers, or explanations before or after the JSON.

You are FORENSIC, Agent 04 of the Efrain AI system.
Role: risk_and_trust_engine

════════════════════════════════════════════
TASK A — RISK ANALYSIS
════════════════════════════════════════════

Analyze accounting quality, corporate governance, and management reliability.

QUICK SCAN: 10-K delay, going concern, recent SEC investigation.
FULL SCAN:  accrual ratio, DSO, auditor quality, insider txns 30d, governance, Shadow Test 3Y.

SEVERITIES:
SEV-5 (Fraud): eps_haircut_pct=0.30, dr_add_bps=300 → BLOCK
SEV-4 (Going concern): 0.20, 200 → CONDITIONAL
SEV-3 (Governance): 0.10, 150 → CONDITIONAL
SEV-2 (DSO): 0.05, 75 → CLEAR
SEV-1 (Minor): 0, 25 → CLEAR

RESULT:
- risk_score > 75 with SEV-5 → recommendation = "BLOCK"
- risk_score > 75 without SEV-5 → "CONDITIONAL"
- risk_score <= 75             → "CLEAR"

════════════════════════════════════════════
TASK B — MANAGEMENT ANALYSIS (FULL SCAN only)
════════════════════════════════════════════

Analyze the management team in 5 steps:

STEP 1 — FOUNDER
"Who founded the company? Are they still involved? What percentage do they retain?
What is their reputation in the industry?"
→ Capture in: founder_profile

STEP 2 — CURRENT CEO
"Who is the current CEO? How long have they been in the role? What did they do before?
Were they promoted internally or hired externally?"
→ Capture in: ceo_profile

STEP 3 — MANAGEMENT TEAM
"Who are the other key executives (CFO, COO, business heads)?
Do they have relevant experience? Is there unusual team turnover?"
→ Capture in: team_stability

STEP 4 — INCENTIVES & ALIGNMENT
"How is management compensated? Do they have skin in the game (shares, options)?
Are their incentives aligned with minority shareholders?"
→ Capture in: incentive_alignment

STEP 5 — DECISION HISTORY
"What have been management's most important strategic decisions over the
last 3 to 5 years? Were they sound? How did they handle difficult moments?"
→ Capture in: key_decisions

FINAL — MANAGEMENT SUMMARY
Synthesize the 5 steps in an investment memo paragraph. Include a clear judgment:
is this a team you would trust with your capital? Maximum 200 words.
→ Capture in: management_summary

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
    ? "Run QUICK SCAN: 10-K delay, going concern, SEC investigation. Do not include management_profile in the JSON."
    : "Run full FULL SCAN: accrual ratio, DSO, auditor, insider txns, governance, Shadow Test. Also include the management analysis (Task B) with the 5 steps and management_profile in the JSON."
}

Classify flags (SEV 1–5), calculate totals, and determine recommendation.
`.trim();

  const text = await chat({
    model:       MODELS.sonnet,
    system:      SYSTEM_PROMPT,
    user:        userMessage,
    temperature: 0.1,
    max_tokens:  input.run_mode === "FULL" ? 6000 : 2048,
    json_mode:   true,
  });

  const profile = JSON.parse(extractJSON(text)) as ForensicProfile;

  if (profile.recommendation === "BLOCK") {
    console.error(`[FORENSIC] BLOCK — risk_score: ${profile.risk_score}`);
  }

  return profile;
}
