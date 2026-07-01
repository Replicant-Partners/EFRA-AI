-- CreateTable
CREATE TABLE "ResearchAnalysis" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "analyst_id" TEXT NOT NULL,
    "moat_source" TEXT,
    "moat_depth" TEXT,
    "trust_score" DOUBLE PRECISION,
    "thesis_quality" TEXT,
    "gorilla_verdict" TEXT,
    "gorilla_total" DOUBLE PRECISION,
    "digital_stage" TEXT,
    "growth_driver" TEXT,
    "imagination_confidence" DOUBLE PRECISION,
    "full_state" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResearchAnalysis_ticker_idx" ON "ResearchAnalysis"("ticker");

-- CreateIndex
CREATE INDEX "ResearchAnalysis_analyst_id_idx" ON "ResearchAnalysis"("analyst_id");

-- CreateIndex
CREATE INDEX "ResearchAnalysis_created_at_idx" ON "ResearchAnalysis"("created_at");

-- CreateIndex
CREATE INDEX "ResearchAnalysis_gorilla_verdict_idx" ON "ResearchAnalysis"("gorilla_verdict");

-- CreateIndex
CREATE INDEX "ResearchAnalysis_thesis_quality_idx" ON "ResearchAnalysis"("thesis_quality");
