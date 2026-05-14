-- Two-Write Memory — Plane D completion
--
-- EpisodeCorrection:
--   Immutable record of what a human reviewer changed and why.
--   Stores the coherence gate outcome (Γ(C) score) and the minimum
--   update set required to make the correction coherent.
--
-- SyntheticEpisode:
--   A high-authority (authority_weight=1.0) Episode created from the
--   correction. Re-injected into the Episode Store so future drift
--   detection weights human corrections more heavily than auto-generated
--   episodes.
--
-- Both tables reference the Episode that was corrected and the
-- AnomalyEvent that triggered the intervention.

CREATE TABLE "EpisodeCorrection" (
    "id"                  TEXT NOT NULL,

    -- Source episode that was corrected
    "episode_id"          TEXT NOT NULL,

    -- Anomaly that triggered the intervention
    "anomaly_event_id"    TEXT NOT NULL,

    -- Who made the correction
    "reviewer_id"         TEXT NOT NULL,

    -- Scope: "episode" | "dyad" | "agent_wide"
    "scope"               TEXT NOT NULL DEFAULT 'episode',

    -- Classification: "factual_error" | "reasoning_gap" | "calibration_bias" | "style_issue"
    "classification"      TEXT NOT NULL,

    -- The correction itself
    "correction_text"     TEXT NOT NULL,

    -- Which dimension the correction targets
    "dimension"           TEXT,

    -- Coherence gate result
    -- gamma: Γ(C) score (0.0–1.0). Must be >= 0.5 to proceed.
    "gamma"               DOUBLE PRECISION NOT NULL,
    "gate_verdict"        TEXT NOT NULL,   -- "approved" | "settled" | "blocked"

    -- Tensions the gate identified (pairs of conflicting statements)
    "tensions"            JSONB NOT NULL DEFAULT '[]',

    -- Minimum update set: the smallest set of agent outputs that must
    -- change to make the correction coherent across the pipeline
    "minimum_update_set"  JSONB NOT NULL DEFAULT '[]',

    -- Authority weight of the resulting synthetic episode
    "authority_weight"    DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EpisodeCorrection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SyntheticEpisode" (
    "id"                  TEXT NOT NULL,

    -- Links back to the correction that created this episode
    "correction_id"       TEXT NOT NULL,

    -- Links to the Analysis this correction is associated with
    "analysis_id"         TEXT NOT NULL,

    -- The corrected response (replaces the original agent output)
    "corrected_response"  JSONB NOT NULL,

    -- Always 1.0 for synthetic episodes — highest epistemic authority
    "authority_weight"    DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    -- Always "synthetic" provenance
    "provenance"          TEXT NOT NULL DEFAULT 'synthetic',

    -- Which agent's output was corrected
    "agent"               TEXT NOT NULL,

    -- The analyst who ran the original pipeline
    "analyst_id"          TEXT NOT NULL,
    "ticker"              TEXT NOT NULL,

    "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyntheticEpisode_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "EpisodeCorrection"
    ADD CONSTRAINT "EpisodeCorrection_episode_id_fkey"
    FOREIGN KEY ("episode_id")
    REFERENCES "Episode"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EpisodeCorrection"
    ADD CONSTRAINT "EpisodeCorrection_anomaly_event_id_fkey"
    FOREIGN KEY ("anomaly_event_id")
    REFERENCES "AnomalyEvent"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SyntheticEpisode"
    ADD CONSTRAINT "SyntheticEpisode_correction_id_fkey"
    FOREIGN KEY ("correction_id")
    REFERENCES "EpisodeCorrection"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SyntheticEpisode"
    ADD CONSTRAINT "SyntheticEpisode_analysis_id_fkey"
    FOREIGN KEY ("analysis_id")
    REFERENCES "Analysis"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "EpisodeCorrection_episode_id_idx"       ON "EpisodeCorrection"("episode_id");
CREATE INDEX "EpisodeCorrection_anomaly_event_id_idx" ON "EpisodeCorrection"("anomaly_event_id");
CREATE INDEX "EpisodeCorrection_reviewer_id_idx"      ON "EpisodeCorrection"("reviewer_id");
CREATE INDEX "EpisodeCorrection_scope_idx"            ON "EpisodeCorrection"("scope");
CREATE INDEX "SyntheticEpisode_correction_id_idx"     ON "SyntheticEpisode"("correction_id");
CREATE INDEX "SyntheticEpisode_analysis_id_idx"       ON "SyntheticEpisode"("analysis_id");
CREATE INDEX "SyntheticEpisode_analyst_id_idx"        ON "SyntheticEpisode"("analyst_id");
CREATE INDEX "SyntheticEpisode_agent_idx"             ON "SyntheticEpisode"("agent");
