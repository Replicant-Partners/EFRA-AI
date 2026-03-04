"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import ReportEditor from "@/components/report/ReportEditor";
import type { ReportContent, PipelineState } from "@/src/shared/types";

type Analysis = {
  id:             string;
  ticker:         string;
  analyst_id:     string;
  catalyst:       string;
  rating:         string | null;
  pt_12m:         number | null;
  mode:           string;
  created_at:     string;
  full_state:     PipelineState;
  report_content: ReportContent | null;
};

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/analyses/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Analysis>;
      })
      .then((data) => { setAnalysis(data); setLoading(false); })
      .catch((err) => { setError(String(err)); setLoading(false); });
  }, [id]);

  // If report_content is null (old analysis), trigger backfill via GET endpoint
  useEffect(() => {
    if (!analysis || analysis.report_content) return;
    fetch(`/api/analyses/${id}/report`)
      .then((r) => r.json() as Promise<ReportContent>)
      .then((rc) => setAnalysis((prev) => prev ? { ...prev, report_content: rc } : prev))
      .catch(() => {/* silent */});
  }, [analysis, id]);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <p className="text-[11px] text-[#A89E94] tracking-widest uppercase">Loading report…</p>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-sm text-[#C84848]">Failed to load report.</p>
        <a href={`/library/${id}`} className="text-[11px] text-[#A89E94] hover:text-[#C8804A] transition-colors">
          ← Back to Analysis
        </a>
      </div>
    );
  }

  if (!analysis.report_content) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-[12px] text-[#A89E94]">Generating report…</p>
        <a href={`/library/${id}`} className="text-[11px] text-[#A89E94] hover:text-[#C8804A] transition-colors">
          ← Back to Analysis
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-[#C8804A] tracking-widest uppercase">
            {analysis.ticker} · Report
          </h1>
          <div className="flex items-baseline gap-3 mt-1 flex-wrap">
            {analysis.rating && (
              <span className="text-sm font-semibold text-[#C8804A]">{analysis.rating}</span>
            )}
            {analysis.pt_12m != null && (
              <span className="text-sm text-[#C8804A]">PT ${analysis.pt_12m}</span>
            )}
            <span className="text-[10px] text-[#A89E94] uppercase tracking-widest">{analysis.mode}</span>
            <span className="text-[10px] text-[#A89E94]">{analysis.analyst_id}</span>
            <span className="text-[10px] text-[#A89E94]">
              {new Date(analysis.created_at).toLocaleDateString("en-US", {
                year: "numeric", month: "short", day: "numeric",
              })}
            </span>
          </div>
        </div>
        <a
          href={`/library/${id}`}
          className="text-[11px] text-[#A89E94] hover:text-[#C8804A] transition-colors flex-shrink-0"
        >
          ← Analysis
        </a>
      </div>

      <hr className="border-[#EDE7E0]" />

      <ReportEditor
        analysisId={id}
        initialReport={analysis.report_content}
        pipelineState={analysis.full_state}
      />
    </div>
  );
}
