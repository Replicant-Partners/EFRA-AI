"use client";

import type { PipelineState } from "@/src/shared/types";

interface Props {
  state: PipelineState;
}

export default function ResultPanel({ state }: Props) {
  const { status, scout, valuation, communication, forensic, cf } = state;
  const comm = communication;

  const statusColor =
    status === "COMPLETED"   ? "text-green-400" :
    status === "DROPPED"     ? "text-red-400"   :
    status === "COMPLIANCE_HALT" ? "text-yellow-400" :
    "text-gray-400";

  return (
    <div className="mt-8 space-y-0">
      <hr className="t-rule mb-4" />

      {/* Status line */}
      <div className="flex items-baseline gap-4 mb-6">
        <span className={`text-xs font-bold tracking-widest ${statusColor}`}>{status}</span>
        {comm && <span className="t-label">{comm.output_type.toLowerCase().replace(/_/g, " ")}</span>}
      </div>

      {comm && valuation && (
        <>
          {/* Key metrics — inline data row */}
          <div className="flex items-baseline gap-6 mb-6 text-xs">
            <DataPoint
              label="Rating"
              value={valuation.rating}
              color={valuation.rating === "BUY" ? "text-green-400" : valuation.rating === "UNDERPERFORM" ? "text-red-400" : "text-yellow-400"}
            />
            <DataPoint label="PT 12M" value={`$${valuation.pt_12m}`} color="text-green-400" />
            <DataPoint label="RR" value={`${(valuation.rr_ratio ?? 0).toFixed(1)}:1`} color="text-green-400" />
            <DataPoint
              label="Confidence"
              value={`${((comm.audit_trail?.final_confidence ?? 0) * 100).toFixed(0)}%`}
              color="text-[#aaa]"
            />
            <DataPoint
              label="FaVeS"
              value={`${valuation.faves_score?.total ?? "?"}/9`}
              color="text-[#aaa]"
            />
          </div>

          <hr className="t-rule mb-4" />

          {/* ENTER gate — compact inline */}
          <div className="mb-6">
            <span className="t-label mr-4">ENTER Gate</span>
            <span className="text-xs text-[#aaa]">
              score <span className={comm.enter_gate.effective_score >= 5 ? "text-green-400" : "text-red-400"}>{comm.enter_gate.effective_score}/5</span>
              {" · "}
              {(["Edge", "New", "Timely", "Examples", "Revealing"] as const).map((name, i) => {
                const vals = [comm.enter_gate.edge, comm.enter_gate.new_catalyst, comm.enter_gate.timely, comm.enter_gate.examples, comm.enter_gate.revealing];
                const pass = vals[i];
                return (
                  <span key={name} className={`mr-2 ${pass ? "text-green-400" : "text-[#555]"}`}>
                    {name[0]}
                  </span>
                );
              })}
            </span>
          </div>

          {/* Scenarios */}
          {cf && (cf.scenarios ?? []).length > 0 && (
            <div className="mb-6">
              <div className="t-label mb-2">Scenarios</div>
              <div className="flex gap-8 text-xs">
                {(cf.scenarios ?? []).map(s => (
                  <div key={s.type}>
                    <span className="text-[#555]">{s.type.toLowerCase()}</span>
                    {" "}
                    <span className="text-green-400">${s.implied_pt}</span>
                    {" "}
                    <span className="text-[#555]">{(s.probability * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Forensic flags */}
          {forensic && (forensic.flags ?? []).length > 0 && (
            <div className="mb-6">
              <div className="t-label mb-2">
                Forensic Flags · {(forensic.flags ?? []).length} · haircut{" "}
                <span className="text-[#aaa]">{(forensic.eps_haircut_total ?? 0).toFixed(0)}%</span>
              </div>
              <div className="space-y-1">
                {(forensic.flags ?? []).map((f, i) => (
                  <div key={i} className="flex items-baseline gap-3 text-xs">
                    <span className={`font-mono ${f.severity >= 4 ? "text-red-400" : f.severity === 3 ? "text-yellow-400" : "text-[#555]"}`}>
                      {f.severity}
                    </span>
                    <span className="text-[#888] flex-1">{f.description}</span>
                    <span className="text-[#555]">−{(f.eps_haircut_pct * 100).toFixed(0)}% eps</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fallback flags */}
          {(comm.audit_trail?.fallback_flags ?? []).length > 0 && (
            <div className="mb-6">
              <span className="t-label mr-3">Fallbacks</span>
              <span className="text-xs text-yellow-500/70">
                {(comm.audit_trail?.fallback_flags ?? []).join(" · ")}
              </span>
            </div>
          )}

          <hr className="t-rule mb-4" />

          {/* Alpha score breakdown */}
          {scout && (
            <div className="mb-6">
              <div className="flex items-baseline gap-3 mb-3">
                <span className="t-label">Alpha Score</span>
                <span className="text-green-400 text-xs font-bold">{scout.alpha_score.total}/100</span>
                {scout.confidence != null && (
                  <span className="text-[#555] text-xs">conf {(scout.confidence * 100).toFixed(0)}%</span>
                )}
              </div>
              <div className="flex gap-6 text-xs">
                <ScorePair label="Coverage" value={scout.alpha_score.coverage_gap_score} max={25} />
                <ScorePair label="Mkt Cap" value={scout.alpha_score.market_cap_fit} max={20} />
                <ScorePair label="Sector" value={scout.alpha_score.sector_relevance} max={25} />
                <ScorePair label="Valuation" value={scout.alpha_score.valuation_anomaly} max={30} />
                <ScorePair label="Gunn +" value={scout.alpha_score.gunn_bonus} max={25} />
              </div>
              {scout.alpha_score.gunn_bonus > 0 && (
                <div className="flex gap-3 text-xs text-[#555] mt-2">
                  {scout.alpha_score.em_gdp_bonus > 0 && <span className="text-green-600">+{scout.alpha_score.em_gdp_bonus} EM GDP</span>}
                  {scout.alpha_score.bessembinder_bonus > 0 && <span className="text-green-600">+{scout.alpha_score.bessembinder_bonus} Bessembinder</span>}
                  {scout.alpha_score.low_coverage_bonus > 0 && <span className="text-green-600">+{scout.alpha_score.low_coverage_bonus} Low Coverage</span>}
                </div>
              )}
            </div>
          )}

          <hr className="t-rule mb-4" />

          {/* CASCADE output */}
          {comm.content && (
            <div className="mb-6">
              <div className="t-label mb-3">CASCADE Output</div>
              <pre className="text-xs text-[#888] whitespace-pre-wrap leading-relaxed overflow-auto max-h-96 prose-tufte font-mono">
                {comm.content}
              </pre>
            </div>
          )}
        </>
      )}

      {(status === "DROPPED" || status === "COMPLIANCE_HALT") && !comm && (
        <p className="prose-tufte text-sm">
          {status === "COMPLIANCE_HALT"
            ? "Pipeline halted — MNPI concern detected. Compliance team notified."
            : "Idea did not pass pipeline gates. See agent steps above for drop reason."}
        </p>
      )}
    </div>
  );
}

function DataPoint({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span>
      <span className="t-label mr-1">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </span>
  );
}

function ScorePair({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <span className="text-[#555]">
      {label}{" "}
      <span className="text-[#aaa]">{value}</span>
      <span className="text-[#3a3a3a]">/{max}</span>
    </span>
  );
}
