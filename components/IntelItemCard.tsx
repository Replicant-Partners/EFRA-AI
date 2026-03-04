"use client";

import { useState } from "react";

export type IntelItem = {
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

export default function IntelItemCard({
  item: initialItem,
  analysisId,
}: {
  item:       IntelItem;
  analysisId: string;
}) {
  const [item,    setItem]    = useState(initialItem);
  const [toggling, setToggling] = useState(false);

  async function toggleInclude() {
    setToggling(true);
    try {
      const res = await fetch(
        `/api/analyses/${analysisId}/intel/${item.id}`,
        {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ include_in_report: !item.include_in_report }),
        }
      );
      if (res.ok) {
        const updated = await res.json() as IntelItem;
        setItem(updated);
      }
    } finally {
      setToggling(false);
    }
  }

  const impactColor =
    item.impact_area === "valuation"  ? "text-[#C8804A] bg-[#C8804A]/8"  :
    item.impact_area === "management" ? "text-[#C89040] bg-[#C89040]/8"  :
    item.impact_area === "business"   ? "text-[#8CA8C8] bg-[#8CA8C8]/8"  :
    "text-[#A89E94] bg-[#A89E94]/8";

  const severityColor =
    item.severity === "high"   ? "text-[#C84848] bg-[#C84848]/8" :
    item.severity === "medium" ? "text-[#C89040] bg-[#C89040]/8" :
    item.severity === "low"    ? "text-[#A89E94] bg-[#A89E94]/8" :
    "text-[#C0B8AC] bg-[#C0B8AC]/8";

  const badgeCls = "inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold mr-1.5";

  return (
    <div className={`border border-[#EDE7E0] rounded p-4 space-y-2 ${item.include_in_report ? "border-[#C8804A]/30 bg-[#C8804A]/3" : "bg-white"}`}>
      <p className="text-[12px] text-[#1E1A14] leading-relaxed">{item.content}</p>

      <div className="flex items-center flex-wrap gap-1 min-h-[22px]">
        {item.impact_area ? (
          <span className={`${badgeCls} ${impactColor}`}>{item.impact_area}</span>
        ) : null}
        {item.severity ? (
          <span className={`${badgeCls} ${severityColor}`}>{item.severity}</span>
        ) : null}
        {item.sector && (
          <span className="text-[10px] text-[#A89E94] font-mono">{item.sector}</span>
        )}
        {!item.impact_area && !item.severity && (
          <span className="text-[10px] text-[#C0B8AC] italic">cataloguing…</span>
        )}
      </div>

      {item.summary && (
        <p className="text-[11px] text-[#6E6258] leading-relaxed italic">{item.summary}</p>
      )}

      <div className="flex items-center justify-between pt-1">
        <button
          onClick={toggleInclude}
          disabled={toggling}
          className="flex items-center gap-1.5 text-[10px] text-[#A89E94] hover:text-[#C8804A] transition-colors disabled:opacity-50"
        >
          <span className={`w-3.5 h-3.5 rounded-full border flex-shrink-0 transition-colors ${
            item.include_in_report
              ? "bg-[#C8804A] border-[#C8804A]"
              : "border-[#C0B8AC]"
          }`} />
          Include in report
        </button>
        <span className="text-[10px] text-[#D8D0C8]">
          {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>
    </div>
  );
}
