import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/src/lib/prisma";
import FilterBar from "./FilterBar";
import AnalysisCard, { type AnalysisSummary } from "./AnalysisCard";

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
