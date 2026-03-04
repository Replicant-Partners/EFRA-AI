"use client";

import { useState } from "react";

interface Props {
  analysisId:       string;
  cascadeText:      string;
  cascadeUpdatedAt: string;
  onRegenerated:    (cascade_text: string) => void;
}

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

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div className="text-[9px] font-semibold tracking-[0.14em] text-[#C0B8AC] uppercase">
          CASCADE Output
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-[#A89E94]">
            {new Date(cascadeUpdatedAt).toLocaleDateString("en-US", {
              month: "short",
              day:   "numeric",
              year:  "numeric",
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
        <p className="text-[11px] text-[#A89E94] italic">
          Running communication agent with updated scenarios…
        </p>
      )}

      {error && <p className="text-[11px] text-[#C84848]">{error}</p>}

      <pre className="text-[11px] text-[#6E6258] whitespace-pre-wrap leading-relaxed font-mono bg-[#F5F1EB] rounded p-4 overflow-auto max-h-[600px]">
        {cascadeText || <span className="italic text-[#C0B8AC]">No CASCADE text generated.</span>}
      </pre>
    </div>
  );
}
