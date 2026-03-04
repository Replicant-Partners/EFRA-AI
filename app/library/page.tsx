import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/src/lib/prisma";
import FilterBar from "./FilterBar";

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });
}

type AnalysisSummary = {
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

function AnalysisCard({ a }: { a: AnalysisSummary }) {
  const ratingColor =
    a.rating === "BUY"          ? "text-[#C8804A]" :
    a.rating === "UNDERPERFORM" ? "text-[#C84848]" :
    a.rating === "HOLD"         ? "text-[#C89040]" :
    "text-[#A89E94]";

  const statusColor =
    a.status === "DROPPED"        ? "text-[#C84848]" :
    a.status === "COMPLIANCE_HALT"? "text-[#C89040]" :
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

        <div className="flex gap-4 mt-1.5 flex-wrap">
          {a.sector && (
            <span className="t-label">{a.sector}</span>
          )}
          <span className="t-label">{a.analyst_id}</span>
          {a._count.intel_items > 0 && (
            <span className="t-label text-[#C8804A]">{a._count.intel_items} intel</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ ticker?: string; rating?: string; status?: string; offset?: string }>;
}) {
  const sp     = await searchParams;
  const ticker = sp.ticker?.toUpperCase();
  const rating = sp.rating;
  const status = sp.status;
  const offset = Number(sp.offset ?? "0");
  const limit  = 30;

  const where: Record<string, unknown> = {};
  if (ticker) where.ticker = ticker;
  if (rating) where.rating = rating;
  if (status) where.status = status;

  const [analyses, total] = await prisma.$transaction([
    prisma.analysis.findMany({
      where,
      select: {
        id:         true,
        ticker:     true,
        analyst_id: true,
        catalyst:   true,
        mode:       true,
        status:     true,
        rating:     true,
        pt_12m:     true,
        sector:     true,
        created_at: true,
        _count:     { select: { intel_items: true } },
      },
      orderBy: { created_at: "desc" },
      take:    limit,
      skip:    offset,
    }),
    prisma.analysis.count({ where }),
  ]);

  const hasPrev = offset > 0;
  const hasNext = offset + limit < total;

  const buildHref = (newOffset: number) => {
    const params = new URLSearchParams();
    if (ticker) params.set("ticker", ticker);
    if (rating) params.set("rating", rating);
    if (status) params.set("status", status);
    if (newOffset) params.set("offset", String(newOffset));
    const qs = params.toString();
    return `/library${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#C8804A] tracking-widest uppercase">Library</h1>
          <p className="t-label mt-1">{total} {total === 1 ? "analysis" : "analyses"} saved</p>
        </div>
        <a href="/" className="text-xs text-[#A89E94] hover:text-[#C8804A] transition-colors">
          ← Pipeline
        </a>
      </div>

      <hr className="t-rule" />

      <Suspense>
        <FilterBar />
      </Suspense>

      {analyses.length === 0 ? (
        <p className="text-[11px] text-[#A89E94] py-8 text-center">
          No analyses found. Run a pipeline to save your first one.
        </p>
      ) : (
        <div>
          {analyses.map(a => (
            <AnalysisCard key={a.id} a={a as AnalysisSummary} />
          ))}
        </div>
      )}

      {(hasPrev || hasNext) && (
        <div className="flex items-center gap-6 pt-2">
          {hasPrev ? (
            <Link href={buildHref(offset - limit)} className="t-label hover:text-[#C8804A] transition-colors">
              ← Previous
            </Link>
          ) : <span />}
          <span className="t-label ml-auto">
            {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </span>
          {hasNext && (
            <Link href={buildHref(offset + limit)} className="t-label hover:text-[#C8804A] transition-colors">
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
