"use client";

import { useState, useEffect } from "react";
import type {
  ObservatoryData,
  PipelineRun,
  AgentStats,
  AnomalyEvent,
  AnalystProfile,
} from "@/app/api/observatory/route";

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

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "timeline" | "agents" | "anomalies" | "analysts";

export default function ObservatoryPage() {
  const [data,    setData]    = useState<ObservatoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [tab,     setTab]     = useState<Tab>("timeline");

  useEffect(() => {
    fetch("/api/observatory")
      .then(r => r.json())
      .then(d => { setData(d as ObservatoryData); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, []);

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
      </div>

      <hr className="t-rule" />

      {/* Content */}
      {tab === "timeline"  && <TimelineView  runs={data.runs} />}
      {tab === "agents"    && <AgentPerformanceView stats={data.agent_stats} />}
      {tab === "anomalies" && <AnomalyFeedView anomalies={data.anomalies} />}
      {tab === "analysts"  && <AnalystCalibrationView analysts={data.analysts} />}

    </div>
  );
}
