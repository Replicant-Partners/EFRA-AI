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

function statusDot(status?: AgentEvent["status"], running?: boolean) {
  if (!status && !running) return <span className="w-2 h-2 rounded-full bg-[#2a2a2a] inline-block" />;
  if (status === "running" || (!status && running)) return <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block animate-pulse" />;
  if (status === "done") return <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />;
  return <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />;
}

function AgentSummary({ agentKey, result }: { agentKey: string; result: unknown }) {
  if (!result) return null;

  if (agentKey === "scout") {
    const r = result as ScoutOutput;
    const decisionColor = r.decision === "MUST_COVER" ? "text-green-400" : r.decision === "REVIEW_ZONE" ? "text-yellow-400" : "text-red-400";
    return (
      <span className="text-gray-400">
        score <span className="text-green-400 font-bold">{r.alpha_score.total}</span>
        {" · "}<span className={`font-bold ${decisionColor}`}>{r.decision}</span>
        {" · "}{r.downstream_mode}
        {" · "}{r.horizon_tag}
        {r.confidence != null && <>{" · "}conf <span className="text-green-400">{(r.confidence * 100).toFixed(0)}%</span></>}
        {r.decision_rationale && <><br /><span className="text-gray-600 text-xs italic">{r.decision_rationale}</span></>}
      </span>
    );
  }

  if (agentKey === "intel") {
    const r = result as IntelBundle;
    return (
      <span className="text-gray-400">
        surfaced <span className="text-green-400">{r.surfaced_count}</span>
        {" · "}mosaic {r.mosaic_clear ? <span className="text-green-400">CLEAR</span> : <span className="text-red-400">HALT</span>}
        {" · "}mgmt <span className="text-green-400">{r.mgmt_comm_score}</span>
      </span>
    );
  }

  if (agentKey === "forensic_pre" || agentKey === "forensic") {
    const r = result as ForensicProfile;
    return (
      <span className="text-gray-400">
        risk <span className="text-yellow-400">{r.risk_score}</span>
        {" · "}
        <span className={r.recommendation === "BLOCK" ? "text-red-400" : r.recommendation === "CLEAR" ? "text-green-400" : "text-yellow-400"}>
          {r.recommendation}
        </span>
        {" · "}flags {(r.flags ?? []).length}
        {" · "}haircut <span className="text-yellow-400">{(r.eps_haircut_total ?? 0).toFixed(0)}%</span>
      </span>
    );
  }

  if (agentKey === "cf") {
    const r = result as CFOutput;
    return (
      <span className="text-gray-400">
        factors <span className="text-green-400">{(r.factors ?? []).length}</span>
        {" · "}EV PT <span className="text-green-400">${r.expected_value_pt}</span>
        {" · "}
        {(r.scenarios ?? []).map(s => `${s.type}(${(s.probability * 100).toFixed(0)}%)`).join(" ")}
      </span>
    );
  }

  if (agentKey === "valuation") {
    const r = result as ValuationModel;
    return (
      <span className="text-gray-400">
        PT <span className="text-green-400 font-bold">${r.pt_12m}</span>
        {" · "}
        <span className={r.rating === "BUY" ? "text-green-400" : r.rating === "UNDERPERFORM" ? "text-red-400" : "text-yellow-400"}>
          {r.rating}
        </span>
        {" · "}RR <span className="text-green-400">{(r.rr_ratio ?? 0).toFixed(1)}:1</span>
        {" · "}FaVeS <span className="text-green-400">{r.faves_score?.total ?? "?"}/9</span>
      </span>
    );
  }

  if (agentKey === "communication") {
    const r = result as CommOutput;
    return (
      <span className="text-gray-400">
        gate <span className={r.enter_gate.effective_score >= 5 ? "text-green-400" : "text-red-400"}>
          {r.enter_gate.effective_score}/5
        </span>
        {" · "}
        <span className={r.publication_possible ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
          {r.publication_possible ? r.output_type : "DROP"}
        </span>
        {" · "}conf <span className="text-green-400">{(r.audit_trail.final_confidence * 100).toFixed(0)}%</span>
      </span>
    );
  }

  return null;
}

export default function AgentStep({ agentKey, label, desc, event, pipelineRunning }: Props) {
  const isActive = event?.status === "running";
  const isDone = event?.status === "done";
  const isWaiting = !event;

  return (
    <div
      className={`border px-4 py-3 flex items-start gap-4 transition-colors ${
        isActive
          ? "border-yellow-500/50 bg-yellow-500/5 running-border"
          : isDone
          ? "border-[#2a2a2a] bg-[#1a1a1a]"
          : "border-[#1e1e1e]"
      }`}
    >
      <div className="pt-1">{statusDot(event?.status, pipelineRunning && isWaiting && false)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold tracking-widest ${isDone ? "text-gray-300" : "text-gray-600"}`}>
            {label}
          </span>
          <span className="text-gray-600 text-xs">{desc}</span>
          {isActive && (
            <span className="text-yellow-500 text-xs animate-pulse">running…</span>
          )}
        </div>
        {isDone && event?.result != null && (
          <div className="mt-1 text-xs">
            <AgentSummary agentKey={agentKey} result={event.result} />
          </div>
        )}
      </div>
    </div>
  );
}
