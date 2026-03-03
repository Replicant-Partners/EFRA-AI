"use client";

import { useState } from "react";
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

const AGENTS = [
  { key: "scout",        label: "01 · SCOUT",           desc: "Alpha Score" },
  { key: "intel",        label: "02 · INTEL",           desc: "News + Mosaic" },
  { key: "forensic_pre", label: "04 · FORENSIC",        desc: "Pre-screen" },
  { key: "cf",           label: "03 · CRITICAL FACTOR", desc: "Thesis + Scenarios" },
  { key: "forensic",     label: "04 · FORENSIC",        desc: "Full Scan" },
  { key: "valuation",    label: "05 · VALUATION",       desc: "Price Target" },
  { key: "communication",label: "06 · COMMUNICATION",   desc: "ENTER Gate + Publish" },
];

export default function Home() {
  const [phase, setPhase] = useState<"form" | "running" | "done">("form");
  const [events, setEvents] = useState<Record<string, AgentEvent>>({});
  const [finalState, setFinalState] = useState<PipelineState | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: {
    ticker: string;
    analyst_id: string;
    catalyst: string;
    mode: "valentine" | "gunn" | "dual";
    news: string[];
  }) {
    setPhase("running");
    setEvents({});
    setFinalState(null);
    setError(null);

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

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

          const event: AgentEvent = JSON.parse(json);
          setEvents(prev => ({ ...prev, [event.agent]: event }));

          if (event.final) {
            setFinalState(event.result as PipelineState);
            setPhase("done");
          }
        }
      }
    } catch (err) {
      setError(String(err));
      setPhase("done");
    }
  }

  function handleReset() {
    setPhase("form");
    setEvents({});
    setFinalState(null);
    setError(null);
  }

  return (
    <div className="space-y-8">
      {phase === "form" && (
        <IdeaForm onSubmit={handleSubmit} />
      )}

      {(phase === "running" || phase === "done") && (
        <div className="space-y-6">
          {/* Pipeline header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[#C8804A] font-bold text-xl">
                {finalState?.ticker ?? "RUNNING PIPELINE"}
              </h2>
              <p className="text-[#A89E94] text-sm mt-1">
                {phase === "running" ? "Pipeline executing…" : `Pipeline ${finalState?.status ?? "DONE"}`}
              </p>
            </div>
            {phase === "done" && (
              <button
                onClick={handleReset}
                className="text-xs text-[#A89E94] border border-[#D8D0C8] px-3 py-1.5 hover:border-[#C8804A] hover:text-[#C8804A] transition-colors"
              >
                ← New idea
              </button>
            )}
          </div>

          {/* Agent steps */}
          <div className="space-y-2">
            {AGENTS.map(agent => (
              <AgentStep
                key={agent.key}
                agentKey={agent.key}
                label={agent.label}
                desc={agent.desc}
                event={events[agent.key]}
                pipelineRunning={phase === "running"}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="border border-[#C84848] bg-[#C84848]/5 p-4 text-[#C84848] text-sm">
              ERROR: {error}
            </div>
          )}

          {/* Final result */}
          {phase === "done" && finalState && !error && (
            <ResultPanel state={finalState} />
          )}
        </div>
      )}
    </div>
  );
}
