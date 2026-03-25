import { MODELS } from "../../core/ports/ILanguageModel.js";
import type { ILanguageModel } from "../../core/ports/ILanguageModel.js";
import { extractJSON } from "../../shared/client.js";
import type {
  IntelBundle,
  ForensicProfile,
  CFOutput,
  DownstreamMode,
  HorizonTag,
} from "../../shared/types.js";

const SYSTEM_PROMPT = `
IMPORTANT: Respond ONLY with a valid JSON object. Do not add text, headers, or explanations before or after the JSON.

You are CRITICAL FACTOR, Agent 03 of the Efrain AI system.
Role: thesis_engine

Identify 2–4 critical factors and generate Bull/Base/Bear scenarios.

EPS THRESHOLDS:
- Valentine: eps_impact_pct > 5% (relax to 3% if no factors reach 5%)
- Gunn:      eps_impact_pct > 4% (relax to 3%)
- If no factors reach 3%: empty factors array, expected_value_pt = 0

GUNN MODE: calculate build_to_last_score (management 0–33, tam 0–33, moat 0–34).

PROBABILITIES: must sum to exactly 1.0.

FOR EACH SCENARIO you must include:
- price_derivation: the mathematical operation that produces the implied_pt.
  Example: "EPS $2.50 × P/E 74x = $185" or "FCF $3.2B × 18x EV/FCF − net debt $12B = $185"
  Be specific with numbers and the multiple/method used.
- triggers: what must happen in the real world for this scenario to materialize.
  1–3 concrete, observable conditions. Example:
  "No GPU export restrictions to China + hyperscaler capex +20% YoY + gross margin >65%"
- narrative: 2–3 sentences describing what happens in this scenario — how the business evolves,
  what drives or deteriorates fundamentals, and what it means for the investor.
- key_assumption: the single most critical assumption underlying this scenario (1 concise sentence).
- invalidation: what event or data point would collapse this scenario and force a PT revision.

Always return a valid JSON with this exact structure (use real values, not these):
{
  "factors": [
    { "id": "cf-1", "description": "H100 GPU shipment cadence vs. hyperscaler capex plans", "eps_impact_pct": 18 },
    { "id": "cf-2", "description": "China export restrictions — ~15% of data center revenue at risk", "eps_impact_pct": 9 }
  ],
  "scenarios": [
    {
      "type": "Bull",
      "probability": 0.30,
      "implied_pt": 185,
      "price_derivation": "EPS $2.50 × P/E 74x = $185",
      "triggers": "No export restrictions to China + hyperscaler capex rises >20% YoY + gross margin exceeds 65%",
      "narrative": "Hyperscalers accelerate AI GPU spending with no signs of moderation. NVDA expands gross margins toward 67% on favorable H100/H200 mix. The market re-rates the multiple upward given backlog visibility.",
      "key_assumption": "The 4 major hyperscalers grow capex >20% YoY and NVDA maintains >80% share in AI accelerators.",
      "invalidation": "Announcement of additional export restrictions to China, or capex moderation signals from Microsoft/Google/Amazon in earnings calls."
    },
    {
      "type": "Base",
      "probability": 0.50,
      "implied_pt": 148,
      "price_derivation": "EPS $2.00 × P/E 74x = $148",
      "triggers": "Partial China restrictions (−10% revenue) + flat hyperscaler capex + stable gross margin at 62%",
      "narrative": "Solid growth but without acceleration: China contributes less due to partial restrictions and hyperscaler capex normalizes. Margins hold but do not expand. The multiple remains stable.",
      "key_assumption": "China restrictions are limited to current chips and do not extend to new architectures.",
      "invalidation": "Gross margin falls below 60% for two consecutive quarters."
    },
    {
      "type": "Bear",
      "probability": 0.20,
      "implied_pt": 95,
      "price_derivation": "EPS $1.50 × P/E 63x = $95",
      "triggers": "Full China export block + AMD gains meaningful share + hyperscaler capex falls >10%",
      "narrative": "China is fully blocked, AMD captures relevant share with MI300X, and hyperscalers moderate capex. The AI cycle enters a digestion phase. The market compresses multiples amid regulatory uncertainty.",
      "key_assumption": "Export regulation extends to all NVDA chips with compute capacity >X TOPS.",
      "invalidation": "AMD fails to scale MI300X production or hyperscalers re-accelerate capex in Q3/Q4."
    }
  ],
  "expected_value_pt": 148,
  "build_to_last_score": null,
  "hypotheses": []
}
`.trim();

export async function runCriticalFactor(
  llm: ILanguageModel,
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
Hypotheses: ${intel_bundle.hypotheses.map((h) => h.statement).join(" | ") || "None"}
mgmt_comm_score: ${intel_bundle.mgmt_comm_score}

FORENSIC:
risk_score: ${forensic_profile.risk_score}
mgmt_trust_score: ${forensic_profile.mgmt_trust_score}
Flags: ${forensic_profile.flags.map((f) => `SEV-${f.severity}: ${f.description}`).join(", ") || "None"}

Identifica 2–4 Critical Factors con eps_impact_pct.
Genera escenarios Bull/Base/Bear (probabilidades suman 1.0).
${isGunn ? "Incluye build_to_last_score (Gunn mode)." : "build_to_last_score debe ser null."}
`.trim();

  const text = await llm.chat({
    model:       MODELS.sonnet,
    system:      SYSTEM_PROMPT,
    user:        userMessage,
    temperature: 0.3,
    max_tokens:  2048,
    json_mode:   true,
  });

  const output = JSON.parse(extractJSON(text)) as CFOutput;

  // Auto-normalize probabilities if needed
  const probSum = output.scenarios.reduce((s, sc) => s + sc.probability, 0);
  const deviation = Math.abs(probSum - 1.0);
  if (deviation > 0.001 && deviation < 0.1) {
    output.scenarios = output.scenarios.map((sc) => ({
      ...sc,
      probability: parseFloat((sc.probability / probSum).toFixed(4)),
    }));
    console.warn(`[CF] Probabilities auto-normalized (deviation: ${deviation.toFixed(3)})`);
  }

  return output;
}
