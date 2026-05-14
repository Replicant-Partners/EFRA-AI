-- Evaluator Registry — Paso 2 of the Social Agent Observability Platform
--
-- Plane B in the logical architecture:
--   EvalRun     = one registry run per analysis (aggregated result)
--   EvalSignal  = one row per evaluator × dimension within that run
--
-- Three evaluators run on every completed analysis:
--   1. argument_quality      — how well-structured and supported is the thesis?
--   2. scenario_coherence    — are Bull/Base/Bear internally consistent?
--   3. probability_calibration — are the scenario probabilities well-calibrated?
--
-- Each evaluator is an LLM-as-judge that scores 0.0–1.0 with a confidence value.
-- The Aggregator computes confidence-weighted means per dimension and surfaces
-- inter-evaluator conflicts (same dimension, score spread > 0.3).

CREATE TABLE "EvalRun" (
    "id"                  TEXT NOT NULL,
    "analysis_id"         TEXT NOT NULL,
    "ticker"              TEXT NOT NULL,
    "analyst_id"          TEXT NOT NULL,

    -- Aggregated signal: confidence-weighted mean per dimension (stored as JSONB)
    -- Shape: { argument_quality: float, scenario_coherence: float, probability_calibration: float }
    "aggregated_signal"   JSONB NOT NULL DEFAULT '{}',

    -- Overall quality score: simple mean of the three dimension means
    "overall_score"       DOUBLE PRECISION,

    -- Was the run blocked by the pre-filter? (future: WildGuard / safety checks)
    "prefilter_blocked"   BOOLEAN NOT NULL DEFAULT false,

    -- Conflict flags: list of dimensions where evaluators disagreed (spread > 0.3)
    "conflict_flags"      TEXT[] NOT NULL DEFAULT '{}',

    "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvalRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EvalSignal" (
    "id"              TEXT NOT NULL,
    "eval_run_id"     TEXT NOT NULL,
    "analysis_id"     TEXT NOT NULL,

    -- Which evaluator produced this signal
    "evaluator_name"  TEXT NOT NULL,   -- "argument_quality" | "scenario_coherence" | "probability_calibration"

    -- Which behavioral dimension this signal belongs to
    "dimension"       TEXT NOT NULL,   -- matches evaluator_name for now (1:1 in v1)

    -- Score and confidence from the LLM judge
    "score"           DOUBLE PRECISION NOT NULL,       -- 0.0–1.0
    "confidence"      DOUBLE PRECISION NOT NULL,       -- 0.0–1.0
    "rationale"       TEXT,                            -- 1-2 sentence justification from the judge

    -- Raw LLM response for auditability
    "raw_response"    JSONB,

    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvalSignal_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "EvalRun"
    ADD CONSTRAINT "EvalRun_analysis_id_fkey"
    FOREIGN KEY ("analysis_id")
    REFERENCES "Analysis"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EvalSignal"
    ADD CONSTRAINT "EvalSignal_eval_run_id_fkey"
    FOREIGN KEY ("eval_run_id")
    REFERENCES "EvalRun"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EvalSignal"
    ADD CONSTRAINT "EvalSignal_analysis_id_fkey"
    FOREIGN KEY ("analysis_id")
    REFERENCES "Analysis"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "EvalRun_analysis_id_idx"     ON "EvalRun"("analysis_id");
CREATE INDEX "EvalRun_ticker_idx"          ON "EvalRun"("ticker");
CREATE INDEX "EvalRun_created_at_idx"      ON "EvalRun"("created_at");
CREATE INDEX "EvalSignal_eval_run_id_idx"  ON "EvalSignal"("eval_run_id");
CREATE INDEX "EvalSignal_analysis_id_idx"  ON "EvalSignal"("analysis_id");
CREATE INDEX "EvalSignal_evaluator_idx"    ON "EvalSignal"("evaluator_name");
CREATE INDEX "EvalSignal_dimension_idx"    ON "EvalSignal"("dimension");
