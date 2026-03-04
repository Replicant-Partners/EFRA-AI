"use client";

import { useState, useRef } from "react";
import IdeaForm from "@/components/IdeaForm";
import AgentStep from "@/components/AgentStep";
import ResultPanel from "@/components/ResultPanel";
import type { PipelineState } from "@/src/shared/types";

export type AgentEvent = {
  agent: string;
  status: "running" | "done" | "dropped" | "halted" | "error";
  result?: unknown;
  reason?: string;
  final?: boolean;
  error?: string;
};

type AgentKey = "scout" | "intel" | "forensic_pre" | "cf" | "forensic" | "valuation" | "communication";

type FormData = {
  ticker: string;
  analyst_id: string;
  catalyst: string;
  mode: "valentine" | "gunn" | "dual";
  news: string[];
};

const AGENTS: { key: AgentKey; label: string; desc: string }[] = [
  { key: "scout",         label: "01 · SCOUT",           desc: "Alpha Score" },
  { key: "intel",         label: "02 · INTEL",           desc: "News + Mosaic" },
  { key: "forensic_pre",  label: "03 · FORENSIC",        desc: "Pre-screen" },
  { key: "cf",            label: "04 · CRITICAL FACTOR", desc: "Thesis + Scenarios" },
  { key: "forensic",      label: "05 · FORENSIC",        desc: "Full Scan" },
  { key: "valuation",     label: "06 · VALUATION",       desc: "Price Target" },
  { key: "communication", label: "07 · COMMUNICATION",   desc: "ENTER Gate + Publish" },
];

// maps agent key → which key in PipelineState to store result
const STATE_KEY: Record<AgentKey, keyof PipelineState> = {
  scout:         "scout",
  intel:         "intel",
  forensic_pre:  "forensic",
  cf:            "cf",
  forensic:      "forensic",
  valuation:     "valuation",
  communication: "communication",
};

