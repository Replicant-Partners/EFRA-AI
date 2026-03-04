-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "analyst_id" TEXT NOT NULL,
    "catalyst" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "full_state" JSONB NOT NULL,
    "rating" TEXT,
    "pt_12m" DOUBLE PRECISION,
    "sector" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntelItem" (
    "id" TEXT NOT NULL,
    "analysis_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "impact_area" TEXT,
    "sector" TEXT,
    "severity" TEXT,
    "summary" TEXT,
    "include_in_report" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntelItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Analysis_ticker_idx" ON "Analysis"("ticker");

-- CreateIndex
CREATE INDEX "Analysis_created_at_idx" ON "Analysis"("created_at");

-- CreateIndex
CREATE INDEX "Analysis_rating_idx" ON "Analysis"("rating");

-- CreateIndex
CREATE INDEX "Analysis_status_idx" ON "Analysis"("status");

-- CreateIndex
CREATE INDEX "IntelItem_analysis_id_idx" ON "IntelItem"("analysis_id");

-- AddForeignKey
ALTER TABLE "IntelItem" ADD CONSTRAINT "IntelItem_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
