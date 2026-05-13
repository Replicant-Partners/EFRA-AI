-- Episode Store
-- Inspired by the Social Agent Observability Platform logical architecture.
-- Each agent step in each pipeline run produces one Episode.
-- Provenance and authority_weight model epistemic trust: human corrections
-- carry weight 1.0, auto-generated episodes carry 0.5.

CREATE TABLE "Episode" (
    "id"                 TEXT NOT NULL,
    "analysis_id"        TEXT NOT NULL,
    "analyst_id"         TEXT NOT NULL,
    "ticker"             TEXT NOT NULL,
    "agent"              TEXT NOT NULL,
    "query"              TEXT NOT NULL,
    "response"           JSONB NOT NULL,
    "provenance"         TEXT NOT NULL DEFAULT 'auto_pass',
    "authority_weight"   DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "alpha_score"        DOUBLE PRECISION,
    "risk_score"         DOUBLE PRECISION,
    "confidence"         DOUBLE PRECISION,
    "rr_ratio"           DOUBLE PRECISION,
    "enter_score"        DOUBLE PRECISION,
    "process_confidence" DOUBLE PRECISION,
    "lens_verdict"       TEXT,
    "loop_score"         DOUBLE PRECISION,
    "dk_flag"            TEXT,
    "analyst_note"       TEXT,
    "pipeline_version"   INTEGER NOT NULL DEFAULT 1,
    "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

-- Foreign key to Analysis
ALTER TABLE "Episode"
    ADD CONSTRAINT "Episode_analysis_id_fkey"
    FOREIGN KEY ("analysis_id")
    REFERENCES "Analysis"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes for common query patterns
CREATE INDEX "Episode_analysis_id_idx"  ON "Episode"("analysis_id");
CREATE INDEX "Episode_analyst_id_idx"   ON "Episode"("analyst_id");
CREATE INDEX "Episode_ticker_idx"       ON "Episode"("ticker");
CREATE INDEX "Episode_agent_idx"        ON "Episode"("agent");
CREATE INDEX "Episode_provenance_idx"   ON "Episode"("provenance");
CREATE INDEX "Episode_created_at_idx"   ON "Episode"("created_at");
