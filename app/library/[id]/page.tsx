"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import AgentStep from "@/components/AgentStep";
import ResultPanel from "@/components/ResultPanel";
import IntelItemCard, { type IntelItem } from "@/components/IntelItemCard";
import AddIntelForm from "@/components/AddIntelForm";
import type { PipelineState, AgentEvent } from "@/src/shared/types";

type AgentKey = "scout" | "intel" | "forensic_pre" | "cf" | "forensic" | "valuation" | "communication";

const AGENTS: { key: AgentKey; label: string; desc: string }[] = [
  { key: "scout",         label: "01 · SCOUT",           desc: "Alpha Score" },
  { key: "intel",         label: "02 · INTEL",           desc: "News + Mosaic" },
  { key: "forensic_pre",  label: "03 · FORENSIC",        desc: "Pre-screen" },
  { key: "cf",            label: "04 · CRITICAL FACTOR", desc: "Thesis + Scenarios" },
  { key: "forensic",      label: "05 · FORENSIC",        desc: "Full Scan" },
  { key: "valuation",     label: "06 · VALUATION",       desc: "Price Target" },
  { key: "communication", label: "07 · COMMUNICATION",   desc: "ENTER Gate + Publish" },
];

type Analysis = {
  id:         string;
  ticker:     string;
  analyst_id: string;
  catalyst:   string;
  mode:       string;
  status:     string;
  rating:     string | null;
  pt_12m:     number | null;
  sector:     string | null;
  created_at: string;
  full_state: PipelineState;
  intel_items: IntelItem[];
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function buildEvents(state: PipelineState): Record<string, AgentEvent> {
  const ev: Record<string, AgentEvent> = {};
  if (state.scout)         ev["scout"]         = { agent: "scout",         status: "done", result: state.scout };
  if (state.intel)         ev["intel"]         = { agent: "intel",         status: "done", result: state.intel };
  if (state.forensic)      ev["forensic_pre"]  = { agent: "forensic_pre",  status: "done", result: state.forensic };
  if (state.cf)            ev["cf"]            = { agent: "cf",            status: "done", result: state.cf };
  if (state.forensic)      ev["forensic"]      = { agent: "forensic",      status: "done", result: state.forensic };
  if (state.valuation)     ev["valuation"]     = { agent: "valuation",     status: "done", result: state.valuation };
  if (state.communication) ev["communication"] = { agent: "communication", status: "done", result: state.communication };
  return ev;
}

export default function LibraryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [analysis,   setAnalysis]   = useState<Analysis | null>(null);
  const [intelItems, setIntelItems] = useState<IntelItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  // Poll for catalog updates every 4s if any item is uncatalogued
  const hasUncatalogued = intelItems.some(i => !i.impact_area);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/analyses/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as Analysis;
        setAnalysis(data);
        setIntelItems(data.intel_items);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  useEffect(() => {
    if (!hasUncatalogued) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/analyses/${id}/intel`);
        if (res.ok) {
          const items = await res.json() as IntelItem[];
          setIntelItems(items);
        }
      } catch { /* ignore */ }
    }, 4000);
    return () => clearInterval(interval);
  }, [id, hasUncatalogued]);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <p className="t-label">Loading…</p>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="py-20 text-center space-y-2">
        <p className="text-sm text-[#C84848]">Failed to load analysis</p>
        <a href="/library" className="t-label hover:text-[#C8804A] transition-colors">← Library</a>
      </div>
    );
  }

  const state  = analysis.full_state;
  const events = buildEvents(state);

  const ratingColor =
    analysis.rating === "BUY"          ? "text-[#C8804A]" :
    analysis.rating === "UNDERPERFORM" ? "text-[#C84848]" :
    analysis.rating === "HOLD"         ? "text-[#C89040]" :
    "text-[#A89E94]";

  const inReport  = intelItems.filter(i => i.include_in_report);
  const notReport = intelItems.filter(i => !i.include_in_report);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#C8804A] tracking-widest uppercase">
            {analysis.ticker}
          </h1>
          <div className="flex items-baseline gap-3 mt-1 flex-wrap">
            {analysis.rating && (
              <span className={`text-sm font-semibold ${ratingColor}`}>{analysis.rating}</span>
            )}
            {analysis.pt_12m != null && (
              <span className="text-sm text-[#C8804A]">PT ${analysis.pt_12m}</span>
            )}
            <span className="t-label">{analysis.mode}</span>
            <span className="t-label">{analysis.analyst_id}</span>
            <span className="t-label">{formatDate(analysis.created_at)}</span>
          </div>
          <p className="text-[11px] text-[#6E6258] mt-1 leading-relaxed max-w-xl">
            {analysis.catalyst}
          </p>
        </div>
        <a href="/library" className="text-xs text-[#A89E94] hover:text-[#C8804A] transition-colors flex-shrink-0 ml-4">
          ← Library
        </a>
      </div>

      <hr className="t-rule" />

      {/* Agent outputs */}
      <div>
        {AGENTS.map(agent => (
          <AgentStep
            key={agent.key}
            agentKey={agent.key}
            label={agent.label}
            desc={agent.desc}
            event={events[agent.key]}
            pipelineRunning={false}
          />
        ))}
      </div>

      <hr className="t-rule" />

      {/* Intel section */}
      <div className="space-y-4">
        <div className="text-[9px] font-semibold tracking-[0.14em] text-[#C0B8AC] uppercase">
          Intelligence · {intelItems.length} {intelItems.length === 1 ? "item" : "items"}
        </div>

        {/* Items tagged for report */}
        {inReport.length > 0 && (
          <div className="space-y-2">
            <div className="text-[9px] font-semibold tracking-[0.12em] text-[#C8804A] uppercase">
              In report ({inReport.length})
            </div>
            {inReport.map(item => (
              <IntelItemCard
                key={item.id}
                item={item}
                analysisId={analysis.id}
              />
            ))}
          </div>
        )}

        {/* Other items */}
        {notReport.length > 0 && (
          <div className="space-y-2">
            {inReport.length > 0 && (
              <div className="text-[9px] font-semibold tracking-[0.12em] text-[#C0B8AC] uppercase">
                Other ({notReport.length})
              </div>
            )}
            {notReport.map(item => (
              <IntelItemCard
                key={item.id}
                item={item}
                analysisId={analysis.id}
              />
            ))}
          </div>
        )}

        {intelItems.length === 0 && (
          <p className="text-[11px] text-[#C0B8AC] italic">No intelligence items yet. Add the first one below.</p>
        )}

        <AddIntelForm
          analysisId={analysis.id}
          onAdded={(item) => setIntelItems(prev => [...prev, item])}
        />
      </div>

      <hr className="t-rule" />

      {/* Final result */}
      <ResultPanel state={state} />
    </div>
  );
}
