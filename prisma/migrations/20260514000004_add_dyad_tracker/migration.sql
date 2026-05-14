-- Dyad Tracker — Social Tracker (Plane C)
--
-- A Dyad is a (analyst_id, ticker) pair — the longitudinal relationship
-- between an analyst and a specific ticker across all analyses.
--
-- Three relational dimensions (all EWMA, alpha=0.3, range 0.0–1.0):
--
--   rapport      — rating consistency over time.
--                  High rapport = stable BUY/HOLD/UNDERPERFORM across analyses.
--                  Sudden flip = rapport drop. Measures conviction stability.
--
--   trust        — average quality of this analyst's work on this ticker.
--                  Driven by overall_score from EvalRun. High trust = consistently
--                  high-quality analysis. Trust drop = quality rupture.
--
--   reciprocity  — depth of engagement with the ticker.
--                  Driven by: episode_count, mode diversity (valentine/gunn/dual),
--                  and presence of corrections. High = the analyst deeply tracks this.
--
-- DyadEntry:
--   One row per analysis for a dyad — the time series of the dyad state.
--   Allows trend analysis and rupture detection over time.

CREATE TABLE "Dyad" (
    "id"              TEXT NOT NULL,
    "analyst_id"      TEXT NOT NULL,
    "ticker"          TEXT NOT NULL,

    -- EWMA relational state (updated after each analysis)
    "rapport"         DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "trust"           DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "reciprocity"     DOUBLE PRECISION NOT NULL DEFAULT 0.5,

    -- Counters
    "episode_count"   INTEGER NOT NULL DEFAULT 0,
    "buy_count"       INTEGER NOT NULL DEFAULT 0,
    "hold_count"      INTEGER NOT NULL DEFAULT 0,
    "sell_count"      INTEGER NOT NULL DEFAULT 0,
    "correction_count"INTEGER NOT NULL DEFAULT 0,

    -- Mode diversity: how many different modes used (valentine/gunn/dual)
    "modes_used"      TEXT[] NOT NULL DEFAULT '{}',

    -- Last analysis metadata
    "last_rating"     TEXT,
    "last_overall"    DOUBLE PRECISION,
    "last_analysis_id"TEXT,

    -- Rupture tracking
    "rupture_count"   INTEGER NOT NULL DEFAULT 0,
    "last_rupture_at" TIMESTAMP(3),

    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dyad_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Dyad_analyst_ticker_key" UNIQUE ("analyst_id", "ticker")
);

CREATE TABLE "DyadEntry" (
    "id"              TEXT NOT NULL,
    "dyad_id"         TEXT NOT NULL,
    "analysis_id"     TEXT NOT NULL,

    -- Dyad state at this point in time (snapshot)
    "rapport"         DOUBLE PRECISION NOT NULL,
    "trust"           DOUBLE PRECISION NOT NULL,
    "reciprocity"     DOUBLE PRECISION NOT NULL,

    -- What drove the update
    "overall_score"   DOUBLE PRECISION,   -- from EvalRun
    "rating"          TEXT,               -- BUY / HOLD / UNDERPERFORM
    "mode"            TEXT,               -- valentine / gunn / dual

    -- Was a rupture detected at this entry?
    "rupture"         BOOLEAN NOT NULL DEFAULT false,
    "rupture_kind"    TEXT,               -- "trust" | "rapport" | null

    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DyadEntry_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "DyadEntry"
    ADD CONSTRAINT "DyadEntry_dyad_id_fkey"
    FOREIGN KEY ("dyad_id")
    REFERENCES "Dyad"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DyadEntry"
    ADD CONSTRAINT "DyadEntry_analysis_id_fkey"
    FOREIGN KEY ("analysis_id")
    REFERENCES "Analysis"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "Dyad_analyst_id_idx"     ON "Dyad"("analyst_id");
CREATE INDEX "Dyad_ticker_idx"         ON "Dyad"("ticker");
CREATE INDEX "Dyad_trust_idx"          ON "Dyad"("trust");
CREATE INDEX "Dyad_rapport_idx"        ON "Dyad"("rapport");
CREATE INDEX "DyadEntry_dyad_id_idx"   ON "DyadEntry"("dyad_id");
CREATE INDEX "DyadEntry_analysis_id_idx" ON "DyadEntry"("analysis_id");
CREATE INDEX "DyadEntry_created_at_idx"  ON "DyadEntry"("created_at");
