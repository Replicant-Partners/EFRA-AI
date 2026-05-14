/**
 * Coherence Gate — TEC Settling Engine
 * Plane D · Human Interface
 *
 * Checks whether a proposed correction is coherent with the existing
 * pipeline output before it is written to memory.
 *
 * Inspired by the architecture doc's §3:
 *   "Builds 2-utterance TEC system:
 *    U0 = existing agent response
 *    U1 = proposed correction
 *    Relation: Contradicts(U0, U1)
 *    Runs SettlingEngine → computes Γ(C)"
 *
 * Our implementation: an LLM judge evaluates coherence along 3 principles:
 *
 *   1. Non-contradiction  — does the correction directly contradict
 *                           established facts in the pipeline output?
 *   2. Minimal disruption — is the correction targeted (not a wholesale rewrite)?
 *   3. Epistemic humility — does the correction acknowledge uncertainty where present?
 *
 * Γ(C) is the weighted mean of the 3 principle scores (0.0–1.0).
 * Threshold: Γ(C) >= 0.5 → approved. Γ(C) < 0.5 → blocked.
 *
 * agent_wide scope requires synchronous gate (stricter — blocks if < 0.5).
 * episode/dyad scope: gate runs but warns rather than blocks on low Γ(C).
 */

import { buildLLM } from "../configurator.js";
import type { EncodedIntervention } from "./intervention-encoder.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const GATE_THRESHOLD       = 0.5;   // Γ(C) must be >= this to approve
const AGENT_WIDE_THRESHOLD = 0.65;  // stricter for agent_wide scope

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Tension {
  u0_excerpt:  string;   // excerpt from original agent output
  u1_excerpt:  string;   // excerpt from correction
  description: string;   // why they conflict
}

export interface PrincipleScore {
  principle:   string;
  score:       number;   // 0.0–1.0
  rationale:   string;
}

export interface GateOutcome {
  gamma:             number;             // Γ(C) — overall coherence score
  verdict:           "approved" | "settled" | "blocked";
  principle_scores:  PrincipleScore[];
  tensions:          Tension[];
  minimum_update_set:string[];           // agent outputs that must change if correction applied
  rationale:         string;             // 1-2 sentence summary
}

export class CoherenceGateBlockedError extends Error {
  gamma: number;
  tensions: Tension[];
  constructor(gamma: number, tensions: Tension[]) {
    super(`Coherence gate blocked: Γ(C) = ${gamma.toFixed(3)} < threshold`);
    this.name = "CoherenceGateBlockedError";
    this.gamma = gamma;
    this.tensions = tensions;
  }
}

// ─── System prompt ────────────────────────────────────────────────────────────

const GATE_SYSTEM = `
You are a coherence judge for an AI equity research system.
Your job is to evaluate whether a proposed human correction is coherent
with the existing pipeline output before it is written into memory.

You assess coherence along THREE principles:

1. NON-CONTRADICTION (weight 0.5)
   Does the correction directly contradict established, well-supported facts
   in the pipeline output?
   - Score 1.0: no contradictions — the correction is additive or clarifying
   - Score 0.5: minor tension but not a fundamental contradiction
   - Score 0.0: direct, fundamental contradiction of well-supported facts

2. MINIMAL DISRUPTION (weight 0.3)
   Is the correction targeted at a specific, identifiable problem?
   - Score 1.0: laser-targeted correction of one specific issue
   - Score 0.5: addresses 2-3 related issues coherently
   - Score 0.0: wholesale rewrite that overrides the entire agent output

3. EPISTEMIC HUMILITY (weight 0.2)
   Does the correction appropriately acknowledge uncertainty?
   - Score 1.0: correction is appropriately hedged where evidence is uncertain
   - Score 0.5: correction makes some strong claims but acknowledges key uncertainties
   - Score 0.0: correction claims certainty on inherently uncertain matters

IMPORTANT: Respond with ONLY a valid JSON object:
{
  "principle_scores": [
    { "principle": "non_contradiction", "score": <float>, "rationale": "<1 sentence>" },
    { "principle": "minimal_disruption", "score": <float>, "rationale": "<1 sentence>" },
    { "principle": "epistemic_humility",  "score": <float>, "rationale": "<1 sentence>" }
  ],
  "tensions": [
    { "u0_excerpt": "<excerpt from original>", "u1_excerpt": "<excerpt from correction>", "description": "<why they conflict>" }
  ],
  "minimum_update_set": ["<agent name that would need to update>"],
  "rationale": "<1-2 sentence overall assessment>"
}

If there are no tensions, return an empty array for tensions.
If the correction is additive (adds new insight without contradicting existing output),
return an empty minimum_update_set.
`.trim();

