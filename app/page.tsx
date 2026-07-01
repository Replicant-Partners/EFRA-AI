"use client";

import { useState, useRef } from "react";
import IdeaForm from "@/components/IdeaForm";
import AgentStep from "@/components/AgentStep";
import ResultPanel from "@/components/ResultPanel";
import RevisePanel from "@/components/RevisePanel";
import type { PipelineState, AgentEvent } from "@/src/shared/types";

export type { AgentEvent };

type AgentKey = "scout" | "intel" | "forensic_pre" | "cf" | "forensic" | "valuation" | "communication" | "kata" | "lens";

type ResearchAgentKey = "company" | "gorilla" | "imagine" | "thesis";

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
  { key: "kata",          label: "07 · KATA",            desc: "Improvement Coach" },
  { key: "communication", label: "08 · COMMUNICATION",   desc: "ENTER Gate + Publish" },
  { key: "lens",          label: "09 · LENS",            desc: "Consistency Auditor" },
];

const RESEARCH_AGENTS: { key: ResearchAgentKey; label: string; desc: string }[] = [
  { key: "company", label: "13 · COMPANY",  desc: "Deep Company Analysis" },
  { key: "gorilla", label: "10 · GORILLA",  desc: "Value Gorilla Framework" },
  { key: "imagine", label: "11 · IMAGINE",  desc: "Long-Range Scenarios" },
  { key: "thesis",  label: "12 · THESIS",   desc: "Investment Thesis" },
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
  kata:          "kata",
  lens:          "lens",
};

