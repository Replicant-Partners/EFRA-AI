import "dotenv/config";
import { runPipeline } from "./shared/pipeline.js";

// Demo run — replace with real inputs or HTTP/CLI interface
const result = await runPipeline(
  {
    ticker: "NVDA",
    analyst_id: "analyst_001",
    catalyst: "Blackwell GPU cycle acceleration + data center margin expansion in EM markets",
    idea_source_tag: "internal_screen",
  },
  [
    "NVIDIA beats Q4 estimates, data center revenue up 217% YoY — Reuters",
    "Blackwell chip supply constraints easing faster than expected — The Information",
    "Southeast Asia hyperscaler capex plans tripling in 2026 — Bloomberg",
    "SEC filing: insider purchase 50K shares at $145 — EDGAR 4",
  ],
);

console.log("\nFINAL STATE:", JSON.stringify(result, null, 2));
