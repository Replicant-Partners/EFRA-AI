"use client";

import { useState, useEffect } from "react";
import type {
  ObservatoryData,
  PipelineRun,
  AgentStats,
  AnomalyEvent,
  AnalystProfile,
} from "@/app/api/observatory/route";
import type {
  QualityData,
  QualityTimelineRow,
  QualityAnomaly,
  QualityTrend,
  QualityObsState,
} from "@/app/api/observatory/quality/route";

// ─── Primitives ───────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-semibold tracking-[0.14em] text-[#C0B8AC] uppercase">
      {children}
    </span>
  );
}

function Rule() {
  return <hr className="border-none border-t border-[#EDE7E0] my-0" style={{ borderTopWidth: 1 }} />;
}

function pct(v: number) {
  return `${(v * 100).toFixed(0)}%`;
}

function num(v: number | null, decimals = 0) {
  if (v == null) return "—";
  return v.toFixed(decimals);
}

function ratingColor(r: string | null) {
  return r === "BUY" ? "text-[#C8804A]" : r === "UNDERPERFORM" ? "text-[#C84848]" : r === "HOLD" ? "text-[#C89040]" : "text-[#A89E94]";
}

function verdictColor(v: string | null) {
  return v === "CONSISTENT" ? "text-[#7A9E6A]" : v === "INCONSISTENT" ? "text-[#C84848]" : v === "PARTIAL" ? "text-[#C89040]" : "text-[#A89E94]";
}

function severityColor(s: string) {
  return s === "high" ? "text-[#C84848]" : s === "medium" ? "text-[#C89040]" : "text-[#A89E94]";
}

