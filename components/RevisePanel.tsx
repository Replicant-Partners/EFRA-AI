"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentKey =
  | "scout" | "intel" | "forensic_pre" | "cf" | "forensic"
  | "valuation" | "kata" | "communication" | "lens";

const AGENT_OPTIONS: { key: AgentKey; label: string; desc: string }[] = [
  { key: "scout",         label: "01 · SCOUT",        desc: "Re-evaluate alpha score" },
  { key: "intel",         label: "02 · INTEL",        desc: "Re-analyze business + news" },
  { key: "forensic_pre",  label: "03 · FORENSIC",     desc: "Re-run risk pre-screen" },
  { key: "cf",            label: "04 · CRITICAL FACTOR", desc: "Rebuild thesis + scenarios" },
  { key: "forensic",      label: "05 · FORENSIC",     desc: "Re-run full forensic" },
  { key: "valuation",     label: "06 · VALUATION",    desc: "Recalculate price target" },
  { key: "kata",          label: "07 · KATA",         desc: "Re-audit process" },
  { key: "communication", label: "08 · COMMUNICATION", desc: "Rewrite research note" },
  { key: "lens",          label: "09 · LENS",         desc: "Re-check consistency" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface RevisePanelProps {
  analysisId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RevisePanel({ analysisId }: RevisePanelProps) {
  const [expanded,    setExpanded]    = useState(false);
  const [startAgent,  setStartAgent]  = useState<AgentKey>("valuation");
  const [note,        setNote]        = useState("");
  const [running,     setRunning]     = useState(false);
  const [logs,        setLogs]        = useState<string[]>([]);
  const [newId,       setNewId]       = useState<string | null>(null);
  const [error,       setError]       = useState<string | null>(null);

  const selectedOption = AGENT_OPTIONS.find(o => o.key === startAgent)!;
  // Agents that will re-run (from start onwards)
  const startIdx       = AGENT_OPTIONS.findIndex(o => o.key === startAgent);
  const agentsToRerun  = AGENT_OPTIONS.slice(startIdx).map(o => o.label);

  async function handleRevise() {
    if (!note.trim()) return;
    setRunning(true);
    setLogs([]);
    setNewId(null);
    setError(null);

    try {
      const res = await fetch(`/api/analyses/${analysisId}/revise`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ start_agent: startAgent, note: note.trim() }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";

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
            new_analysis_id?: string;
            error?: string;
          };

          if (msg.type === "log" && msg.msg) {
            setLogs(prev => [...prev, msg.msg!]);
          } else if (msg.type === "agent_start" && msg.msg) {
            setLogs(prev => [...prev, `→ ${msg.msg}`]);
          } else if (msg.type === "done" && msg.new_analysis_id) {
            setNewId(msg.new_analysis_id);
          } else if (msg.type === "error") {
            setError(msg.error ?? "Unknown error");
          }
        }
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setRunning(false);
    }
  }

  // ── Collapsed state ────────────────────────────────────────────────────────
  if (!expanded) {
    return (
      <div className="border-t border-[#E4DDD6] pt-6">
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2 text-[11px] text-[#A89E94] hover:text-[#C8804A] transition-colors group"
        >
          <span className="text-[#C8804A] group-hover:text-[#A86030]">⟳</span>
          Revise this analysis
          <span className="text-[#C0B8AC]">— correct the thesis and re-run from any agent</span>
        </button>
      </div>
    );
  }

  // ── Expanded state ─────────────────────────────────────────────────────────
  return (
    <div className="border-t border-[#E4DDD6] pt-6 space-y-5">

      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[9px] font-semibold tracking-[0.14em] text-[#C0B8AC] uppercase mb-0.5">
            Revise Analysis
          </div>
          <p className="text-[11px] text-[#8C7E70]">
            Correct the thesis and re-run the pipeline. A new analysis is saved to Library.
          </p>
        </div>
        {!running && !newId && (
          <button
            onClick={() => setExpanded(false)}
            className="text-[11px] text-[#A89E94] hover:text-[#6E6258] transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Start agent selector */}
      <div>
        <div className="text-[9px] font-semibold tracking-[0.14em] text-[#C0B8AC] uppercase mb-2">
          Re-run from
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {AGENT_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => !running && setStartAgent(opt.key)}
              disabled={running}
              className={`text-left px-2.5 py-2 rounded border transition-colors ${
                startAgent === opt.key
                  ? "border-[#C8804A] bg-[#C8804A]/6 text-[#C8804A]"
                  : "border-[#E4DDD6] text-[#A89E94] hover:border-[#C8804A]/40 hover:text-[#6E6258]"
              } disabled:opacity-40`}
            >
              <div className="text-[10px] font-semibold tracking-wide">{opt.label}</div>
              <div className="text-[9px] text-[#C0B8AC] mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>

        {/* Agents to re-run preview */}
        <p className="text-[10px] text-[#A89E94] mt-2">
          Will re-run: {agentsToRerun.join(" → ")}
        </p>
      </div>

      {/* Correction note */}
      <div>
        <div className="text-[9px] font-semibold tracking-[0.14em] text-[#C0B8AC] uppercase mb-2">
          Correction / Revised Thesis
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          disabled={running}
          placeholder={`What needs to change starting from ${selectedOption.label}? Be specific — this note will be injected into every re-run agent's context as authoritative analyst judgment.\n\nExample: "The Q3 miss was a one-time write-down, not structural. Gross margin is recovering. Re-model scenarios assuming 62% GM in Bull case instead of 58%."`}
          rows={5}
          className="w-full bg-transparent border border-[#D8D0C8] rounded px-3 py-2.5 text-[11px] text-[#1E1A14] placeholder-[#C0B8AC] focus:outline-none focus:border-[#C8804A] resize-none transition-colors leading-relaxed disabled:opacity-50"
        />
      </div>

      {/* Submit button */}
      {!running && !newId && (
        <button
          onClick={handleRevise}
          disabled={note.trim().length < 20}
          className="text-xs font-bold tracking-widest uppercase text-[#C8804A] hover:text-[#A86030] border-b border-[#C8804A]/40 hover:border-[#A86030] pb-0.5 transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          ⟳ Re-run from {selectedOption.label} →
        </button>
      )}

      {/* Live logs */}
      {(running || logs.length > 0) && (
        <div className="bg-[#F5F0EB] rounded px-4 py-3 space-y-1 max-h-64 overflow-y-auto">
          <div className="text-[9px] font-semibold tracking-[0.14em] text-[#C0B8AC] uppercase mb-2">
            {running ? "Running…" : "Complete"}
          </div>
          {logs.map((l, i) => (
            <div key={i} className="text-[11px] text-[#6E6258] font-mono leading-relaxed">
              {l}
            </div>
          ))}
          {running && (
            <div className="text-[11px] text-[#C0B8AC] animate-pulse">…</div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-[11px] text-[#C84848]">{error}</p>
      )}

      {/* Success */}
      {newId && (
        <div className="flex items-center gap-4 border-t border-[#E4DDD6] pt-4">
          <span className="text-[11px] text-[#7A9E6A] font-semibold">
            ✓ Revised analysis saved
          </span>
          <a
            href={`/library/${newId}`}
            className="text-xs font-bold tracking-widest uppercase text-[#C8804A] hover:text-[#A86030] border-b border-[#C8804A]/40 hover:border-[#A86030] pb-0.5 transition-colors"
          >
            View revised analysis →
          </a>
        </div>
      )}
    </div>
  );
}
