"use client";

import { useState } from "react";
import type { ReportSection } from "@/src/shared/types";

interface Props {
  analysisId: string;
  section:    ReportSection;
  onSaved:    (key: string, content: string) => void;
}

export default function SectionEditor({ analysisId, section, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(section.content);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/report`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "update_section", section_key: section.key, content: draft }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onSaved(section.key, draft);
      setEditing(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDraft(section.content);
    setEditing(false);
    setError(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[9px] font-semibold tracking-[0.12em] text-[#C0B8AC] uppercase">
          {section.label}
        </span>
        <div className="flex items-center gap-3">
          {section.updated_at && (
            <span className="text-[10px] text-[#A89E94]">
              edited {new Date(section.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
          {!editing && (
            <button
              onClick={() => { setDraft(section.content); setEditing(true); }}
              className="text-[10px] text-[#A89E94] hover:text-[#C8804A] transition-colors"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.max(5, draft.split("\n").length + 2)}
            className="w-full border border-[#C8804A]/40 rounded p-3 text-[12px] text-[#1E1A14] bg-[#FAF8F4] font-[inherit] leading-relaxed resize-y focus:outline-none focus:border-[#C8804A]"
          />
          {error && <p className="text-[11px] text-[#C84848]">{error}</p>}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-[11px] font-semibold tracking-widest uppercase text-[#C8804A] hover:text-[#A86030] transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="text-[10px] text-[#A89E94] hover:text-[#6E6258] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[12px] text-[#6E6258] leading-relaxed whitespace-pre-wrap">
          {section.content || <span className="italic text-[#C0B8AC]">No content generated.</span>}
        </p>
      )}
    </div>
  );
}
