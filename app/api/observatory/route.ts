import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import type { PipelineState } from "@/src/shared/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PipelineRun {
  id:           string;
  ticker:       string;
  analyst_id:   string;
  mode:         string;
  status:       string;
  created_at:   string;
  // Scout
  alpha_score:  number | null;
  decision:     string | null;
  fallback:     string | null;
  confidence:   number | null;
  // Valuation
  rating:       string | null;
  pt_12m:       number | null;
  rr_ratio:     number | null;
  faves:        number | null;
  // Communication
  enter_score:  number | null;
  final_conf:   number | null;
  output_type:  string | null;
  // Kata
  process_conf: number | null;
  gap_count:    number | null;
  // Lens
  lens_verdict: string | null;
  loop_score:   number | null;
  sf_score:     number | null;
  dk_flag:      string | null;
  hc_fit:       string | null;
  // Anomalies
  anomalies:    string[];
}

export interface AgentStats {
  agent:        string;
  label:        string;
  runs:         number;
  pass_rate:    number;   // % that didn't drop/block at this agent
  avg_score:    number | null;
  fallback_rate:number;
}

export interface AnomalyEvent {
  id:           string;
  ticker:       string;
  analyst_id:   string;
  created_at:   string;
  kind:         string;   // DROP · BLOCK · COMPLIANCE_HALT · LENS_INCONSISTENT · OVERCONFIDENCE
  severity:     "high" | "medium" | "low";
  detail:       string;
}

export interface AnalystProfile {
  analyst_id:   string;
  runs:         number;
  buy_rate:     number;
  avg_alpha:    number | null;
  avg_enter:    number | null;
  avg_conf:     number | null;
  avg_proc_conf:number | null;
  dk_high_rate: number;   // % runs where DK flag = high
  lens_consistent_rate: number;
  drop_rate:    number;
}

export interface ObservatoryData {
  runs:         PipelineRun[];
  agent_stats:  AgentStats[];
  anomalies:    AnomalyEvent[];
  analysts:     AnalystProfile[];
  total:        number;
  generated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safe<T>(fn: () => T): T | null {
  try { return fn(); } catch { return null; }
}

function extractMetrics(state: PipelineState): Omit<PipelineRun, "id" | "ticker" | "analyst_id" | "mode" | "status" | "created_at"> {
  const scout  = state.scout;
  const val    = state.valuation;
  const comm   = state.communication;
  const kata   = state.kata;
  const lens   = state.lens;

  const anomalies: string[] = [];
  if (state.status === "DROPPED")          anomalies.push("DROP");
  if (state.status === "COMPLIANCE_HALT")  anomalies.push("COMPLIANCE_HALT");
  if (state.forensic?.recommendation === "BLOCK") anomalies.push("FORENSIC_BLOCK");
  if (lens?.overall_verdict === "INCONSISTENT")   anomalies.push("LENS_INCONSISTENT");
  if (lens?.dunning_kruger?.flag === "high")       anomalies.push("OVERCONFIDENCE");
  if (scout?.fallback_level && scout.fallback_level !== "none") anomalies.push("FALLBACK");

  return {
    alpha_score:  safe(() => scout?.alpha_score.total ?? null),
    decision:     safe(() => scout?.decision ?? null),
    fallback:     safe(() => scout?.fallback_level ?? null),
    confidence:   safe(() => scout?.confidence ?? null),
    rating:       safe(() => val?.rating ?? null),
    pt_12m:       safe(() => val?.pt_12m ?? null),
    rr_ratio:     safe(() => val?.rr_ratio ?? null),
    faves:        safe(() => val?.faves_score?.total ?? null),
    enter_score:  safe(() => comm?.enter_gate?.effective_score ?? null),
    final_conf:   safe(() => comm?.audit_trail?.final_confidence ?? null),
    output_type:  safe(() => comm?.output_type ?? null),
    process_conf: safe(() => kata?.process_confidence ?? null),
    gap_count:    safe(() => kata?.knowledge_gaps?.length ?? null),
    lens_verdict: safe(() => lens?.overall_verdict ?? null),
    loop_score:   safe(() => lens?.loop?.score ?? null),
    sf_score:     safe(() => lens?.superforecasting?.score ?? null),
    dk_flag:      safe(() => lens?.dunning_kruger?.flag ?? null),
    hc_fit:       safe(() => lens?.hidden_champion?.fit ?? null),
    anomalies,
  };
}

function buildAgentStats(runs: PipelineRun[]): AgentStats[] {
  const total = runs.length;
  if (total === 0) return [];

  const dropped    = runs.filter(r => r.status === "DROPPED").length;
  const halted     = runs.filter(r => r.status === "COMPLIANCE_HALT").length;
  const blocked    = runs.filter(r => r.anomalies.includes("FORENSIC_BLOCK")).length;
  const withFallback = runs.filter(r => r.fallback && r.fallback !== "none").length;

  const alphas     = runs.map(r => r.alpha_score).filter((v): v is number => v != null);
  const enters     = runs.map(r => r.enter_score).filter((v): v is number => v != null);
  const rrs        = runs.map(r => r.rr_ratio).filter((v): v is number => v != null);
  const procs      = runs.map(r => r.process_conf).filter((v): v is number => v != null);
  const loops      = runs.map(r => r.loop_score).filter((v): v is number => v != null);

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  return [
    { agent: "scout",         label: "01 · SCOUT",           runs: total, pass_rate: (total - dropped) / total,    avg_score: avg(alphas),  fallback_rate: withFallback / total },
    { agent: "intel",         label: "02 · INTEL",           runs: total - dropped, pass_rate: halted === 0 ? 1 : (total - dropped - halted) / (total - dropped), avg_score: null, fallback_rate: 0 },
    { agent: "forensic",      label: "03-05 · FORENSIC",     runs: total - dropped, pass_rate: blocked === 0 ? 1 : (total - dropped - blocked) / (total - dropped), avg_score: null, fallback_rate: 0 },
    { agent: "valuation",     label: "06 · VALUATION",       runs: total, pass_rate: runs.filter(r => r.rating === "BUY").length / total, avg_score: avg(rrs),     fallback_rate: 0 },
    { agent: "kata",          label: "07 · KATA",            runs: total, pass_rate: 1, avg_score: avg(procs),   fallback_rate: 0 },
    { agent: "communication", label: "08 · COMMUNICATION",   runs: total, pass_rate: runs.filter(r => (r.enter_score ?? 0) >= 5).length / total, avg_score: avg(enters), fallback_rate: 0 },
    { agent: "lens",          label: "09 · LENS",            runs: total, pass_rate: runs.filter(r => r.lens_verdict === "CONSISTENT").length / total, avg_score: avg(loops), fallback_rate: 0 },
  ];
}

function buildAnomalies(rows: PipelineRun[]): AnomalyEvent[] {
  const events: AnomalyEvent[] = [];

  for (const r of rows) {
    for (const kind of r.anomalies) {
      const severity: "high" | "medium" | "low" =
        kind === "FORENSIC_BLOCK" || kind === "COMPLIANCE_HALT" ? "high" :
        kind === "LENS_INCONSISTENT" || kind === "OVERCONFIDENCE" ? "medium" : "low";

      const detail =
        kind === "DROP"              ? `Pipeline dropped — decision: ${r.decision ?? "unknown"}` :
        kind === "COMPLIANCE_HALT"   ? "MNPI signal detected — pipeline halted" :
        kind === "FORENSIC_BLOCK"    ? "Forensic SEV-5 block — fraud or restatement signal" :
        kind === "LENS_INCONSISTENT" ? `LENS verdict: INCONSISTENT — loop ${r.loop_score}/100, sf ${r.sf_score}/100` :
        kind === "OVERCONFIDENCE"    ? `Dunning-Kruger HIGH — ${r.gap_count} gaps, conf ${((r.final_conf ?? 0) * 100).toFixed(0)}%` :
        kind === "FALLBACK"          ? `Data fallback: ${r.fallback}` :
        kind;

      events.push({
        id:         `${r.id}-${kind}`,
        ticker:     r.ticker,
        analyst_id: r.analyst_id,
        created_at: r.created_at,
        kind,
        severity,
        detail,
      });
    }
  }

  return events.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });
}

