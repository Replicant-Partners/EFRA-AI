"use client";

import type { PipelineState } from "@/src/shared/types";

interface Props {
  state: PipelineState;
}

export default function ResultPanel({ state }: Props) {
  const { status, scout, valuation, communication, forensic, cf } = state;
  const comm = communication;

  const statusColor = {
    COMPLETED: "border-green-500 bg-green-500/10 text-green-400",
    DROPPED: "border-red-500 bg-red-500/10 text-red-400",
    COMPLIANCE_HALT: "border-yellow-500 bg-yellow-500/10 text-yellow-400",
    RUNNING: "border-gray-500 bg-gray-500/10 text-gray-400",
    PAUSED_FORENSIC_UNAVAILABLE: "border-yellow-500 bg-yellow-500/10 text-yellow-400",
  }[status] ?? "border-gray-500 text-gray-400";

  return (
    <div className="space-y-4 mt-6">
      {/* Status badge */}
      <div className={`border px-4 py-3 flex items-center justify-between ${statusColor}`}>
        <span className="font-bold tracking-widest text-sm">{status}</span>
        {comm && <span className="text-xs opacity-70">{comm.output_type}</span>}
      </div>

      {comm && valuation && (
        <>
          {/* Key metrics */}
          <div className="grid grid-cols-4 gap-2">
            <Metric label="Rating" value={valuation.rating} color={valuation.rating === "BUY" ? "text-green-400" : valuation.rating === "UNDERPERFORM" ? "text-red-400" : "text-yellow-400"} />
            <Metric label="PT 12M" value={`$${valuation.pt_12m}`} color="text-green-400" />
            <Metric label="RR Ratio" value={`${valuation.rr_ratio.toFixed(1)}:1`} color="text-green-400" />
            <Metric label="Confidence" value={`${(comm.audit_trail.final_confidence * 100).toFixed(0)}%`} color="text-green-400" />
          </div>

          {/* ENTER gate */}
          <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-4">
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">ENTER Gate</div>
            <div className="grid grid-cols-5 gap-2 text-xs">
              {[
                ["E", "Edge", comm.enter_gate.edge],
                ["N", "New", comm.enter_gate.new_catalyst],
                ["T", "Timely", comm.enter_gate.timely],
                ["E", "Examples", comm.enter_gate.examples],
                ["R", "Revealing", comm.enter_gate.revealing],
              ].map(([abbr, name, pass]) => (
                <div key={String(name)} className="text-center">
                  <div className={`text-lg font-bold ${pass ? "text-green-400" : "text-red-500"}`}>{String(abbr)}</div>
                  <div className="text-gray-600 text-xs">{String(name)}</div>
                  <div className={pass ? "text-green-400" : "text-red-400"}>{pass ? "✓" : "✗"}</div>
                </div>
              ))}
            </div>
          </div>

          {/* CASCADE preview */}
          {comm.content && (
            <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-4">
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">CASCADE Output</div>
              <pre className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed overflow-auto max-h-96">
                {comm.content}
              </pre>
            </div>
          )}

          {/* Scenarios */}
          {cf && (
            <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-4">
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">Scenarios</div>
              <div className="grid grid-cols-3 gap-3">
                {cf.scenarios.map(s => (
                  <div key={s.type} className="text-center">
                    <div className="text-xs text-gray-500">{s.type}</div>
                    <div className="text-lg font-bold text-green-400">${s.implied_pt}</div>
                    <div className="text-xs text-gray-500">{(s.probability * 100).toFixed(0)}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Forensic flags */}
          {forensic && forensic.flags.length > 0 && (
            <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-4">
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">
                Forensic Flags ({forensic.flags.length})
              </div>
              <div className="space-y-1">
                {forensic.flags.map((f, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <span className={`font-bold ${f.severity >= 4 ? "text-red-400" : f.severity === 3 ? "text-yellow-400" : "text-gray-400"}`}>
                      SEV-{f.severity}
                    </span>
                    <span className="text-gray-400 flex-1">{f.description}</span>
                    <span className="text-gray-600">-{(f.eps_haircut_pct * 100).toFixed(0)}%eps</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fallback flags */}
          {comm.audit_trail.fallback_flags.length > 0 && (
            <div className="border border-yellow-500/20 bg-yellow-500/5 p-3">
              <div className="text-xs text-yellow-500/70 uppercase tracking-widest mb-2">Fallback flags</div>
              <div className="flex flex-wrap gap-2">
                {comm.audit_trail.fallback_flags.map(flag => (
                  <span key={flag} className="text-xs bg-yellow-500/10 text-yellow-400 px-2 py-0.5 border border-yellow-500/20">
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Alpha score breakdown */}
          {scout && (
            <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-4">
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">
                Alpha Score · <span className="text-green-400 font-bold">{scout.alpha_score.total}</span>/100
              </div>
              <div className="grid grid-cols-5 gap-2 text-xs text-center">
                <ScoreBar label="Coverage" value={scout.alpha_score.coverage_gap_score} max={25} />
                <ScoreBar label="Mkt Cap" value={scout.alpha_score.market_cap_fit} max={20} />
                <ScoreBar label="Sector" value={scout.alpha_score.sector_relevance} max={25} />
                <ScoreBar label="Valuation" value={scout.alpha_score.valuation_anomaly} max={30} />
                <ScoreBar label="Gunn" value={scout.alpha_score.gunn_bonus} max={25} />
              </div>
            </div>
          )}
        </>
      )}

      {(status === "DROPPED" || status === "COMPLIANCE_HALT") && (
        <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-4 text-sm text-gray-400">
          {status === "COMPLIANCE_HALT"
            ? "Pipeline halted — MNPI concern detected. Compliance team notified."
            : "Idea did not pass pipeline gates. See agent steps above for drop reason."}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-3 text-center">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`font-bold text-lg ${color}`}>{value}</div>
    </div>
  );
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      <div className="text-gray-500 mb-1">{label}</div>
      <div className="text-green-400 font-bold">{value}<span className="text-gray-600">/{max}</span></div>
      <div className="h-1 bg-[#2a2a2a] mt-1">
        <div className="h-1 bg-green-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
