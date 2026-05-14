-- Make TimelineEntry.eval_run_id nullable to support correction-sourced entries.
-- Correction entries (provenance="correction") have no EvalRun — they are written
-- directly by the Two-Write Memory after a human intervention to signal that
-- the drift monitor should re-anchor its rolling mean on the corrected evidence.

ALTER TABLE "TimelineEntry"
    ALTER COLUMN "eval_run_id" DROP NOT NULL;

ALTER TABLE "TimelineEntry"
    DROP CONSTRAINT IF EXISTS "TimelineEntry_eval_run_id_fkey";

ALTER TABLE "TimelineEntry"
    ADD CONSTRAINT "TimelineEntry_eval_run_id_fkey"
    FOREIGN KEY ("eval_run_id")
    REFERENCES "EvalRun"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
