"use client";

import Link from "next/link";

export type AnalysisSummary = {
  id:         string;
  ticker:     string;
  analyst_id: string;
  catalyst:   string;
  mode:       string;
  status:     string;
  rating:     string | null;
  pt_12m:     number | null;
  sector:     string | null;
  created_at: Date;
  _count:     { intel_items: number };
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });
}

export default function AnalysisCard({ a }: { a: AnalysisSummary }) {
  const ratingColor =
    a.rating === "BUY"          ? "text-[#C8804A]" :
    a.rating === "UNDERPERFORM" ? "text-[#C84848]" :
    a.rating === "HOLD"         ? "text-[#C89040]" :
    "text-[#A89E94]";

  const statusColor =
    a.status === "DROPPED"         ? "text-[#C84848]" :
    a.status === "COMPLIANCE_HALT" ? "text-[#C89040]" :
    "text-[#A89E94]";

  return (
    <Link href={`/library/${a.id}`}>
      <div className="border-b border-[#EDE7E0] py-4 hover:bg-[#F5F1EB] -mx-2 px-2 transition-colors cursor-pointer">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-xs font-bold tracking-widest text-[#C8804A] uppercase w-14 flex-shrink-0">
            {a.ticker}
          </span>
          {a.rating && (
            <span className={`text-[11px] font-semibold ${ratingColor}`}>{a.rating}</span>
          )}
          {a.pt_12m != null && (
            <span className="text-[11px] text-[#C8804A]">PT ${a.pt_12m}</span>
          )}
          <span className="text-[10px] text-[#C0B8AC] tracking-wider uppercase">{a.mode}</span>
          <span className={`text-[10px] tracking-wider uppercase ml-auto ${statusColor}`}>
            {a.status.replace(/_/g, " ")}
          </span>
          <span className="t-label">{formatDate(a.created_at)}</span>
        </div>

        <p className="text-[11px] text-[#6E6258] mt-1.5 leading-relaxed line-clamp-1">
          {a.catalyst}
        </p>

        <div className="flex gap-4 mt-1.5 flex-wrap items-center">
          {a.sector && (
            <span className="t-label">{a.sector}</span>
          )}
          <span className="t-label">{a.analyst_id}</span>
          {a._count.intel_items > 0 && (
            <span className="t-label text-[#C8804A]">{a._count.intel_items} intel</span>
          )}
          <a
            href={`/library/${a.id}/report`}
            onClick={(e) => e.stopPropagation()}
            className="t-label hover:text-[#C8804A] transition-colors ml-auto"
          >
            Report →
          </a>
        </div>
      </div>
    </Link>
  );
}