export default function Home() {
  const [phase, setPhase] = useState<"form" | "pipeline">("form");
  const [stepIdx, setStepIdx] = useState(0);
  const [stepPhase, setStepPhase] = useState<"running" | "approval" | "idle">("idle");
  const [events, setEvents] = useState<Record<string, AgentEvent>>({});
  const [agentLogs, setAgentLogs] = useState<Record<string, string[]>>({});
  const [analystNotes, setAnalystNotes] = useState<Record<string, string>>({});
  const [pendingNote, setPendingNote] = useState("");
  const [finalState, setFinalState] = useState<PipelineState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  // Refs avoid stale closures in async SSE consumer
  const formDataRef = useRef<FormData | null>(null);
  const pipeStateRef = useRef<Partial<PipelineState> & { idea_id?: string }>({});

  async function runStep(idx: number) {
    if (idx >= AGENTS.length) {
      setIsDone(true);
      setStepPhase("idle");
      return;
    }

    const agent = AGENTS[idx];
    const fd = formDataRef.current!;

    setStepIdx(idx);
    setStepPhase("running");
    setEvents(prev => ({ ...prev, [agent.key]: { agent: agent.key, status: "running" } }));
    setAgentLogs(prev => ({ ...prev, [agent.key]: [] }));

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent: agent.key,
          ticker: fd.ticker,
          analyst_id: fd.analyst_id,
          catalyst: fd.catalyst,
          mode: fd.mode,
          news: fd.news,
          state: pipeStateRef.current,
        }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;

          const msg = JSON.parse(json) as {
            type: string;
            msg?: string;
            result?: unknown;
            final?: boolean;
            error?: string;
          };

          if (msg.type === "log" && msg.msg) {
            setAgentLogs(prev => ({
              ...prev,
              [agent.key]: [...(prev[agent.key] ?? []), msg.msg!],
            }));
          } else if (msg.type === "done") {
            // Store result in ref so next agent can access it immediately
            const stateKey = STATE_KEY[agent.key];
            pipeStateRef.current = { ...pipeStateRef.current, [stateKey]: msg.result };

            setEvents(prev => ({
              ...prev,
              [agent.key]: { agent: agent.key, status: "done", result: msg.result, final: msg.final },
            }));

            if (msg.final) {
              const finalPipeState: PipelineState = {
                ticker: fd.ticker,
                status: "COMPLETED",
                ...(pipeStateRef.current as Partial<PipelineState>),
              } as PipelineState;
              setFinalState(finalPipeState);
              setIsDone(true);
              setStepPhase("idle");
            } else {
              setStepPhase("approval");
            }
          } else if (msg.type === "error") {
            setError(msg.error ?? "Unknown error");
            setEvents(prev => ({
              ...prev,
              [agent.key]: { agent: agent.key, status: "error", error: msg.error },
            }));
            setIsDone(true);
            setStepPhase("idle");
          }
        }
      }
    } catch (err) {
      setError(String(err));
      setEvents(prev => ({
        ...prev,
        [agent.key]: { agent: agent.key, status: "error", error: String(err) },
      }));
      setIsDone(true);
      setStepPhase("idle");
    }
  }

  function handleApprove() {
    const agentKey = AGENTS[stepIdx].key;
    if (pendingNote.trim()) {
      setAnalystNotes(prev => ({ ...prev, [agentKey]: pendingNote.trim() }));
    }
    setPendingNote("");
    runStep(stepIdx + 1);
  }

  function handleSubmit(data: FormData) {
    formDataRef.current = data;
    pipeStateRef.current = { idea_id: `idea_${Date.now()}` };
    setPhase("pipeline");
    setStepIdx(0);
    setStepPhase("idle");
    setEvents({});
    setAgentLogs({});
    setAnalystNotes({});
    setPendingNote("");
    setFinalState(null);
    setError(null);
    setIsDone(false);
    runStep(0);
  }

  function handleReset() {
    setPhase("form");
    setStepIdx(0);
    setStepPhase("idle");
    setEvents({});
    setAgentLogs({});
    setAnalystNotes({});
    setPendingNote("");
    setFinalState(null);
    setError(null);
    setIsDone(false);
    formDataRef.current = null;
    pipeStateRef.current = {};
  }

  const isApproving = stepPhase === "approval";
  const fd = formDataRef.current;

  return (
    <div className="space-y-8">
      {phase === "form" && (
        <>
          <IdeaForm onSubmit={handleSubmit} />
          <div className="text-center mt-2">
            <a href="/docs" className="text-[11px] text-[#C0B8AC] hover:text-[#C8804A] transition-colors tracking-wider">
              Pipeline Guide →
            </a>
          </div>
        </>
      )}

      {phase === "pipeline" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-baseline justify-between">
            <div>
              <h1 className="text-lg font-bold text-[#C8804A] tracking-widest uppercase">
                {fd?.ticker ?? "PIPELINE"}
              </h1>
              <p className="t-label mt-1">
                {isDone
                  ? finalState ? `Pipeline ${finalState.status}` : "Pipeline complete"
                  : isApproving
                  ? `${AGENTS[stepIdx].label} complete — review and approve`
                  : `Running ${AGENTS[stepIdx]?.label ?? "…"}`}
              </p>
            </div>
            {isDone && (
              <button
                onClick={handleReset}
                className="text-xs text-[#A89E94] hover:text-[#C8804A] transition-colors"
              >
                ← New idea
              </button>
            )}
          </div>

          <hr className="t-rule" />

          {/* Agent steps */}
          <div>
            {AGENTS.map(agent => (
              <AgentStep
                key={agent.key}
                agentKey={agent.key}
                label={agent.label}
                desc={agent.desc}
                event={events[agent.key]}
                logs={agentLogs[agent.key]}
                analystNote={analystNotes[agent.key]}
                pipelineRunning={!isDone}
              />
            ))}
          </div>

          {/* Approval panel */}
          {isApproving && stepIdx < AGENTS.length - 1 && (
            <div className="border-t border-[#E4DDD6] pt-6 space-y-4">
              <div>
                <div className="t-label mb-1">{AGENTS[stepIdx].label} · complete</div>
                <p className="text-sm text-[#6E6258]">
                  Review the analysis above. Add context or corrections before{" "}
                  <span className="text-[#1E1A14]">{AGENTS[stepIdx + 1].label}</span> runs.
                </p>
              </div>
              <textarea
                value={pendingNote}
                onChange={e => setPendingNote(e.target.value)}
                placeholder="Optional: add context, corrections, or analyst notes for the next agent…"
                rows={3}
                className="w-full bg-transparent border-b border-[#D8D0C8] pb-1 text-sm text-[#1E1A14] placeholder-[#D8D0C8] focus:outline-none focus:border-[#C8804A] resize-none transition-colors leading-relaxed"
              />
              <button
                onClick={handleApprove}
                className="text-xs font-bold tracking-widest uppercase text-[#C8804A] hover:text-[#A86030] border-b border-[#C8804A]/40 hover:border-[#A86030] pb-0.5 transition-colors"
              >
                Approve & Continue → {AGENTS[stepIdx + 1].label}
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-[#C84848]">Error: {error}</p>
          )}

          {/* Final result */}
          {isDone && finalState && !error && (
            <ResultPanel state={finalState} />
          )}
        </div>
      )}
    </div>
  );
}