// ─── Gate check ───────────────────────────────────────────────────────────────

export async function checkCoherence(
  encoded:          EncodedIntervention,
  original_episode: { agent: string; query: string; response: object },
): Promise<GateOutcome> {

  const llm = buildLLM();

  const userMessage = `
ORIGINAL AGENT OUTPUT (U0):
Agent: ${original_episode.agent}
Query context: ${original_episode.query}
Response: ${JSON.stringify(original_episode.response, null, 2).slice(0, 2000)}

PROPOSED CORRECTION (U1):
Reviewer: ${encoded.reviewer_id}
Scope: ${encoded.scope}
Classification: ${encoded.classification}
Dimension targeted: ${encoded.dimension ?? "general"}
Correction text: ${encoded.correction_text}
${encoded.justification ? `Justification: ${encoded.justification}` : ""}

Relation: Contradicts(U0, U1) — evaluate coherence of this correction.
Return JSON only.
`.trim();

  const text = await llm.chat({
    model:       "openai/gpt-4.1-mini",
    system:      GATE_SYSTEM,
    user:        userMessage,
    temperature: 0.1,
    max_tokens:  1024,
    json_mode:   true,
  });

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Coherence gate returned no JSON: ${text.slice(0, 200)}`);
  const parsed = JSON.parse(match[0]) as {
    principle_scores?: Array<{ principle: string; score: number; rationale: string }>;
    tensions?:         Tension[];
    minimum_update_set?:string[];
    rationale?:        string;
  };

  const principle_scores: PrincipleScore[] = (parsed.principle_scores ?? []).map(p => ({
    principle: p.principle,
    score:     Math.max(0, Math.min(1, Number(p.score ?? 0))),
    rationale: String(p.rationale ?? ""),
  }));

  // Weighted mean: non_contradiction=0.5, minimal_disruption=0.3, epistemic_humility=0.2
  const WEIGHTS: Record<string, number> = {
    non_contradiction:  0.5,
    minimal_disruption: 0.3,
    epistemic_humility: 0.2,
  };

  let gamma = 0;
  let total_weight = 0;
  for (const ps of principle_scores) {
    const w = WEIGHTS[ps.principle] ?? 0.1;
    gamma += ps.score * w;
    total_weight += w;
  }
  if (total_weight > 0) gamma = gamma / total_weight;
  gamma = Math.round(gamma * 1000) / 1000;

  const threshold = encoded.scope === "agent_wide" ? AGENT_WIDE_THRESHOLD : GATE_THRESHOLD;

  const verdict: GateOutcome["verdict"] =
    gamma >= threshold  ? "approved" :
    gamma >= 0.35       ? "settled"  :
                          "blocked";

  const tensions          = (parsed.tensions ?? []) as Tension[];
  const minimum_update_set= (parsed.minimum_update_set ?? []) as string[];
  const rationale         = String(parsed.rationale ?? "");

  console.log(
    `[CoherenceGate] Γ(C) = ${gamma.toFixed(3)} → ${verdict} ` +
    `(scope: ${encoded.scope}, threshold: ${threshold}) ` +
    `| tensions: ${tensions.length}`
  );

  return { gamma, verdict, principle_scores, tensions, minimum_update_set, rationale };
}
