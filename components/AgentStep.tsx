"use client";

import type { AgentEvent, ScoutOutput, IntelBundle, ForensicProfile, CFOutput, ValuationModel, CommOutput } from "@/src/shared/types";

interface Props {
  agentKey: string;
  label: string;
  desc: string;
  event?: AgentEvent;
  logs?: string[];
  analystNote?: string;
  pipelineRunning: boolean;
}

function statusDot(status?: AgentEvent["status"]) {
  if (!status)              return <span className="w-1.5 h-1.5 rounded-full bg-[#D8D0C8] inline-block mt-0.5" />;
  if (status === "running") return <span className="w-1.5 h-1.5 rounded-full bg-[#C8804A] inline-block mt-0.5 animate-pulse" />;
  if (status === "done")    return <span className="w-1.5 h-1.5 rounded-full bg-[#7A9E6A] inline-block mt-0.5" />;
  return                           <span className="w-1.5 h-1.5 rounded-full bg-[#C84848] inline-block mt-0.5" />;
}

function AgentSummary({ agentKey, result }: { agentKey: string; result: unknown }) {
  if (!result) return null;

  if (agentKey === "scout") {
    const r = result as ScoutOutput;
    const dc = r.decision === "MUST_COVER" ? "text-[#C8804A]" : r.decision === "REVIEW_ZONE" ? "text-[#C89040]" : "text-[#C84848]";
    return (
      <span className="text-[#A89E94]">
        {r.alpha_score && <>score <span className="text-[#C8804A]">{r.alpha_score.total}</span>{" · "}</>}
        <span className={dc}>{r.decision}</span>
        {" · "}{r.downstream_mode} {" · "}{r.horizon_tag}
        {r.confidence != null && <>{" · "}conf <span className="text-[#8C7E70]">{(r.confidence * 100).toFixed(0)}%</span></>}
        {r.decision_rationale && (
          <span className="block mt-0.5 prose-tufte text-[11px]">{r.decision_rationale}</span>
        )}
      </span>
    );
  }

  if (agentKey === "intel") {
    const r = result as IntelBundle;
    const bc = r.business_context;
    const newsItems = r.news_items ?? [];

    const sourceLabel = (src: string) => {
      if (src === "edgar_sec") return "SEC";
      if (src === "crm")       return "CRM";
      return "API";
    };
    const sourceDot = (src: string) => {
      if (src === "edgar_sec") return "text-[#C89040]";
      if (src === "crm")       return "text-[#7A9E6A]";
      return "text-[#8CA8C8]";
    };

    return (
      <span>
        {/* ── Section 1: Company overview ── */}
        {(bc?.business_memo || bc?.moat_type) && (
          <span className="block">
            <span className="block text-[9px] font-semibold tracking-[0.12em] text-[#C0B8AC] uppercase mb-1">
              Company
            </span>
            {bc?.business_memo && (
              <span className="block prose-tufte text-[11px] text-[#1E1A14] leading-relaxed">
                {bc.business_memo}
              </span>
            )}
            {bc?.moat_type && (
              <span className="block mt-1 text-[11px] text-[#A89E94]">
                moat <span className="text-[#6E6258]">{bc.moat_type}</span>
                <span className="text-[#C0B8AC]">
                  {" "}({
                    bc.moat_type === "marca"      ? "brand loyalty & pricing power" :
                    bc.moat_type === "costos"     ? "lower cost structure than peers" :
                    bc.moat_type === "red"        ? "network effects" :
                    bc.moat_type === "regulación" ? "regulatory barriers & licensing" :
                    "other competitive advantage"
                  })
                </span>
                {bc.growth_trend && <>{" · "}{bc.growth_trend}</>}
              </span>
            )}
          </span>
        )}

        {/* ── Section 2: News ── */}
        <span className="block border-t border-[#EDE7E0] mt-2 pt-2">
          <span className="block text-[9px] font-semibold tracking-[0.12em] text-[#C0B8AC] uppercase mb-1.5">
            News
            <span className="normal-case font-normal tracking-normal text-[#C0B8AC] ml-1.5">
              {r.surfaced_count} surfaced
              {" · "}mosaic{" "}
              {r.mosaic_clear
                ? <span className="text-[#C8804A]">clear</span>
                : <span className="text-[#C84848]">halt</span>}
              {" · "}mgmt <span className="text-[#6E6258]">{r.mgmt_comm_score}</span>
            </span>
          </span>
          {newsItems.length > 0 && (
            <span className="block space-y-1.5">
              {newsItems.map((item, i) => (
                <span key={i} className="block">
                  <span className={`inline-block text-[9px] font-mono font-semibold tracking-wider mr-1.5 ${sourceDot(item.source ?? "news_api")}`}>
                    [{sourceLabel(item.source ?? "news_api")}]
                  </span>
                  <span className="text-[11px] text-[#1E1A14]">{item.headline}</span>
                  {item.summary && (
                    <span className="block text-[11px] text-[#A89E94] leading-relaxed pl-5 mt-0.5">
                      {item.summary}
                    </span>
                  )}
                </span>
              ))}
            </span>
          )}
        </span>

        {/* ── Section 3: Analyst briefing ── */}
        {r.analyst_briefing && (
          <span className="block border-t border-[#EDE7E0] mt-2 pt-2">
            <span className="block text-[9px] font-semibold tracking-[0.12em] text-[#C0B8AC] uppercase mb-1">
              Analyst Briefing
            </span>
            <span className="block prose-tufte text-[11px] text-[#6E6258] leading-relaxed">
              {r.analyst_briefing}
            </span>
          </span>
        )}
      </span>
    );
  }

  if (agentKey === "forensic_pre" || agentKey === "forensic") {
    const r = result as ForensicProfile;
    return (
      <span>
        {/* Risk stats row */}
        <span className="text-[#A89E94]">
          risk <span className="text-[#C89040]">{r.risk_score}</span>
          {" · "}
          <span className={r.recommendation === "BLOCK" ? "text-[#C84848]" : r.recommendation === "CLEAR" ? "text-[#C8804A]" : "text-[#C89040]"}>
            {r.recommendation?.toLowerCase()}
          </span>
          {" · "}{(r.flags ?? []).length} flag{(r.flags ?? []).length !== 1 ? "s" : ""}
          {" · "}haircut <span className="text-[#8C7E70]">{(r.eps_haircut_total ?? 0).toFixed(0)}%</span>
        </span>
        {/* Management summary — full scan only */}
        {agentKey === "forensic" && r.management_profile?.management_summary && (
          <span className="block border-t border-[#EDE7E0] mt-2 pt-2 prose-tufte text-[11px] text-[#6E6258] leading-relaxed">
            {r.management_profile.management_summary}
          </span>
        )}
      </span>
    );
  }

  if (agentKey === "cf") {
    const r = result as CFOutput;
    const scenarios = r.scenarios ?? [];
    const evFormula = scenarios
      .map(s => `${(s.probability * 100).toFixed(0)}% × $${s.implied_pt}`)
      .join(" + ");
    const scenarioColor = (type: string) =>
      type === "Bull" ? "text-[#7A9E6A]" : type === "Bear" ? "text-[#C84848]" : "text-[#C8804A]";
    return (
      <span>
        {/* ── Section 1: Factors + EV ── */}
        <span className="text-[#A89E94]">
          <span className="text-[#6E6258]">{(r.factors ?? []).length}</span> critical factors
          {" · "}EV <span className="text-[#C8804A]">${r.expected_value_pt}</span>
        </span>

        {/* ── Section 2: Scenarios with math + triggers ── */}
        {scenarios.length > 0 && (
          <span className="block border-t border-[#EDE7E0] mt-2 pt-2 space-y-2">
            {scenarios.map((s, i) => (
              <span key={i} className="block">
                <span className={`text-[11px] font-semibold tracking-widest ${scenarioColor(s.type)}`}>
                  {s.type?.toUpperCase()}
                </span>
                <span className="text-[#A89E94] text-[11px]">
                  {" "}{(s.probability * 100).toFixed(0)}%{" → "}
                </span>
                <span className="text-[#1E1A14] text-[11px] font-semibold">${s.implied_pt}</span>
                {s.price_derivation && (
                  <span className="block mt-0.5 text-[11px] font-mono text-[#8C7E70] pl-1">
                    {s.price_derivation}
                  </span>
                )}
                {s.triggers && (
                  <span className="block mt-0.5 text-[11px] text-[#A89E94] pl-1 italic">
                    {s.triggers}
                  </span>
                )}
              </span>
            ))}
          </span>
        )}

        {/* ── Section 3: EV formula ── */}
        {scenarios.length > 0 && (
          <span className="block border-t border-[#EDE7E0] mt-2 pt-2 text-[11px] font-mono text-[#8C7E70]">
            EV = {evFormula} = <span className="text-[#C8804A]">${r.expected_value_pt}</span>
          </span>
        )}
      </span>
    );
  }

  if (agentKey === "valuation") {
    const r = result as ValuationModel;
    return (
      <span>
        {/* ── Section 1: Core metrics row ── */}
        <span className="text-[#A89E94]">
          PT <span className="text-[#C8804A]">${r.pt_12m}</span>
          {r.pt_5y != null && <>{" · "}5Y <span className="text-[#C8804A]">${r.pt_5y}</span></>}
          {" · "}
          <span className={r.rating === "BUY" ? "text-[#C8804A]" : r.rating === "UNDERPERFORM" ? "text-[#C84848]" : "text-[#C89040]"}>
            {r.rating?.toLowerCase()}
          </span>
          {" · "}RR <span className="text-[#8C7E70]">{(r.rr_ratio ?? 0).toFixed(1)}:1</span>
          {" · "}FaVeS <span className="text-[#8C7E70]">{r.faves_score?.total ?? "?"}/9</span>
          {r.ic_premium != null && <>{" · "}IC <span className="text-[#8C7E70]">{r.ic_premium}</span></>}
        </span>

        {/* ── Section 2: Exec summary ── */}
        {r.valuation_exec_summary && (
          <span className="block border-t border-[#EDE7E0] mt-2 pt-2 prose-tufte text-[11px] text-[#1E1A14] leading-relaxed">
            {r.valuation_exec_summary}
          </span>
        )}

        {/* ── Section 3: Multiples + market assumptions ── */}
        {(r.current_multiples || r.market_assumptions) && (
          <span className="block border-t border-[#EDE7E0] mt-2 pt-2 space-y-1">
            {r.current_multiples && (
              <span className="block text-[11px] font-mono text-[#8C7E70]">
                {r.current_multiples}
              </span>
            )}
            {r.market_assumptions && (
              <span className="block text-[11px] text-[#A89E94] leading-relaxed">
                {r.market_assumptions}
              </span>
            )}
          </span>
        )}

        {/* ── Section 4: Peer comparison ── */}
        {r.peer_comparison && (
          <span className="block border-t border-[#EDE7E0] mt-2 pt-2 text-[11px] text-[#6E6258] leading-relaxed">
            {r.peer_comparison}
          </span>
        )}

        {/* ── Section 5: Margin of safety ── */}
        {r.margin_of_safety && (
          <span className="block border-t border-[#EDE7E0] mt-2 pt-2 text-[11px] text-[#A89E94] leading-relaxed">
            {r.margin_of_safety}
          </span>
        )}

        {/* ── Section 6: Valuation summary ── */}
        {r.valuation_summary && (
          <span className="block border-t border-[#EDE7E0] mt-2 pt-2 prose-tufte text-[11px] text-[#6E6258] leading-relaxed">
            {r.valuation_summary}
          </span>
        )}
      </span>
    );
  }

  if (agentKey === "communication") {
    const r = result as CommOutput;
    return (
      <span className="text-[#A89E94]">
        gate <span className={r.enter_gate.effective_score >= 5 ? "text-[#C8804A]" : "text-[#C84848]"}>
          {r.enter_gate.effective_score}/5
        </span>
        {" · "}
        <span className={r.publication_possible ? "text-[#C8804A]" : "text-[#C84848]"}>
          {r.publication_possible ? r.output_type?.toLowerCase().replace("_", " ") : "drop"}
        </span>
        {" · "}conf <span className="text-[#8C7E70]">{((r.audit_trail?.final_confidence ?? 0) * 100).toFixed(0)}%</span>
      </span>
    );
  }

  return null;
}

