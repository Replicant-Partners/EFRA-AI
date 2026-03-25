"use client";

import { useState } from "react";

interface Props {
  analysisId:       string;
  cascadeText:      string;
  cascadeUpdatedAt: string;
  onRegenerated:    (cascade_text: string) => void;
}

/** Parse the CASCADE text into labelled sections. */
function parseCascade(text: string): { letter: string; title: string; body: string }[] {
  if (!text?.trim()) return [];

  // Match lines like "C — CONCLUSION", "A — ACTION", "S — SCENARIOS", "D — DATA", etc.
  const headerRe = /^([A-Z]{1,2})\s*[—–\-]+\s*(.+)$/;

  const lines  = text.split("\n");
  const result: { letter: string; title: string; body: string }[] = [];
  let current: { letter: string; title: string; lines: string[] } | null = null;

  for (const line of lines) {
    const match = line.trim().match(headerRe);
    if (match) {
      if (current) result.push({ ...current, body: current.lines.join("\n").trim() });
      current = { letter: match[1], title: match[2].trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    } else {
      // Text before first header — add as a preamble section
      if (line.trim()) {
        if (!result.length || result[0].letter !== "…") {
          result.push({ letter: "…", title: "", body: "" });
        }
        result[result.length - 1].body += (result[result.length - 1].body ? "\n" : "") + line;
      }
    }
  }
  if (current) result.push({ ...current, body: current.lines.join("\n").trim() });

  // If no headers were found, return whole text as one block
  if (!result.length || (result.length === 1 && result[0].letter === "…")) {
    return [{ letter: "", title: "Report", body: text.trim() }];
  }
  return result.filter(s => s.body.trim());
}

const SECTION_COLORS: Record<string, string> = {
  C:  "text-[#C8804A]",
  A:  "text-[#7A9E6A]",
  S:  "text-[#C89040]",
  C2: "text-[#6A8EC8]",
  D:  "text-[#8C7E70]",
  "…": "text-[#C0B8AC]",
};

export default function CascadePanel({ analysisId, cascadeText, cascadeUpdatedAt, onRegenerated }: Props) {
  const [running, setRunning] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleRegenerate() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/report`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "regenerate_cascade" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { cascade_text: string };
      onRegenerated(data.cascade_text);
    } catch (err) {
      setError(String(err));
    } finally {
      setRunning(false);
    }
  }

  const sections = parseCascade(cascadeText);

  return (
    <div className="space-y-3" id="cascade-panel">
      {/* Header row */}
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div className="text-[9px] font-semibold tracking-[0.14em] text-[#C0B8AC] uppercase">
          CASCADE Report
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-[#A89E94]">
            {new Date(cascadeUpdatedAt).toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric",
            })}
          </span>
          <button
            onClick={handleRegenerate}
            disabled={running}
            className="text-[11px] font-semibold tracking-widest uppercase text-[#C8804A] hover:text-[#A86030] transition-colors disabled:opacity-50"
          >
            {running ? "Regenerating…" : "Re-run Agent"}
          </button>
        </div>
      </div>

      {running && (
        <p className="text-[11px] text-[#A89E94] italic">Running communication agent…</p>
      )}
      {error && <p className="text-[11px] text-[#C84848]">{error}</p>}

      {/* Formatted sections */}
      {sections.length > 0 ? (
        <div className="space-y-0 border border-[#EDE7E0] rounded-sm overflow-hidden">
          {sections.map((sec, i) => {
            const color = SECTION_COLORS[sec.letter] ?? "text-[#8C7E70]";
            return (
              <div
                key={i}
                className={`px-4 py-3 ${i > 0 ? "border-t border-[#EDE7E0]" : ""} ${i % 2 === 1 ? "bg-[#FAF8F4]" : ""}`}
              >
                {sec.letter && (
                  <div className="flex items-baseline gap-2 mb-1.5">
                    <span className={`text-[11px] font-bold tracking-widest ${color}`}>
                      {sec.letter}
                    </span>
                    {sec.title && (
                      <span className="text-[10px] font-semibold tracking-[0.1em] text-[#8C7E70] uppercase">
                        {sec.title}
                      </span>
                    )}
                  </div>
                )}
                <div className="text-[11px] text-[#3E3830] leading-relaxed whitespace-pre-wrap">
                  {sec.body}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[11px] text-[#C0B8AC] italic">No CASCADE report generated.</p>
      )}
    </div>
  );
}
