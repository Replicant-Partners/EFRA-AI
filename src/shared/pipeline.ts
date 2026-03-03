import { runScout } from "../agents/01-scout/index.js";
import { runIntel } from "../agents/02-intel/index.js";
import { runCriticalFactor } from "../agents/03-critical-factor/index.js";
import { runForensic } from "../agents/04-forensic/index.js";
import { runValuation } from "../agents/05-valuation/index.js";
import { runCommunication } from "../agents/06-communication/index.js";
import type { PipelineState, ScoutInput } from "./types.js";

export async function runPipeline(
  scoutInput: ScoutInput,
  rawNewsPool: string[] = [],
): Promise<PipelineState> {
  const idea_id = `idea_${Date.now()}`;
  const state: PipelineState = {
    idea_id,
    ticker: scoutInput.ticker,
    status: "RUNNING",
  };

  console.log(`\n${"═".repeat(60)}`);
  console.log(`EFRAIN AI PIPELINE — ${scoutInput.ticker} — ${idea_id}`);
  console.log(`${"═".repeat(60)}\n`);

  // ── Agent 01: SCOUT ──────────────────────────────────────────
  console.log("[01] SCOUT — Calculando Alpha Score...");
  state.scout = await runScout(scoutInput);
  console.log(
    `     decision: ${state.scout.decision} | score: ${state.scout.alpha_score.total} | mode: ${state.scout.downstream_mode}`,
  );

  if (state.scout.decision === "DROP") {
    state.status = "DROPPED";
    console.log(`     ⛔ DROP — rescreen en: ${state.scout.rescreen_eligible_after ?? "90d"}`);
    return state;
  }

  if (state.scout.decision === "REVIEW_ZONE") {
    console.log("     ⚠️  REVIEW_ZONE — requiere decisión humana. Continuando para demo...");
  }

  // ── Agent 02: INTEL ──────────────────────────────────────────
  console.log("\n[02] INTEL — Procesando news pool...");
  state.intel = await runIntel(
    {
      idea_id,
      ticker: scoutInput.ticker,
      horizon_tag: state.scout.horizon_tag,
      downstream_mode: state.scout.downstream_mode,
    },
    rawNewsPool,
  );

  if (!state.intel.mosaic_clear) {
    state.status = "COMPLIANCE_HALT";
    return state;
  }

  console.log(
    `     surfaced: ${state.intel.surfaced_count} | mosaic_clear: ${state.intel.mosaic_clear} | mgmt_score: ${state.intel.mgmt_comm_score}`,
  );

  // ── Agent 04: FORENSIC (PRE-SCREEN) ─────────────────────────
  console.log("\n[04] FORENSIC — Quick Scan (pre-screen)...");
  state.forensic = await runForensic({ idea_id, ticker: scoutInput.ticker, run_mode: "PRE-SCREEN" });
  console.log(
    `     recommendation: ${state.forensic.recommendation} | risk_score: ${state.forensic.risk_score}`,
  );

  if (state.forensic.recommendation === "BLOCK") {
    state.status = "DROPPED";
    console.log("     ⛔ BLOCK — no rescreen");
    return state;
  }

  // ── Agent 03: CRITICAL FACTOR ────────────────────────────────
  console.log("\n[03] CRITICAL FACTOR — Generando tesis...");
  state.cf = await runCriticalFactor(
    state.intel,
    state.forensic,
    state.scout.downstream_mode,
    state.scout.horizon_tag,
  );
  console.log(
    `     factors: ${state.cf.factors.length} | ev_pt: ${state.cf.expected_value_pt} | scenarios: ${state.cf.scenarios.map((s) => `${s.type}(${(s.probability * 100).toFixed(0)}%)`).join(", ")}`,
  );

  // ── Agent 04: FORENSIC (FULL) ────────────────────────────────
  console.log("\n[04] FORENSIC — Full Scan...");
  state.forensic = await runForensic({ idea_id, ticker: scoutInput.ticker, run_mode: "FULL" });
  console.log(
    `     eps_haircut: ${state.forensic.eps_haircut_total}% | dr_add: ${state.forensic.dr_add_bps_total}bps | flags: ${state.forensic.flags.length}`,
  );

  if (state.forensic.recommendation === "BLOCK") {
    state.status = "DROPPED";
    return state;
  }

  // ── Agent 05: VALUATION ──────────────────────────────────────
  console.log("\n[05] VALUATION — Calculando price target...");
  state.valuation = await runValuation({
    ticker: scoutInput.ticker,
    forensic_profile: state.forensic,
    cf_scenarios: state.cf.scenarios,
    intel_bundle: state.intel,
    build_to_last_score: state.cf.build_to_last_score,
    downstream_mode: state.scout.downstream_mode,
  });
  console.log(
    `     pt_12m: $${state.valuation.pt_12m} | rating: ${state.valuation.rating} | RR: ${state.valuation.rr_ratio.toFixed(2)}:1 | FaVeS: ${state.valuation.faves_score.total}/9`,
  );

  if (state.valuation.rr_ratio < 2 && state.valuation.rating === "UNDERPERFORM") {
    state.status = "DROPPED";
    console.log("     ⛔ DROP — RR < 2:1, sin edge diferencial");
    return state;
  }

  // ── Agent 06: COMMUNICATION ──────────────────────────────────
  console.log("\n[06] COMMUNICATION — Publicando...\n");
  state.communication = await runCommunication({
    valuation_model: state.valuation,
    forensic_profile: state.forensic,
    cf_output: state.cf,
    intel_bundle: state.intel,
    downstream_mode: state.scout.downstream_mode,
  });

  state.status = state.communication.publication_possible ? "COMPLETED" : "DROPPED";

  console.log(`\n${"═".repeat(60)}`);
  console.log(
    `PIPELINE ${state.status} — output: ${state.communication.output_type}`,
  );
  console.log(`${"═".repeat(60)}\n`);

  return state;
}
