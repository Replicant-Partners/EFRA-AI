"use client";

import { useState } from "react";

type IntelItem = {
  id:                string;
  analysis_id:       string;
  content:           string;
  impact_area:       string | null;
  sector:            string | null;
  severity:          string | null;
  summary:           string | null;
  include_in_report: boolean;
  created_at:        string;
};

export default function AddIntelForm({
  analysisId,
  onAdded,
}: {
  analysisId: string;
  onAdded:    (item: IntelItem) => void;
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/analyses/${analysisId}/intel`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ content: content.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const item = await res.json() as IntelItem;
      onAdded(item);
      setContent("");
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-4">
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Add an insight, note, or piece of intelligence for this analysis…"
        rows={3}
        disabled={loading}
        className="w-full bg-transparent border-b border-[#D8D0C8] pb-1 text-sm text-[#1E1A14] placeholder-[#D8D0C8] focus:outline-none focus:border-[#C8804A] resize-none transition-colors leading-relaxed disabled:opacity-50"
      />
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="text-xs font-bold tracking-widest uppercase text-[#C8804A] hover:text-[#A86030] border-b border-[#C8804A]/40 hover:border-[#A86030] pb-0.5 transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          {loading ? "Saving…" : "Add Insight →"}
        </button>
        <p className="text-[10px] text-[#C0B8AC]">
          AI will classify the impact area and sector automatically
        </p>
      </div>
      {error && <p className="text-[11px] text-[#C84848]">{error}</p>}
    </form>
  );
}