const RESEARCH_STATE_KEY: Record<ResearchAgentKey, string> = {
  company: "company",
  gorilla: "gorilla",
  imagine: "imagine",
  thesis:  "thesis",
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
  const [savedAnalysisId, setSavedAnalysisId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Refs avoid stale closures in async SSE consumer
  const formDataRef = useRef<FormData | null>(null);
  const pipeStateRef = useRef<Partial<PipelineState> & { idea_id?: string }>({});

  // ── Research pipeline state ────────────────────────────────────────────────
  const [researchStepIdx,   setResearchStepIdx]   = useState(0);
  const [researchRunning,   setResearchRunning]   = useState(false);
  const [researchDone,      setResearchDone]      = useState(false);
  const [researchEvents,    setResearchEvents]    = useState<Record<string, AgentEvent>>({});
  const [researchLogs,      setResearchLogs]      = useState<Record<string, string[]>>({});
  const [researchError, setResearchError] = useState<string | null>(null);
  const researchStateRef = useRef<Partial<Record<string, unknown>>>({});

  async function callAgent(agentKey: string, fd: FormData, retryCount = 0): Promise<Response> {
    const controller = new AbortController();
    // 4 min timeout per agent — enough for Opus models, killed cleanly on hang
    const timer = setTimeout(() => controller.abort(), 4 * 60 * 1000);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent: agentKey,
          ticker: fd.ticker,
          analyst_id: fd.analyst_id,
          catalyst: fd.catalyst,
          mode: fd.mode,
          news: fd.news,
          state: pipeStateRef.current,
        }),
      });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      // Retry once on network error (transient Railway disconnect)
      if (retryCount === 0 && String(err).includes("network")) {
        await new Promise(r => setTimeout(r, 1500));
        return callAgent(agentKey, fd, 1);
      }
      throw err;
    }
  }

  async function callResearchAgent(agentKey: string, fd: FormData, retryCount = 0): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4 * 60 * 1000);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent: agentKey,
          ticker: fd.ticker,
          analyst_id: fd.analyst_id,
          catalyst: fd.catalyst,
          mode: fd.mode,
          news: fd.news,
          state: { ...pipeStateRef.current, ...researchStateRef.current },
        }),
      });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      if (retryCount === 0 && String(err).includes("network")) {
        await new Promise(r => setTimeout(r, 1500));
        return callResearchAgent(agentKey, fd, 1);
      }
      throw err;
    }
  }

  async function runResearchStep(idx: number) {
    if (idx >= RESEARCH_AGENTS.length) {
      setResearchDone(true);
      setResearchRunning(false);
      return;
    }

    const agent = RESEARCH_AGENTS[idx];
    const fd = formDataRef.current!;

    setResearchStepIdx(idx);
    setResearchRunning(true);
    setResearchEvents(prev => ({ ...prev, [agent.key]: { agent: agent.key, status: "running" } }));
    setResearchLogs(prev => ({ ...prev, [agent.key]: [] }));

    try {
      const res = await callResearchAgent(agent.key, fd);
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
            setResearchLogs(prev => ({
              ...prev,
              [agent.key]: [...(prev[agent.key] ?? []), msg.msg!],
            }));
          } else if (msg.type === "done") {
            const stateKey = RESEARCH_STATE_KEY[agent.key];
            researchStateRef.current = { ...researchStateRef.current, [stateKey]: msg.result };

            setResearchEvents(prev => ({
              ...prev,
              [agent.key]: { agent: agent.key, status: "done", result: msg.result, final: msg.final },
            }));

            if (msg.final) {
              setResearchDone(true);
              setResearchRunning(false);
            } else {
              // Auto-advance — no approval step in research pipeline
              await runResearchStep(idx + 1);
            }
          } else if (msg.type === "error") {
            setResearchEvents(prev => ({
              ...prev,
              [agent.key]: { agent: agent.key, status: "error", error: msg.error },
            }));
            setResearchError(msg.error ?? "Unknown error");
            setResearchRunning(false);
          }
        }
      }
    } catch (err) {
      const msg = String(err);
      const isAbort = msg.includes("abort") || msg.includes("AbortError");
      const display = isAbort
        ? `Timeout — agent ${agent.label} took too long. Try again.`
        : msg;
      setResearchEvents(prev => ({
        ...prev,
        [agent.key]: { agent: agent.key, status: "error", error: display },
      }));
      setResearchError(display);
      setResearchRunning(false);
    }
  }

  function startResearch() {
    researchStateRef.current = {};
    setResearchStepIdx(0);
    setResearchRunning(false);
    setResearchDone(false);
    setResearchError(null);
    setResearchEvents({});
    setResearchLogs({});
    runResearchStep(0);
  }

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
      const res = await callAgent(agent.key, fd);

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
              saveToLibrary(finalPipeState);
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
      const msg = String(err);
      const isAbort = msg.includes("abort") || msg.includes("AbortError");
      const display = isAbort
        ? `Timeout — agent ${agent.label} took too long. Try again.`
        : msg;
      setError(display);
      setEvents(prev => ({
        ...prev,
        [agent.key]: { agent: agent.key, status: "error", error: display },
      }));
      setIsDone(true);
      setStepPhase("idle");
    }
  }

  function handleApprove() {
    const agentKey = AGENTS[stepIdx].key;
    const note = pendingNote.trim();
    if (note) {
      // Save to React state (for UI display)
      setAnalystNotes(prev => ({ ...prev, [agentKey]: note }));
      // Inject into pipeline state so the next agent receives it
      pipeStateRef.current = {
        ...pipeStateRef.current,
        analyst_notes: {
          ...(pipeStateRef.current.analyst_notes ?? {}),
          [agentKey]: note,
        },
      };
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

  async function saveToLibrary(state: PipelineState) {
    if (!formDataRef.current) return;
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/analyses", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker:     formDataRef.current.ticker,
          analyst_id: formDataRef.current.analyst_id,
          catalyst:   formDataRef.current.catalyst,
          mode:       formDataRef.current.mode,
          state,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { id: string };
      setSavedAnalysisId(data.id);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
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
    setSavedAnalysisId(null);
    setSaveStatus("idle");
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
            {AGENTS.map(agent => {
              // Inject CF scenarios into the valuation event so the price table populates
              const cfScenarios = (events["cf"]?.result as { scenarios?: unknown[] })?.scenarios ?? [];
              const event = agent.key === "valuation" && events["valuation"]
                ? { ...events["valuation"], result: { ...(events["valuation"].result as Record<string, unknown> ?? {}), _cf_scenarios: cfScenarios } }
                : events[agent.key];
              return (
                <AgentStep
                  key={agent.key}
                  agentKey={agent.key}
                  label={agent.label}
                  desc={agent.desc}
                  event={event}
                  logs={agentLogs[agent.key]}
                  analystNote={analystNotes[agent.key]}
                  pipelineRunning={!isDone}
                />
              );
            })}
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

          {/* Error — with retry button */}
          {error && (
            <div className="border-t border-[#C84848]/30 pt-4 space-y-3">
              <p className="text-xs text-[#C84848]">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setIsDone(false);
                  setEvents(prev => {
                    const next = { ...prev };
                    delete next[AGENTS[stepIdx].key];
                    return next;
                  });
                  runStep(stepIdx);
                }}
                className="text-xs font-bold tracking-widest uppercase text-[#C8804A] hover:text-[#A86030] border-b border-[#C8804A]/40 hover:border-[#A86030] pb-0.5 transition-colors"
              >
                ↺ Retry {AGENTS[stepIdx]?.label}
              </button>
            </div>
          )}

          {/* Save status */}
          {isDone && !error && saveStatus === "saving" && (
            <p className="t-label text-[#A89E94]">saving to library…</p>
          )}
          {isDone && !error && saveStatus === "saved" && savedAnalysisId && (
            <div className="flex items-center gap-4">
              <span className="t-label text-[#7A9E6A]">saved to library</span>
              <a
                href={`/library/${savedAnalysisId}`}
                className="text-xs text-[#C8804A] hover:text-[#A86030] border-b border-[#C8804A]/40 hover:border-[#A86030] pb-0.5 transition-colors"
              >
                View in Library →
              </a>
            </div>
          )}
          {isDone && !error && saveStatus === "error" && (
            <p className="t-label text-[#C84848]">save failed — results still visible above</p>
          )}

          {/* Final result */}
          {isDone && finalState && !error && (
            <ResultPanel state={finalState} />
          )}

          {/* Revise panel — only when analysis is saved */}
          {isDone && finalState && !error && savedAnalysisId && (
            <RevisePanel analysisId={savedAnalysisId} />
          )}

          {/* Research Pipeline */}
          {isDone && !error && (
            <div className="border-t border-[#E4DDD6] pt-6 space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <h2 className="text-xs font-bold tracking-widest uppercase text-[#1E1A14]">
                    Research Pipeline
                  </h2>
                  <p className="t-label mt-1">
                    13 · COMPANY → 10 · GORILLA → 11 · IMAGINE → 12 · THESIS
                  </p>
                </div>
                {!researchRunning && !researchDone && (
                  <button
                    onClick={startResearch}
                    className="text-xs font-bold tracking-widest uppercase text-[#C8804A] hover:text-[#A86030] border-b border-[#C8804A]/40 hover:border-[#A86030] pb-0.5 transition-colors"
                  >
                    Run Research →
                  </button>
                )}
                {researchDone && (
                  <button
                    onClick={startResearch}
                    className="text-xs text-[#A89E94] hover:text-[#C8804A] transition-colors"
                  >
                    ↺ Re-run Research
                  </button>
                )}
              </div>

              {(researchRunning || researchDone || !!researchError) && (
                <div>
                  {RESEARCH_AGENTS.map(agent => (
                    <AgentStep
                      key={agent.key}
                      agentKey={agent.key}
                      label={agent.label}
                      desc={agent.desc}
                      event={researchEvents[agent.key]}
                      logs={researchLogs[agent.key]}
                      pipelineRunning={researchRunning}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
              {researchError && (
                <div className="border-t border-[#C84848]/30 pt-4 space-y-3">
                  <p className="text-xs text-[#C84848]">{researchError}</p>
                  <button
                    onClick={() => {
                      setResearchError(null);
                      setResearchEvents(prev => {
                        const next = { ...prev };
                        delete next[RESEARCH_AGENTS[researchStepIdx].key];
                        return next;
                      });
                      runResearchStep(researchStepIdx);
                    }}
                    className="text-xs font-bold tracking-widest uppercase text-[#C8804A] hover:text-[#A86030] border-b border-[#C8804A]/40 hover:border-[#A86030] pb-0.5 transition-colors"
                  >
                    Retry {RESEARCH_AGENTS[researchStepIdx]?.label}
                  </button>
                </div>
              )}
        </div>
      )}
    </div>
  );
}
