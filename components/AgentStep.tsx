"use client";

import type { AgentEvent } from "@/app/page";
import type { ScoutOutput, IntelBundle, ForensicProfile, CFOutput, ValuationModel, CommOutput } from "@/src/shared/types";

interface Props {
  agentKey: string;
  label: string;
  desc: string;
  event?: AgentEvent;
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
        score <span className="text-[#C8804A]">{r.alpha_score.total}</span>
        {" · "}<span className={dc}>{r.decision}</span>
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
    return (
      <span className="text-[#A89E94]">
        surfaced <span className="text-[#6E6258]">{r.surfaced_count}</span>
        {" · "}mosaic {r.mosaic_clear ? <span className="text-[#C8804A]">clear</span> : <span className="text-[#C84848]">halt</span>}
        {" · "}mgmt <span className="text-[#6E6258]">{r.mgmt_comm_score}</span>
      </span>
    );
  }

  if (agentKey === "forensic_pre" || agentKey === "forensic") {
    const r = result as ForensicProfile;
    return (
      <span className="text-[#A89E94]">
        risk <span className="text-[#C89040]">{r.risk_score}</span>
        {" · "}
        <span className={r.recommendation === "BLOCK" ? "text-[#C84848]" : r.recommendation === "CLEAR" ? "text-[#C8804A]" : "text-[#C89040]"}>
          {r.recommendation.toLowerCase()}
        </span>
        {" · "}{(r.flags ?? []).length} flag{(r.flags ?? []).length !== 1 ? "s" : ""}
        {" · "}haircut <span className="text-[#8C7E70]">{(r.eps_haircut_total ?? 0).toFixed(0)}%</span>
      </span>
    );
  }

  if (agentKey === "cf") {
    const r = result as CFOutput;
    return (
      <span className="text-[#A89E94]">
        {(r.factors ?? []).length} factors
        {" · "}EV <span className="text-[#C8804A]">${r.expected_value_pt}</span>
        {" · "}{(r.scenarios ?? []).map(s => `${s.type} ${(s.probability * 100).toFixed(0)}%`).join(" · ")}
      </span>
    );
  }

  if (agentKey === "valuation") {
    const r = result as ValuationModel;
    return (
      <span className="text-[#A89E94]">
        PT <span className="text-[#C8804A]">${r.pt_12m}</span>
        {" · "}
        <span className={r.rating === "BUY" ? "text-[#C8804A]" : r.rating === "UNDERPERFORM" ? "text-[#C84848]" : "text-[#C89040]"}>
          {r.rating.toLowerCase()}
        </span>
        {" · "}RR <span className="text-[#8C7E70]">{(r.rr_ratio ?? 0).toFixed(1)}:1</span>
        {" · "}FaVeS <span className="text-[#8C7E70]">{r.faves_score?.total ?? "?"}/9</span>
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
          {r.publication_possible ? r.output_type.toLowerCase().replace("_", " ") : "drop"}
        </span>
        {" · "}conf <span className="text-[#8C7E70]">{((r.audit_trail?.final_confidence ?? 0) * 100).toFixed(0)}%</span>
      </span>
    );
  }

  return null;
}

export default function AgentStep({ agentKey, label, desc, event, pipelineRunning }: Props) {
  const isActive  = event?.status === "running";
  const isDone    = event?.status === "done";
  const isWaiting = !event;

  return (
    <div className={`border-b py-2.5 flex items-start gap-3 transition-colors ${
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
        {isDone && event?.result != null && (
          <div className="mt-0.5 text-[11px] leading-relaxed">
            <AgentSummary agentKey={agentKey} result={event.result} />
          </div>
        )}
      </div>
    </div>
  );
}
