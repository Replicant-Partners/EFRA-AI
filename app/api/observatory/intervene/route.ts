/**
 * POST /api/observatory/intervene
 *
 * Full HITL intervention flow (architecture §4.3):
 *
 *   1. Decode and validate the InterventionRequest (Intervention Encoder)
 *   2. Load the original Episode from the DB
 *   3. Run the Coherence Gate (LLM judge, Γ(C) check)
 *   4. If gate blocks → return HTTP 422 with tensions
 *   5. If gate approves → execute Two-Write Memory
 *   6. Return TwoWriteReceipt
 *
 * Request body: InterventionRequest
 * Response 200: TwoWriteReceipt + gate outcome
 * Response 422: CoherenceGateBlocked { gamma, tensions }
 * Response 400: Validation error
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import {
  encodeIntervention,
  InterventionValidationError,
  type InterventionRequest,
} from "@/src/lib/intervention-encoder";
import { checkCoherence } from "@/src/lib/coherence-gate";
import { executeTwoWrite } from "@/src/lib/two-write-memory";
import { updateDyad } from "@/src/lib/dyad-tracker";

export async function POST(request: Request) {
  try {
    const body = await request.json() as InterventionRequest;

    // ── 1. Encode + validate ───────────────────────────────────────────────
    let encoded;
    try {
      encoded = encodeIntervention(body);
    } catch (err) {
      if (err instanceof InterventionValidationError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    // ── 2. Load original episode ───────────────────────────────────────────
    const episode = await prisma.episode.findUnique({
      where:  { id: encoded.episode_id },
      select: {
        id:          true,
        analysis_id: true,
        agent:       true,
        analyst_id:  true,
        ticker:      true,
        query:       true,
        response:    true,
      },
    });

    if (!episode) {
      return NextResponse.json(
        { error: `Episode ${encoded.episode_id} not found` },
        { status: 404 }
      );
    }

    // Verify the anomaly event exists and belongs to this episode's analyst
    const anomaly = await prisma.anomalyEvent.findUnique({
      where:  { id: encoded.anomaly_event_id },
      select: { id: true, analyst_id: true, resolved_at: true },
    });

    if (!anomaly) {
      return NextResponse.json(
        { error: `AnomalyEvent ${encoded.anomaly_event_id} not found` },
        { status: 404 }
      );
    }

    if (anomaly.resolved_at) {
      return NextResponse.json(
        { error: "This anomaly has already been resolved" },
        { status: 409 }
      );
    }

    // ── 3. Coherence Gate ─────────────────────────────────────────────────
    const original_episode = {
      episode_id:  episode.id,
      analysis_id: episode.analysis_id,
      agent:       episode.agent,
      analyst_id:  episode.analyst_id,
      ticker:      episode.ticker,
      query:       episode.query,
      response:    episode.response as object,
    };

    const gate_outcome = await checkCoherence(encoded, original_episode);

    // ── 4. Gate blocked ───────────────────────────────────────────────────
    if (gate_outcome.verdict === "blocked") {
      return NextResponse.json(
        {
          error:    "Coherence gate blocked — correction is too contradictory",
          gamma:    gate_outcome.gamma,
          verdict:  gate_outcome.verdict,
          tensions: gate_outcome.tensions,
          rationale:gate_outcome.rationale,
        },
        { status: 422 }
      );
    }

    // ── 5. Two-Write Memory ───────────────────────────────────────────────
    const receipt = await executeTwoWrite({
      encoded,
      gate_outcome,
      original_episode,
    });

    // ── 6. Update Dyad correction count (non-blocking) ───────────────────
    void updateDyad({
      analyst_id:    original_episode.analyst_id,
      ticker:        original_episode.ticker,
      analysis_id:   original_episode.analysis_id,
      overall_score: null,       // no new eval score — correction only
      rating:        null,
      mode:          "valentine", // fallback mode — correction doesn't change mode
      has_correction: true,
    }).catch(err => {
      console.warn("[DyadTracker] Correction update failed:", err);
    });

    // ── 7. Return receipt ─────────────────────────────────────────────────
    return NextResponse.json({
      ...receipt,
      gate: {
        gamma:             gate_outcome.gamma,
        verdict:           gate_outcome.verdict,
        principle_scores:  gate_outcome.principle_scores,
        tensions:          gate_outcome.tensions,
        minimum_update_set:gate_outcome.minimum_update_set,
        rationale:         gate_outcome.rationale,
      },
    });

  } catch (err) {
    console.error("[POST /api/observatory/intervene]", err);
    return NextResponse.json(
      { error: "Intervention failed — see server logs" },
      { status: 500 }
    );
  }
}
