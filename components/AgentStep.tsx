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
  if (!status)              return <span className="w-1.5 h-1.5 rounded-full bg-[#2a2a2a] inline-block mt-0.5" />;
  if (status === "running") return <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block mt-0.5 animate-pulse" />;
  if (status === "done")    return <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block mt-0.5" />;
  return                           <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block mt-0.5" />;
}

function AgentSummary({ agentKey, result }: { agentKey: string; result: unknown }) {
  if (!result) return null;

  if (agentKey === "scout") {
    const r = result as ScoutOutput;
    const dc = r.decision === "MUST_COVER" ? "text-green-400" : r.decision === "REVIEW_ZONE" ? "text-yellow-400" : "text-red-400";
    return (
      <span className="text-[#555]">
        score <span className="text-green-400">{r.alpha_score.total}</span>
        {" · "}<span className={dc}>{r.decision}</span>
        {" · "}{r.downstream_mode} {" · "}{r.horizon_tag}
        {r.confidence != null && <>{" · "}conf <span className="text-[#888]">{(r.confidence * 100).toFixed(0)}%</span></>}
        {r.decision_rationale && (
          <span className="block mt-0.5 prose-tufte text-[11px]">{r.decision_rationale}</span>
        )}
      </span>
    );
  }

  if (agentKey === "intel") {
    const r = result as IntelBundle;
    return (
      <span className="text-[#555]">
        surfaced <span className="text-[#aaa]">{r.surfaced_count}</span>
        {" · "}mosaic {r.mosaic_clear ? <span className="text-green-400">clear</span> : <span className="text-red-400">halt</span>}
        {" · "}mgmt <span className="text-[#aaa]">{r.mgmt_comm_score}</span>
      </span>
    );
  }

  if (agentKey === "forensic_pre" || agentKey === "forensic") {
    const r = result as ForensicProfile;
    return (
      <span className="text-[#555]">
        risk <span className="text-yellow-400">{r.risk_score}</span>
        {" · "}
        <span className={r.recommendation === "BLOCK" ? "text-red-400" : r.recommendation === "CLEAR" ? "text-green-400" : "text-yellow-400"}>
          {r.recommendation.toLowerCase()}
        </span>
        {" · "}{(r.flags ?? []).length} flag{(r.flags ?? []).length !== 1 ? "s" : ""}
        {" · "}haircut <span className="text-[#888]">{(r.eps_haircut_total ?? 0).toFixed(0)}%</span>
      </span>
    );
  }

  if (agentKey === "cf") {
    const r = result as CFOutput;
    return (
      <span className="text-[#555]">
        {(r.factors ?? []).length} factors
        {" · "}EV <span className="text-green-400">${r.expected_value_pt}</span>
        {" · "}{(r.scenarios ?? []).map(s => `${s.type} ${(s.probability * 100).toFixed(0)}%`).join(" · ")}
      </span>
    );
  }

  if (agentKey === "valuation") {
    const r = result as ValuationModel;
    return (
      <span className="text-[#555]">
        PT <span className="text-green-400">${r.pt_12m}</span>
        {" · "}
        <span className={r.rating === "BUY" ? "text-green-400" : r.rating === "UNDERPERFORM" ? "text-red-400" : "text-yellow-400"}>
          {r.rating.toLowerCase()}
        </span>
        {" · "}RR <span className="text-[#888]">{(r.rr_ratio ?? 0).toFixed(1)}:1</span>
        {" · "}FaVeS <span className="text-[#888]">{r.faves_score?.total ?? "?"}/9</span>
      </span>
    );
  }

  if (agentKey === "communication") {
    const r = result as CommOutput;
    return (
      <span className="text-[#555]">
        gate <span className={r.enter_gate.effective_score >= 5 ? "text-green-400" : "text-red-400"}>
          {r.enter_gate.effective_score}/5
        </span>
        {" · "}
        <span className={r.publication_possible ? "text-green-400" : "text-red-400"}>
          {r.publication_possible ? r.output_type.toLowerCase().replace("_", " ") : "drop"}
        </span>
        {" · "}conf <span className="text-[#888]">{((r.audit_trail?.final_confidence ?? 0) * 100).toFixed(0)}%</span>
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
      isActive ? "border-yellow-500/30 running-border" :
      isDone   ? "border-[#1e1e1e]" :
                 "border-[#181818]"
    }`}>
      <div className="pt-[3px] flex-shrink-0">{statusDot(event?.status)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-3">
          <span className={`text-xs font-semibold tracking-widest ${
            isDone ? "text-gray-300" : isActive ? "text-yellow-400" : "text-[#3a3a3a]"
          }`}>
            {label}
          </span>
          {!isActive && <span className="t-label">{desc}</span>}
          {isActive  && <span className="text-yellow-500 text-[11px]">running…</span>}
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
