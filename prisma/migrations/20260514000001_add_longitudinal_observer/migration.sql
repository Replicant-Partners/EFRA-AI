-- Longitudinal Observer — Plane C of the Social Agent Observability Platform
--
-- TimelineEntry:
--   Denormalized read surface. One row per EvalRun.
--   Stores per-dimension scores, drift norm, and anomaly flags.
--   Primary table for trend analysis and the Background Worker.
--
-- AnomalyEvent:
--   Raised by the Anomaly Detector when the timeline reveals problems.
--   Four kinds: drift | conflict | rupture | safety
--   Feeds into Plane D (HITL Review Queue — future step).
--
-- AgentObservabilityState:
--   One row per analyst. Tracks the last scanned timeline entry so the
--   Background Worker can do incremental two-pass scans efficiently.

-- ─── TimelineEntry ────────────────────────────────────────────────────────────
CREATE TABLE "TimelineEntry" (
    "id"                  TEXT NOT NULL,

    -- Source linkage
    "analysis_id"         TEXT NOT NULL,
    "eval_run_id"         TEXT NOT NULL,
    "analyst_id"          TEXT NOT NULL,
    "ticker"              TEXT NOT NULL,

    -- Per-dimension scores (denormalized from AggregatedSignal for fast reads)
    "dim_scores"          JSONB NOT NULL DEFAULT '{}',
    -- Shape: { argument_quality: float, scenario_coherence: float,
    --          probability_calibration: float, overall: float }

    -- Drift tracking
    -- drift_norm: distance from rolling mean of last N entries (0.0 = no drift)
    -- Computed by the Background Worker in Pass 1
    "drift_norm"          DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    -- Anomaly flags set by the Background Worker
    -- Example values: "drift:anomalous", "conflict:argument_quality",
    --                 "safety:low_overall", "rupture:analyst_123"
    "anomaly_flags"       TEXT[] NOT NULL DEFAULT '{}',

    -- Provenance: where did this timeline entry come from?
    -- "eval_run"    : written inline from EvalRun result (hot path)
    -- "backfill"    : written by Background Worker on first scan
    -- "correction"  : updated by Background Worker after drift computation
    "provenance"          TEXT NOT NULL DEFAULT 'eval_run',

    -- Pipeline version at write time (for cross-version drift detection)
    "pipeline_version"    INTEGER NOT NULL DEFAULT 1,

    -- Has the Background Worker processed this entry?
    "worker_processed"    BOOLEAN NOT NULL DEFAULT false,

    "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimelineEntry_pkey" PRIMARY KEY ("id")
);

-- ─── AnomalyEvent ─────────────────────────────────────────────────────────────
CREATE TABLE "AnomalyEvent" (
    "id"              TEXT NOT NULL,
    "analyst_id"      TEXT NOT NULL,
    "ticker"          TEXT NOT NULL,

    -- Which timeline entry triggered this anomaly
    "timeline_entry_id" TEXT NOT NULL,

    -- Anomaly classification
    -- kind:     "drift" | "conflict" | "rupture" | "safety"
    -- severity: "low" | "medium" | "high" | "critical"
    "kind"            TEXT NOT NULL,
    "severity"        TEXT NOT NULL DEFAULT 'medium',

    -- Free-form payload with context (dimension, score, threshold, etc.)
    "payload"         JSONB NOT NULL DEFAULT '{}',

    -- Does this anomaly need human review? (feeds into Plane D HITL queue)
    "requires_review" BOOLEAN NOT NULL DEFAULT true,

    -- Resolution tracking
    "resolved_at"     TIMESTAMP(3),
    "resolved_by"     TEXT,

    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnomalyEvent_pkey" PRIMARY KEY ("id")
);

-- ─── AgentObservabilityState ──────────────────────────────────────────────────
-- One row per analyst. Used by Background Worker for incremental scanning.
CREATE TABLE "AgentObservabilityState" (
    "id"                      TEXT NOT NULL,
    "analyst_id"              TEXT NOT NULL,

    -- Last timeline entry processed by the Background Worker
    -- NULL = never scanned
    "last_scanned_entry_id"   TEXT,

    -- Counters (updated by Background Worker)
    "total_entries_scanned"   INTEGER NOT NULL DEFAULT 0,
    "total_anomalies_raised"  INTEGER NOT NULL DEFAULT 0,
    "total_analyses"          INTEGER NOT NULL DEFAULT 0,

    -- Rolling stats (updated by Background Worker)
    -- Shape: { argument_quality: float, scenario_coherence: float,
    --          probability_calibration: float, overall: float }
    "rolling_means"           JSONB NOT NULL DEFAULT '{}',

    -- Last Background Worker run
    "last_worker_run_at"      TIMESTAMP(3),

    "created_at"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentObservabilityState_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AgentObservabilityState_analyst_id_key" UNIQUE ("analyst_id")
);

-- ─── Foreign keys ─────────────────────────────────────────────────────────────
ALTER TABLE "TimelineEntry"
    ADD CONSTRAINT "TimelineEntry_analysis_id_fkey"
    FOREIGN KEY ("analysis_id")
    REFERENCES "Analysis"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TimelineEntry"
    ADD CONSTRAINT "TimelineEntry_eval_run_id_fkey"
    FOREIGN KEY ("eval_run_id")
    REFERENCES "EvalRun"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnomalyEvent"
    ADD CONSTRAINT "AnomalyEvent_timeline_entry_id_fkey"
    FOREIGN KEY ("timeline_entry_id")
    REFERENCES "TimelineEntry"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX "TimelineEntry_analysis_id_idx"       ON "TimelineEntry"("analysis_id");
CREATE INDEX "TimelineEntry_eval_run_id_idx"       ON "TimelineEntry"("eval_run_id");
CREATE INDEX "TimelineEntry_analyst_id_idx"        ON "TimelineEntry"("analyst_id");
CREATE INDEX "TimelineEntry_ticker_idx"            ON "TimelineEntry"("ticker");
CREATE INDEX "TimelineEntry_created_at_idx"        ON "TimelineEntry"("created_at");
CREATE INDEX "TimelineEntry_worker_processed_idx"  ON "TimelineEntry"("worker_processed");

CREATE INDEX "AnomalyEvent_analyst_id_idx"         ON "AnomalyEvent"("analyst_id");
CREATE INDEX "AnomalyEvent_ticker_idx"             ON "AnomalyEvent"("ticker");
CREATE INDEX "AnomalyEvent_kind_idx"               ON "AnomalyEvent"("kind");
CREATE INDEX "AnomalyEvent_requires_review_idx"    ON "AnomalyEvent"("requires_review");
CREATE INDEX "AnomalyEvent_resolved_at_idx"        ON "AnomalyEvent"("resolved_at");
CREATE INDEX "AnomalyEvent_timeline_entry_id_idx"  ON "AnomalyEvent"("timeline_entry_id");
