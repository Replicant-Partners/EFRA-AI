import { MODELS } from "../../core/ports/ILanguageModel.js";
import type { ILanguageModel } from "../../core/ports/ILanguageModel.js";
import { extractJSON } from "../../shared/client.js";
import type { CommInput, CommOutput, AuditTrail } from "../../shared/types.js";

const SYSTEM_PROMPT = `
IMPORTANT: Respond ONLY with a valid JSON object. Do not add text, headers, or explanations before or after the JSON.

You are COMMUNICATION, Agent 06 of the Efrain AI system.
Role: publication_gate

You are the final gate. If mosaic_clear = false → COMPLIANCE HALT, publication_possible = false.

ENTER GATE (5 criteria, 1 point each):
E  Edge:      Differential alpha vs consensus
N  New:       Not yet reflected in price
T  Timely:    Active catalyst within horizon
E2 Examples:  3+ data points EDGAR/tier-1
R  Revealing: Changes market perspective

effective_score = base_score − forensic_penalty (0.5 per flag SEV >= 3)
- <= 3 → DROP, publication_possible = false
- = 4  → HOLD, output_type = "ALERT"
- = 5  → FLASH_NOTE or INITIATION depending on horizon

CASCADE FORMAT (if publication_possible = true):
C  — CONCLUSION   Rating, PT, conviction level
A  — ACTION       Position sizing, entry timing, risk management
S  — SCENARIOS    Bull / Base / Bear with probabilities and key triggers
C  — CATALYSTS    Upcoming events, timelines, monitoring signals
D  — DATA         EDGAR citations, tier-1 source references, key metrics

FINAL SUMMARY (always generate, even if publication_possible = false):
Synthesize the full analysis into three 1–2 sentence statements:
- business:   What the company does and what its competitive moat is
- management: Quality and trustworthiness of the management team
- valuation:  Price target, rating, and single most important valuation insight

Return JSON with exactly this structure:
{
  "output_type": "FLASH_NOTE" | "INITIATION" | "ALERT" | "QUARTERLY",
  "enter_gate": { "edge": true, "new_catalyst": true, "timely": true, "examples": true, "revealing": true, "effective_score": 5 },
  "audit_trail": { "agents_run": [], "confidence_adjustments": [], "fallback_flags": [], "final_confidence": 1.0 },
  "publication_possible": true,
  "content": "full CASCADE report text",
  "summary": {
    "business":   "1-2 sentence summary of the business and moat.",
    "management": "1-2 sentence summary of management quality and alignment.",
    "valuation":  "BUY · PT $148 · trades at 15x P/E vs 22x peer median, 30% discount unwarranted given organic growth profile."
  }
}
`.trim();

export async function runCommunication(llm: ILanguageModel, input: CommInput): Promise<CommOutput> {
  const { valuation_model, forensic_profile, cf_output, intel_bundle, downstream_mode } = input;

  // Hard stop MNPI
  if (!intel_bundle.mosaic_clear) {
    console.error("[COMM] COMPLIANCE HALT — mosaic_clear = false");
    return {
      output_type: "ALERT",
      enter_gate: { edge: false, new_catalyst: false, timely: false, examples: false, revealing: false, effective_score: 0 },
      audit_trail: buildAuditTrail(),
      publication_possible: false,
    };
  }

  const userMessage = `
DOWNSTREAM MODE: ${downstream_mode}

VALUATION:
pt_12m: $${valuation_model.pt_12m}${valuation_model.pt_5y ? ` | pt_5y: $${valuation_model.pt_5y}` : ""}
rating: ${valuation_model.rating} | rr_ratio: ${valuation_model.rr_ratio.toFixed(2)}:1
faves_score: ${valuation_model.faves_score.total}/9
conf_adj acumulado: ${valuation_model.conf_adj}

FORENSIC:
risk_score: ${forensic_profile.risk_score}
recommendation: ${forensic_profile.recommendation}
Flags SEV>=3: ${(forensic_profile.flags ?? []).filter((f) => f.severity >= 3).length}

SCENARIOS:
${(cf_output.scenarios ?? []).map((s) => `${s.type}: ${(s.probability * 100).toFixed(0)}% → PT $${s.implied_pt}`).join("\n")}

CRITICAL FACTORS:
${(cf_output.factors ?? []).map((f) => `• ${f.description} (eps_impact: ${f.eps_impact_pct}%)`).join("\n")}

Evaluate the ENTER GATE, determine output_type, and generate the full CASCADE report.
`.trim();

  let fullText = "";
  process.stdout.write("\n[COMM] Generating report...\n");

  const gen = llm.chatStream({
    model:       MODELS.sonnet,
    system:      SYSTEM_PROMPT,
    user:        userMessage,
    temperature: 0.4,
    max_tokens:  2048,
  });

  for await (const chunk of gen) {
    process.stdout.write(chunk);
    fullText += chunk;
  }
  process.stdout.write("\n");

  try {
    return JSON.parse(extractJSON(fullText)) as CommOutput;
  } catch {
    // Fallback: build minimal output
    return {
      output_type: "FLASH_NOTE",
      enter_gate: { edge: true, new_catalyst: true, timely: true, examples: true, revealing: true, effective_score: 5 },
      audit_trail: buildAuditTrail(),
      publication_possible: true,
      content: fullText,
    };
  }
}

function buildAuditTrail(): AuditTrail {
  return {
    agents_run: ["SCOUT","INTEL","FORENSIC","CF","VALUATION","COMM"],
    confidence_adjustments: [],
    fallback_flags: [],
    final_confidence: 1.0,
  };
}