function buildAnalysts(runs: PipelineRun[]): AnalystProfile[] {
  const byAnalyst = new Map<string, PipelineRun[]>();
  for (const r of runs) {
    if (!byAnalyst.has(r.analyst_id)) byAnalyst.set(r.analyst_id, []);
    byAnalyst.get(r.analyst_id)!.push(r);
  }

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  return Array.from(byAnalyst.entries()).map(([analyst_id, rs]) => {
    const n = rs.length;
    const alphas = rs.map(r => r.alpha_score).filter((v): v is number => v != null);
    const enters = rs.map(r => r.enter_score).filter((v): v is number => v != null);
    const confs  = rs.map(r => r.final_conf).filter((v): v is number => v != null);
    const procs  = rs.map(r => r.process_conf).filter((v): v is number => v != null);

    return {
      analyst_id,
      runs:                 n,
      buy_rate:             rs.filter(r => r.rating === "BUY").length / n,
      avg_alpha:            avg(alphas),
      avg_enter:            avg(enters),
      avg_conf:             avg(confs),
      avg_proc_conf:        avg(procs),
      dk_high_rate:         rs.filter(r => r.dk_flag === "high").length / n,
      lens_consistent_rate: rs.filter(r => r.lens_verdict === "CONSISTENT").length / n,
      drop_rate:            rs.filter(r => r.status === "DROPPED").length / n,
    };
  }).sort((a, b) => b.runs - a.runs);
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const rows = await prisma.analysis.findMany({
      select: {
        id:         true,
        ticker:     true,
        analyst_id: true,
        mode:       true,
        status:     true,
        created_at: true,
        full_state: true,
      },
      orderBy: { created_at: "desc" },
      take: 200,
    });

    const runs: PipelineRun[] = rows.map(row => ({
      id:         row.id,
      ticker:     row.ticker,
      analyst_id: row.analyst_id,
      mode:       row.mode,
      status:     row.status,
      created_at: row.created_at.toISOString(),
      ...extractMetrics(row.full_state as unknown as PipelineState),
    }));

    const data: ObservatoryData = {
      runs,
      agent_stats:  buildAgentStats(runs),
      anomalies:    buildAnomalies(runs),
      analysts:     buildAnalysts(runs),
      total:        rows.length,
      generated_at: new Date().toISOString(),
    };

    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/observatory]", err);
    return NextResponse.json({ error: "Failed to compute observatory data" }, { status: 500 });
  }
}