export default function AgentStep({ agentKey, label, desc, event, logs, analystNote, pipelineRunning }: Props) {
  const isActive  = event?.status === "running";
  const isDone    = event?.status === "done";
  const isWaiting = !event;
  const hasLogs   = (logs ?? []).length > 0;

  return (
    <div className={`border-b py-3 flex items-start gap-3 transition-colors ${
      isActive ? "border-[#C8804A]/30 running-border" :
      isDone   ? "border-[#E4DDD6]" :
                 "border-[#EDE7E0]"
    }`}>
      <div className="pt-[3px] flex-shrink-0">{statusDot(event?.status)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-3">
          <span className={`text-xs font-semibold tracking-widest ${
            isDone ? "text-[#1E1A14]" : isActive ? "text-[#C8804A]" : "text-[#C0B8AC]"
          }`}>
            {label}
          </span>
          {!isActive && <span className="t-label">{desc}</span>}
          {isActive  && <span className="text-[#C8804A] text-[11px]">running…</span>}
          {isWaiting && pipelineRunning && <span className="t-label">queued</span>}
        </div>

        {/* Live calculation logs — visible while running */}
        {isActive && hasLogs && (
          <div className="mt-2 space-y-0.5">
            {(logs ?? []).map((line, i) => (
              <div key={i} className="text-[11px] font-mono text-[#8C7E70] leading-relaxed">
                {line}
              </div>
            ))}
          </div>
        )}

        {/* Compact log summary — visible after done (hidden for intel/valuation, which have full structured summaries) */}
        {isDone && hasLogs && agentKey !== "intel" && agentKey !== "valuation" && (
          <div className="mt-1.5 space-y-0.5">
            {(logs ?? []).map((line, i) => (
              <div key={i} className="text-[11px] font-mono text-[#C0B8AC] leading-relaxed">
                {line}
              </div>
            ))}
          </div>
        )}

        {/* Structured summary */}
        {isDone && event?.result != null && (
          <div className="mt-1 text-[11px] leading-relaxed border-t border-[#EDE7E0] pt-1">
            <AgentSummary agentKey={agentKey} result={event.result} />
          </div>
        )}

        {/* Analyst note */}
        {isDone && analystNote && (
          <div className="mt-1.5 text-[11px] text-[#A89E94] italic border-l-2 border-[#D8D0C8] pl-2">
            analyst: {analystNote}
          </div>
        )}
      </div>
    </div>
  );
}