function MiniBar({ value, max, color = "bg-[#C8804A]" }: { value: number; max: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-[3px] bg-[#EDE7E0] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TabButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-[11px] font-semibold tracking-wider pb-1 border-b transition-colors ${
        active
          ? "text-[#C8804A] border-[#C8804A]"
          : "text-[#A89E94] border-transparent hover:text-[#6E6258]"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Views ────────────────────────────────────────────────────────────────────

function TimelineView({ runs }: { runs: PipelineRun[] }) {
  return (
    <div>
      <div className="grid grid-cols-[90px_80px_60px_60px_50px_50px_50px_60px_80px] gap-x-3 py-1.5 mb-1">
        <Label>Ticker</Label>
        <Label>Analyst</Label>
        <Label>Mode</Label>
        <Label>Status</Label>
        <Label>Alpha</Label>
        <Label>Rating</Label>
        <Label>R/R</Label>
        <Label>LENS</Label>
        <Label>Date</Label>
      </div>
      <Rule />
      {runs.length === 0 && (
        <p className="text-[11px] text-[#A89E94] py-6 text-center">No pipeline runs yet.</p>
      )}
      {runs.map(r => (
        <div key={r.id}>
          <a
            href={`/library/${r.id}`}
            className="grid grid-cols-[90px_80px_60px_60px_50px_50px_50px_60px_80px] gap-x-3 py-2 text-[11px] hover:bg-[#F5F0EB] transition-colors rounded-sm"
          >
            <span className="font-semibold text-[#1E1A14] truncate">{r.ticker}</span>
            <span className="text-[#6E6258] truncate">{r.analyst_id}</span>
            <span className="text-[#A89E94]">{r.mode}</span>
            <span className={
              r.status === "COMPLETED" ? "text-[#7A9E6A]" :
              r.status === "DROPPED"   ? "text-[#C84848]" :
              r.status === "COMPLIANCE_HALT" ? "text-[#C89040]" :
              "text-[#A89E94]"
            }>
              {r.status === "COMPLETED" ? "done" : r.status === "COMPLIANCE_HALT" ? "halt" : r.status.toLowerCase()}
            </span>
            <span className="text-[#6E6258]">{num(r.alpha_score)}</span>
            <span className={ratingColor(r.rating)}>{r.rating ?? "—"}</span>
            <span className="text-[#6E6258]">{r.rr_ratio != null ? `${r.rr_ratio.toFixed(1)}:1` : "—"}</span>
            <span className={verdictColor(r.lens_verdict)}>
              {r.lens_verdict === "CONSISTENT" ? "✓" : r.lens_verdict === "INCONSISTENT" ? "✗" : r.lens_verdict === "PARTIAL" ? "~" : "—"}
            </span>
            <span className="text-[#A89E94]">
              {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </a>
          <Rule />
        </div>
      ))}
    </div>
  );
}

function AgentPerformanceView({ stats }: { stats: AgentStats[] }) {
  return (
    <div className="space-y-4">
      {stats.map(s => (
        <div key={s.agent}>
          <div className="flex items-baseline gap-3 mb-1.5">
            <span className="text-[11px] font-semibold text-[#1E1A14] w-48">{s.label}</span>
            <span className="text-[#A89E94] text-[11px]">{s.runs} runs</span>
          </div>

          <div className="grid grid-cols-3 gap-4 text-[11px]">
            {/* Pass rate */}
            <div>
              <div className="flex justify-between mb-1">
                <Label>Pass rate</Label>
                <span className={`text-[10px] font-semibold ${
                  s.pass_rate >= 0.8 ? "text-[#7A9E6A]" :
                  s.pass_rate >= 0.5 ? "text-[#C89040]" : "text-[#C84848]"
                }`}>{pct(s.pass_rate)}</span>
              </div>
              <MiniBar
                value={s.pass_rate * 100}
                max={100}
                color={s.pass_rate >= 0.8 ? "bg-[#7A9E6A]" : s.pass_rate >= 0.5 ? "bg-[#C89040]" : "bg-[#C84848]"}
              />
            </div>

            {/* Avg score */}
            <div>
              <div className="flex justify-between mb-1">
                <Label>Avg score</Label>
                <span className="text-[10px] text-[#6E6258]">
                  {s.avg_score != null ? s.avg_score.toFixed(1) : "—"}
                </span>
              </div>
              {s.avg_score != null && (
                <MiniBar value={s.avg_score} max={100} />
              )}
            </div>

            {/* Fallback rate */}
            <div>
              <div className="flex justify-between mb-1">
                <Label>Fallback rate</Label>
                <span className={`text-[10px] font-semibold ${
                  s.fallback_rate > 0.2 ? "text-[#C84848]" :
                  s.fallback_rate > 0 ? "text-[#C89040]" : "text-[#7A9E6A]"
                }`}>{pct(s.fallback_rate)}</span>
              </div>
              <MiniBar
                value={s.fallback_rate * 100}
                max={100}
                color={s.fallback_rate > 0.2 ? "bg-[#C84848]" : "bg-[#C89040]"}
              />
            </div>
          </div>

          <Rule />
        </div>
      ))}
    </div>
  );
}

function AnomalyFeedView({ anomalies }: { anomalies: AnomalyEvent[] }) {
  const kindLabel: Record<string, string> = {
    DROP:              "Pipeline Drop",
    COMPLIANCE_HALT:   "MNPI Halt",
    FORENSIC_BLOCK:    "Forensic Block",
    LENS_INCONSISTENT: "Lens Inconsistent",
    OVERCONFIDENCE:    "Overconfidence",
    FALLBACK:          "Data Fallback",
  };

  return (
    <div>
      {anomalies.length === 0 && (
        <p className="text-[11px] text-[#A89E94] py-6 text-center">No anomalies detected.</p>
      )}
      {anomalies.map(a => (
        <div key={a.id}>
          <div className="py-2.5 flex items-start gap-3">
            <span className={`text-[9px] font-bold tracking-wider uppercase mt-0.5 w-4 ${severityColor(a.severity)}`}>
              {a.severity[0].toUpperCase()}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-[11px] font-semibold text-[#1E1A14]">{a.ticker}</span>
                <span className={`text-[9px] font-bold tracking-wider uppercase ${severityColor(a.severity)}`}>
                  {kindLabel[a.kind] ?? a.kind}
                </span>
                <span className="text-[#A89E94] text-[10px] ml-auto shrink-0">
                  {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
              <p className="text-[11px] text-[#6E6258] leading-relaxed">{a.detail}</p>
              <span className="text-[10px] text-[#A89E94]">{a.analyst_id}</span>
            </div>
          </div>
          <Rule />
        </div>
      ))}
    </div>
  );
}

function AnalystCalibrationView({ analysts }: { analysts: AnalystProfile[] }) {
  return (
    <div>
      {analysts.length === 0 && (
        <p className="text-[11px] text-[#A89E94] py-6 text-center">No analyst data yet.</p>
      )}
      {analysts.map(a => (
        <div key={a.analyst_id} className="py-4">
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-[12px] font-semibold text-[#1E1A14]">{a.analyst_id}</span>
            <span className="text-[#A89E94] text-[11px]">{a.runs} {a.runs === 1 ? "run" : "runs"}</span>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-[11px]">

            {/* Alpha score */}
            <div>
              <div className="flex justify-between mb-1">
                <Label>Avg Alpha Score</Label>
                <span className="text-[10px] text-[#6E6258]">{num(a.avg_alpha, 0)}/100</span>
              </div>
              {a.avg_alpha != null && <MiniBar value={a.avg_alpha} max={100} />}
            </div>

            {/* ENTER gate */}
            <div>
              <div className="flex justify-between mb-1">
                <Label>Avg ENTER Score</Label>
                <span className="text-[10px] text-[#6E6258]">{num(a.avg_enter, 1)}/5</span>
              </div>
              {a.avg_enter != null && <MiniBar value={a.avg_enter} max={5} />}
            </div>

            {/* Confidence */}
            <div>
              <div className="flex justify-between mb-1">
                <Label>Avg Final Confidence</Label>
                <span className="text-[10px] text-[#6E6258]">{a.avg_conf != null ? pct(a.avg_conf) : "—"}</span>
              </div>
              {a.avg_conf != null && <MiniBar value={a.avg_conf * 100} max={100} />}
            </div>

            {/* Process confidence */}
            <div>
              <div className="flex justify-between mb-1">
                <Label>Avg Process Confidence</Label>
                <span className="text-[10px] text-[#6E6258]">{a.avg_proc_conf != null ? pct(a.avg_proc_conf) : "—"}</span>
              </div>
              {a.avg_proc_conf != null && <MiniBar value={a.avg_proc_conf * 100} max={100} />}
            </div>

            {/* BUY rate */}
            <div>
              <div className="flex justify-between mb-1">
                <Label>BUY Rate</Label>
                <span className="text-[10px] text-[#C8804A] font-semibold">{pct(a.buy_rate)}</span>
              </div>
              <MiniBar value={a.buy_rate * 100} max={100} />
            </div>

            {/* Drop rate */}
            <div>
              <div className="flex justify-between mb-1">
                <Label>Drop Rate</Label>
                <span className={`text-[10px] font-semibold ${a.drop_rate > 0.4 ? "text-[#C84848]" : "text-[#A89E94]"}`}>
                  {pct(a.drop_rate)}
                </span>
              </div>
              <MiniBar
                value={a.drop_rate * 100}
                max={100}
                color={a.drop_rate > 0.4 ? "bg-[#C84848]" : "bg-[#C89040]"}
              />
            </div>

            {/* DK high rate */}
            <div>
              <div className="flex justify-between mb-1">
                <Label>Overconfidence Rate</Label>
                <span className={`text-[10px] font-semibold ${a.dk_high_rate > 0.3 ? "text-[#C84848]" : "text-[#7A9E6A]"}`}>
                  {pct(a.dk_high_rate)}
                </span>
              </div>
              <MiniBar
                value={a.dk_high_rate * 100}
                max={100}
                color={a.dk_high_rate > 0.3 ? "bg-[#C84848]" : "bg-[#7A9E6A]"}
              />
            </div>

            {/* LENS consistent rate */}
            <div>
              <div className="flex justify-between mb-1">
                <Label>LENS Consistent Rate</Label>
                <span className={`text-[10px] font-semibold ${a.lens_consistent_rate >= 0.7 ? "text-[#7A9E6A]" : "text-[#C89040]"}`}>
                  {pct(a.lens_consistent_rate)}
                </span>
              </div>
              <MiniBar
                value={a.lens_consistent_rate * 100}
                max={100}
                color={a.lens_consistent_rate >= 0.7 ? "bg-[#7A9E6A]" : "bg-[#C89040]"}
              />
            </div>
          </div>

          <Rule />
        </div>
      ))}
    </div>
  );
}

// ─── Summary stats bar ────────────────────────────────────────────────────────

function SummaryBar({ data }: { data: ObservatoryData }) {
  const runs    = data.runs;
  const n       = runs.length;
  const done    = runs.filter(r => r.status === "COMPLETED").length;
  const buys    = runs.filter(r => r.rating === "BUY").length;
  const consistent = runs.filter(r => r.lens_verdict === "CONSISTENT").length;
  const highDK  = runs.filter(r => r.dk_flag === "high").length;

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-[#A89E94]">
      <span>{n} total runs</span>
      <span>
        completed <span className="text-[#7A9E6A] font-semibold">{n > 0 ? pct(done / n) : "—"}</span>
      </span>
      <span>
        BUY rate <span className="text-[#C8804A] font-semibold">{n > 0 ? pct(buys / n) : "—"}</span>
      </span>
      <span>
        LENS consistent <span className="text-[#7A9E6A] font-semibold">{n > 0 ? pct(consistent / n) : "—"}</span>
      </span>
      <span>
        overconfidence flags <span className={`font-semibold ${highDK > 0 ? "text-[#C84848]" : "text-[#A89E94]"}`}>{highDK}</span>
      </span>
      <span className="text-[#C0B8AC] ml-auto">
        {data.anomalies.filter(a => a.severity === "high").length} high-severity anomalies
      </span>
    </div>
  );
}

// ─── Quality Monitor Views ────────────────────────────────────────────────────

function scoreColor(v: number): string {
  return v >= 0.7 ? "text-[#7A9E6A]" : v >= 0.45 ? "text-[#C89040]" : "text-[#C84848]";
}

function scoreBg(v: number): string {
  return v >= 0.7 ? "bg-[#7A9E6A]" : v >= 0.45 ? "bg-[#C89040]" : "bg-[#C84848]";
}

function trendArrow(dir: string): string {
  return dir === "improving" ? "↑" : dir === "declining" ? "↓" : "→";
}

function trendColor(dir: string): string {
  return dir === "improving" ? "text-[#7A9E6A]" : dir === "declining" ? "text-[#C84848]" : "text-[#A89E94]";
}

function QualityTimelineView({ rows }: { rows: QualityTimelineRow[] }) {
  if (rows.length === 0) {
    return <p className="text-[11px] text-[#A89E94] py-6 text-center">No quality data yet. Run a pipeline first.</p>;
  }

  const dims = ["overall", "argument_quality", "scenario_coherence", "probability_calibration"] as const;
  const dimLabel: Record<string, string> = {
    overall:                 "Overall",
    argument_quality:        "Argument",
    scenario_coherence:      "Scenarios",
    probability_calibration: "Probabilities",
  };

  return (
    <div>
      {/* Header */}
      <div className="grid grid-cols-[90px_80px_60px_60px_60px_60px_60px_80px] gap-x-3 py-1.5 mb-1">
        <Label>Ticker</Label>
        <Label>Analyst</Label>
        <Label>Overall</Label>
        <Label>Argument</Label>
        <Label>Scenarios</Label>
        <Label>Proba.</Label>
        <Label>Drift</Label>
        <Label>Date</Label>
      </div>
      <Rule />
      {rows.map(r => (
        <div key={r.id}>
          <div className="grid grid-cols-[90px_80px_60px_60px_60px_60px_60px_80px] gap-x-3 py-2 text-[11px] hover:bg-[#F5F0EB] transition-colors rounded-sm">
            <span className="font-semibold text-[#1E1A14] truncate">{r.ticker}</span>
            <span className="text-[#6E6258] truncate">{r.analyst_id}</span>
            <span className={`font-semibold ${scoreColor(r.overall)}`}>{(r.overall * 100).toFixed(0)}%</span>
            <span className={scoreColor(r.argument_quality)}>{(r.argument_quality * 100).toFixed(0)}%</span>
            <span className={scoreColor(r.scenario_coherence)}>{(r.scenario_coherence * 100).toFixed(0)}%</span>
            <span className={scoreColor(r.probability_calibration)}>{(r.probability_calibration * 100).toFixed(0)}%</span>
            <span className={r.drift_norm > 0.20 ? "text-[#C84848] font-semibold" : r.drift_norm > 0.10 ? "text-[#C89040]" : "text-[#A89E94]"}>
              {r.drift_norm > 0 ? r.drift_norm.toFixed(3) : "—"}
            </span>
            <span className="text-[#A89E94]">
              {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>
          {/* Mini bars */}
          <div className="grid grid-cols-[90px_80px_60px_60px_60px_60px_60px_80px] gap-x-3 pb-1.5">
            <span /><span />
            {dims.map(dim => (
              <div key={dim} className="h-[2px] bg-[#EDE7E0] rounded-full overflow-hidden">
                <div
                  className={`h-full ${scoreBg(r[dim])} rounded-full`}
                  style={{ width: `${(r[dim] * 100).toFixed(0)}%` }}
                />
              </div>
            ))}
            <span />
          </div>
          <Rule />
        </div>
      ))}
    </div>
  );
}

function QualityAnomalyView({
  anomalies,
  onResolve,
}: {
  anomalies:  QualityAnomaly[];
  onResolve?: (id: string) => void;
}) {
  const kindLabel: Record<string, string> = {
    drift:    "Score Drift",
    conflict: "Evaluator Conflict",
    rupture:  "Score Rupture",
    safety:   "Quality Floor",
  };

  const pending   = anomalies.filter(a => a.requires_review && !a.resolved_at);
  const resolved  = anomalies.filter(a => a.resolved_at);
  const info      = anomalies.filter(a => !a.requires_review && !a.resolved_at);

  return (
    <div className="space-y-6">
      {/* Pending review */}
      {pending.length > 0 && (
        <div>
          <p className="t-label mb-3">Pending Review ({pending.length})</p>
          {pending.map(a => {
            const msg = (a.payload?.message as string) ?? `${a.kind} anomaly on ${a.ticker}`;
            return (
              <div key={a.id}>
                <div className="py-2.5 flex items-start gap-3">
                  <span className={`text-[9px] font-bold tracking-wider uppercase mt-0.5 w-4 ${severityColor(a.severity)}`}>
                    {a.severity[0].toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-[11px] font-semibold text-[#1E1A14]">{a.ticker}</span>
                      <span className={`text-[9px] font-bold tracking-wider uppercase ${severityColor(a.severity)}`}>
                        {kindLabel[a.kind] ?? a.kind}
                      </span>
                      <span className="text-[#A89E94] text-[10px] ml-auto shrink-0">
                        {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6E6258] leading-relaxed">{msg}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-[#A89E94]">{a.analyst_id}</span>
                      {a.timeline_entry && (
                        <span className="text-[10px] text-[#A89E94]">
                          overall {((a.timeline_entry.dim_scores.overall ?? 0) * 100).toFixed(0)}%
                          {a.timeline_entry.drift_norm > 0 ? ` · drift ${a.timeline_entry.drift_norm.toFixed(3)}` : ""}
                        </span>
                      )}
                      {onResolve && (
                        <button
                          onClick={() => onResolve(a.id)}
                          className="text-[10px] text-[#C8804A] hover:underline ml-auto"
                        >
                          Mark resolved →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <Rule />
              </div>
            );
          })}
        </div>
      )}

      {/* Info (no review required) */}
      {info.length > 0 && (
        <div>
          <p className="t-label mb-3">Informational ({info.length})</p>
          {info.map(a => {
            const msg = (a.payload?.message as string) ?? `${a.kind} on ${a.ticker}`;
            return (
              <div key={a.id}>
                <div className="py-2 flex items-start gap-3">
                  <span className="text-[9px] font-bold tracking-wider uppercase mt-0.5 w-4 text-[#A89E94]">i</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-[11px] font-semibold text-[#1E1A14]">{a.ticker}</span>
                      <span className="text-[9px] font-bold tracking-wider uppercase text-[#A89E94]">
                        {kindLabel[a.kind] ?? a.kind}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A89E94]">{msg}</p>
                  </div>
                </div>
                <Rule />
              </div>
            );
          })}
        </div>
      )}

      {pending.length === 0 && info.length === 0 && resolved.length === 0 && (
        <p className="text-[11px] text-[#A89E94] py-6 text-center">No quality anomalies detected.</p>
      )}

      {resolved.length > 0 && (
        <p className="text-[10px] text-[#A89E94] text-center">{resolved.length} resolved anomaly/ies not shown.</p>
      )}
    </div>
  );
}

function QualityTrendView({
  trends,
  obsStates,
  onTriggerScan,
  scanning,
}: {
  trends:         QualityTrend[];
  obsStates:      QualityObsState[];
  onTriggerScan:  (analyst_id: string) => void;
  scanning:       string | null;
}) {
  const dims = ["argument_quality", "scenario_coherence", "probability_calibration"] as const;
  const dimLabel: Record<string, string> = {
    argument_quality:        "Argument Quality",
    scenario_coherence:      "Scenario Coherence",
    probability_calibration: "Probability Calibration",
  };

  if (trends.length === 0) {
    return <p className="text-[11px] text-[#A89E94] py-6 text-center">No trend data yet. Need at least 3 analyses per analyst.</p>;
  }

  return (
    <div className="space-y-8">
      {trends.map(t => {
        const state = obsStates.find(s => s.analyst_id === t.analyst_id);
        return (
          <div key={t.analyst_id}>
            {/* Analyst header */}
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <span className="text-[12px] font-semibold text-[#1E1A14]">{t.analyst_id}</span>
                <span className="text-[#A89E94] text-[11px] ml-3">
                  {t.window_size} analyses · {new Date(t.period_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {new Date(t.period_end).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
              <button
                onClick={() => onTriggerScan(t.analyst_id)}
                disabled={scanning === t.analyst_id}
                className="text-[10px] text-[#A89E94] hover:text-[#C8804A] transition-colors disabled:opacity-40"
              >
                {scanning === t.analyst_id ? "Scanning…" : "⟳ Trigger scan"}
              </button>
            </div>

            {/* Overall score */}
            <div className="mb-3">
              <div className="flex justify-between mb-1">
                <Label>Overall Quality Score</Label>
                <span className={`text-[10px] font-semibold ${scoreColor(t.means.overall)}`}>
                  {(t.means.overall * 100).toFixed(0)}%
                  <span className={`ml-1 ${trendColor(t.trend_direction.overall ?? "stable")}`}>
                    {trendArrow(t.trend_direction.overall ?? "stable")}
                  </span>
                </span>
              </div>
              <div className="h-[3px] bg-[#EDE7E0] rounded-full overflow-hidden">
                <div
                  className={`h-full ${scoreBg(t.means.overall)} rounded-full`}
                  style={{ width: `${(t.means.overall * 100).toFixed(0)}%` }}
                />
              </div>
            </div>

            {/* Per-dimension grid */}
            <div className="grid grid-cols-3 gap-4">
              {dims.map(dim => (
                <div key={dim}>
                  <div className="flex justify-between mb-1">
                    <Label>{dimLabel[dim]}</Label>
                    <span className={`text-[10px] font-semibold ${scoreColor(t.means[dim])}`}>
                      {(t.means[dim] * 100).toFixed(0)}%
                      <span className={`ml-1 ${trendColor(t.trend_direction[dim] ?? "stable")}`}>
                        {trendArrow(t.trend_direction[dim] ?? "stable")}
                      </span>
                    </span>
                  </div>
                  <MiniBar value={t.means[dim] * 100} max={100} color={scoreBg(t.means[dim])} />
                </div>
              ))}
            </div>

            {/* Best / worst + anomaly rate */}
            <div className="flex gap-6 mt-3 text-[10px] text-[#A89E94]">
              <span>Best: <span className="text-[#7A9E6A]">{dimLabel[t.best_dimension] ?? t.best_dimension}</span></span>
              <span>Weakest: <span className="text-[#C84848]">{dimLabel[t.worst_dimension] ?? t.worst_dimension}</span></span>
              <span>Anomaly rate: <span className={t.anomaly_rate > 0.3 ? "text-[#C84848]" : "text-[#A89E94]"}>{(t.anomaly_rate * 100).toFixed(0)}%</span></span>
              {state && (
                <span className="ml-auto">
                  Last scan: {state.last_worker_run_at
                    ? new Date(state.last_worker_run_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                    : "never"}
                </span>
              )}
            </div>

            <Rule />
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "timeline" | "agents" | "anomalies" | "analysts" | "quality";

export default function ObservatoryPage() {
  const [data,        setData]        = useState<ObservatoryData | null>(null);
  const [qualityData, setQualityData] = useState<QualityData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [tab,         setTab]         = useState<Tab>("timeline");
  const [scanning,    setScanning]    = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/observatory").then(r => r.json()),
      fetch("/api/observatory/quality").then(r => r.json()),
    ])
      .then(([d, q]) => {
        setData(d as ObservatoryData);
        setQualityData(q as QualityData);
        setLoading(false);
      })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, []);

  async function handleTriggerScan(analyst_id: string) {
    setScanning(analyst_id);
    try {
      await fetch("/api/observatory/scan", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ analyst_id }),
      });
      // Re-fetch quality data after 3s to show updated results
      setTimeout(() => {
        fetch("/api/observatory/quality")
          .then(r => r.json())
          .then(q => setQualityData(q as QualityData))
          .finally(() => setScanning(null));
      }, 3000);
    } catch {
      setScanning(null);
    }
  }

  async function handleResolveAnomaly(id: string) {
    await fetch(`/api/observatory/quality`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ anomaly_id: id, resolved_by: "observatory_ui" }),
    });
    // Refresh quality data
    fetch("/api/observatory/quality")
      .then(r => r.json())
      .then(q => setQualityData(q as QualityData));
  }

  if (loading) {
    return (
      <div className="py-20 text-center">
        <p className="t-label">Computing observatory data…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-20 text-center space-y-2">
        <p className="text-sm text-[#C84848]">Failed to load observatory</p>
        <p className="text-[11px] text-[#A89E94]">{error}</p>
      </div>
    );
  }

  const pendingAnomalies = qualityData?.anomalies.filter(a => a.requires_review && !a.resolved_at).length ?? 0;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#C8804A] tracking-widest uppercase">Observatory</h1>
          <p className="t-label mt-1">Pipeline monitoring · {data.total} runs · last updated {new Date(data.generated_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <a href="/" className="text-xs text-[#A89E94] hover:text-[#C8804A] transition-colors">
          ← Pipeline
        </a>
      </div>

      <hr className="t-rule" />

      {/* Summary bar */}
      <SummaryBar data={data} />

      <hr className="t-rule" />

      {/* Tabs */}
      <div className="flex gap-6">
        <TabButton active={tab === "timeline"}  onClick={() => setTab("timeline")}>
          Pipeline Timeline
        </TabButton>
        <TabButton active={tab === "agents"}    onClick={() => setTab("agents")}>
          Agent Performance
        </TabButton>
        <TabButton active={tab === "anomalies"} onClick={() => setTab("anomalies")}>
          Anomaly Feed
          {data.anomalies.filter(a => a.severity === "high").length > 0 && (
            <span className="ml-1.5 text-[#C84848] font-bold">
              {data.anomalies.filter(a => a.severity === "high").length}
            </span>
          )}
        </TabButton>
        <TabButton active={tab === "analysts"}  onClick={() => setTab("analysts")}>
          Analyst Calibration
        </TabButton>
        <TabButton active={tab === "quality"}   onClick={() => setTab("quality")}>
          Quality Monitor
          {pendingAnomalies > 0 && (
            <span className="ml-1.5 text-[#C89040] font-bold">{pendingAnomalies}</span>
          )}
        </TabButton>
      </div>

      <hr className="t-rule" />

      {/* Content */}
      {tab === "timeline"  && <TimelineView  runs={data.runs} />}
      {tab === "agents"    && <AgentPerformanceView stats={data.agent_stats} />}
      {tab === "anomalies" && <AnomalyFeedView anomalies={data.anomalies} />}
      {tab === "analysts"  && <AnalystCalibrationView analysts={data.analysts} />}
      {tab === "quality"   && qualityData && (
        <div className="space-y-8">
          {/* Quality Timeline */}
          <div>
            <p className="t-label mb-4">Evaluator Registry Scores</p>
            <QualityTimelineView rows={qualityData.timeline} />
          </div>

          <hr className="t-rule" />

          {/* Quality Anomalies */}
          <div>
            <p className="t-label mb-4">
              Quality Anomalies
              {pendingAnomalies > 0 && (
                <span className="ml-2 text-[#C89040]">({pendingAnomalies} pending review)</span>
              )}
            </p>
            <QualityAnomalyView
              anomalies={qualityData.anomalies}
              onResolve={handleResolveAnomaly}
            />
          </div>

          <hr className="t-rule" />

          {/* Trend analysis */}
          <div>
            <p className="t-label mb-4">Trend Analysis</p>
            <QualityTrendView
              trends={qualityData.trends}
              obsStates={qualityData.obs_states}
              onTriggerScan={handleTriggerScan}
              scanning={scanning}
            />
          </div>
        </div>
      )}
      {tab === "quality" && !qualityData && (
        <p className="text-[11px] text-[#A89E94] py-6 text-center">Loading quality data…</p>
      )}

    </div>
  );
}
