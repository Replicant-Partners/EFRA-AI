/**
 * Intervention Encoder
 * Plane D · Human Interface
 *
 * Validates and stamps a reviewer's intervention request before it
 * reaches the Coherence Gate. Mirrors §3 of the architecture doc:
 *
 *   "Validates: agent_wide requires classification + correction_text
 *    Stamps: authority_weight=1.0, provenance=HumanCorrected
 *    Sets: gate_is_synchronous = (scope == AgentWide)"
 *
 * Three scopes:
 *   episode    — corrects a single agent output in one analysis
 *   dyad       — corrects a pattern across analyses by the same analyst
 *   agent_wide — corrects the pipeline globally (requires stronger gate)
 *
 * Four classifications:
 *   factual_error       — the agent stated something demonstrably wrong
 *   reasoning_gap       — the agent's logic chain had a missing step
 *   calibration_bias    — probabilities or scores are systematically off
 *   style_issue         — output format/tone needs adjustment (low authority)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type InterventionScope          = "episode" | "dyad" | "agent_wide";
export type InterventionClassification =
  | "factual_error"
  | "reasoning_gap"
  | "calibration_bias"
  | "style_issue";

export interface InterventionRequest {
  // What anomaly triggered this intervention
  anomaly_event_id: string;

  // Which episode is being corrected
  episode_id:       string;

  // Who is reviewing
  reviewer_id:      string;

  // Scope of correction
  scope:            InterventionScope;

  // Classification of the error
  classification:   InterventionClassification;

  // The corrected text / explanation
  correction_text:  string;

  // Which evaluator dimension is being corrected (optional)
  dimension?:       string;

  // Justification for the correction (used by coherence gate)
  justification?:   string;
}

export interface EncodedIntervention extends InterventionRequest {
  // Stamped by encoder
  authority_weight:      number;    // always 1.0
  provenance:            "human_corrected";
  gate_is_synchronous:   boolean;   // true for agent_wide scope
  encoded_at:            string;    // ISO timestamp
}

// ─── Validation rules ─────────────────────────────────────────────────────────

const CLASSIFICATION_AUTHORITY: Record<InterventionClassification, number> = {
  factual_error:    1.0,
  reasoning_gap:    1.0,
  calibration_bias: 1.0,
  style_issue:      0.8,  // style issues carry slightly lower weight
};

export class InterventionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InterventionValidationError";
  }
}

// ─── Encoder ─────────────────────────────────────────────────────────────────

export function encodeIntervention(req: InterventionRequest): EncodedIntervention {
  // Validate required fields
  if (!req.anomaly_event_id?.trim()) {
    throw new InterventionValidationError("anomaly_event_id is required");
  }
  if (!req.episode_id?.trim()) {
    throw new InterventionValidationError("episode_id is required");
  }
  if (!req.reviewer_id?.trim()) {
    throw new InterventionValidationError("reviewer_id is required");
  }
  if (!req.correction_text?.trim()) {
    throw new InterventionValidationError("correction_text is required");
  }
  if (req.correction_text.trim().length < 20) {
    throw new InterventionValidationError(
      "correction_text must be at least 20 characters — provide a meaningful correction"
    );
  }

  // agent_wide scope requires classification and justification
  if (req.scope === "agent_wide") {
    if (!req.justification?.trim()) {
      throw new InterventionValidationError(
        "agent_wide interventions require a justification explaining the systemic impact"
      );
    }
    if (req.classification === "style_issue") {
      throw new InterventionValidationError(
        "agent_wide interventions cannot be classified as style_issue — use a substantive classification"
      );
    }
  }

  const authority_weight = CLASSIFICATION_AUTHORITY[req.classification];

  return {
    ...req,
    correction_text:     req.correction_text.trim(),
    justification:       req.justification?.trim(),
    authority_weight,
    provenance:          "human_corrected",
    gate_is_synchronous: req.scope === "agent_wide",
    encoded_at:          new Date().toISOString(),
  };
}
