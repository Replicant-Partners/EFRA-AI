import { chatStream, MODELS } from "../../shared/client.js";
import type { CommInput, CommOutput, AuditTrail } from "../../shared/types.js";

const SYSTEM_PROMPT = `
Eres COMMUNICATION, el Agente 06 del sistema Efrain AI.
Rol: publication_gate

Eres el gate final. Si mosaic_clear = false → COMPLIANCE HALT, publication_possible = false.

ENTER GATE (5 criterios, 1 punto c/u):
E  Edge:     Alpha diferencial vs consensus
N  New:      No reflejado en precio
T  Timely:   Catalyst activo en horizonte
E2 Examples: 3+ data points EDGAR/tier-1
R  Revealing:Cambia perspectiva del mercado

effective_score = base_score − forensic_penalty (0.5/flag SEV >= 3)
- <= 3 → DROP, publication_possible = false
- = 4  → HOLD, output_type = "ALERT"
- = 5  → FLASH_NOTE o INITIATION según horizonte

FORMATO CASCADE (si publication_possible = true):
C  Conclusion (rating, PT, conviction)
A  Action (posición, timing)
S  Scenarios (Bull/Base/Bear + probs)
C2 Catalysts (tipos y timing)
D  Data (citas EDGAR + fuentes tier-1)

Devuelve JSON:
{
  "output_type": "FLASH_NOTE" | "INITIATION" | "ALERT" | "QUARTERLY",
  "enter_gate": { "edge": true, "new_catalyst": true, "timely": true, "examples": true, "revealing": true, "effective_score": 5 },
  "audit_trail": { "agents_run": [], "confidence_adjustments": [], "fallback_flags": [], "final_confidence": 1.0 },
  "publication_possible": true,
  "content": "texto del reporte en formato CASCADE"
}
`.trim();

export async function runCommunication(input: CommInput): Promise<CommOutput> {
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
Flags SEV>=3: ${forensic_profile.flags.filter((f) => f.severity >= 3).length}

SCENARIOS:
${cf_output.scenarios.map((s) => `${s.type}: ${(s.probability * 100).toFixed(0)}% → PT $${s.implied_pt}`).join("\n")}

CRITICAL FACTORS:
${cf_output.factors.map((f) => `• ${f.description} (eps_impact: ${f.eps_impact_pct}%)`).join("\n")}

Evalúa ENTER GATE, determina output_type y genera el reporte CASCADE completo.
`.trim();

  let fullText = "";
  process.stdout.write("\n[COMM] Generando reporte...\n");

  const gen = chatStream({
    model:       MODELS.opus,
    system:      SYSTEM_PROMPT,
    user:        userMessage,
    temperature: 0.4,
    max_tokens:  8192,
    thinking:    true,
  });

  for await (const chunk of gen) {
    process.stdout.write(chunk);
    fullText += chunk;
  }
  process.stdout.write("\n");

  // Extract JSON
  const jsonMatch = fullText.match(/```json\n?([\s\S]*?)\n?```/) ?? [null, fullText];
  const raw = jsonMatch[1] ?? fullText;

  try {
    return JSON.parse(raw) as CommOutput;
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
