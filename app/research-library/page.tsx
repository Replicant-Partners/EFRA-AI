"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ResearchItem {
  id:                     string;
  ticker:                 string;
  analyst_id:             string;
  moat_source:            string | null;
  moat_depth:             string | null;
  trust_score:            number | null;
  thesis_quality:         string | null;
  gorilla_verdict:        string | null;
  gorilla_total:          number | null;
  digital_stage:          string | null;
  growth_driver:          string | null;
  imagination_confidence: number | null;
  created_at:             string;
}

function verdictColor(v: string | null) {
  if (v === "GORILLA")      return "text-[#C8804A]";
  if (v === "SMALL_ANIMAL") return "text-[#C89040]";
  return "text-[#A89E94]";
}

function qualityColor(q: string | null) {
  if (q === "investment_grade") return "text-[#7A9E6A]";
  if (q === "needs_work")       return "text-[#C89040]";
  return "text-[#C84848]";
}

function moatColor(d: string | null) {
  if (d === "wide")     return "text-[#7A9E6A]";
  if (d === "narrow")   return "text-[#C89040]";
  if (d === "building") return "text-[#8CA8C8]";
  return "text-[#A89E94]";
}

function stageColor(s: string | null) {
  if (s === "source") return "text-[#C8804A]";
  if (s === "twin")   return "text-[#7A9E6A]";
  if (s === "shadow") return "text-[#C89040]";
  return "text-[#A89E94]";
}

export default function ResearchLibraryPage() {
  const [items, setItems]     = useState<ResearchItem[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Filters
  const [ticker,   setTicker]   = useState("");
  const [verdict,  setVerdict]  = useState("");
  const [quality,  setQuality]  = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "30" });
      if (ticker.trim())  params.set("ticker",          ticker.trim().toUpperCase());
      if (verdict.trim()) params.set("gorilla_verdict",  verdict.trim());
      if (quality.trim()) params.set("thesis_quality",   quality.trim());

      const res  = await fetch(`/api/research?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { researches: ResearchItem[]; total: number };
      setItems(data.researches);
      setTotal(data.total);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#C8804A] tracking-widest uppercase">
            Research Library
          </h1>
          <p className="t-label mt-1">
            COMPANY · GORILLA · IMAGINE · THESIS — saved research analyses
          </p>
        </div>
        <Link
          href="/"
          className="text-xs text-[#A89E94] hover:text-[#C8804A] transition-colors"
        >
          ← Pipeline
        </Link>
      </div>

      <hr className="t-rule" />

      {/* Filters */}
      <div className="flex gap-6 items-end flex-wrap">
        <div>
          <label className="t-label block mb-1">Ticker</label>
          <input
            value={ticker}
            onChange={e => setTicker(e.target.value.toUpperCase())}
            placeholder="AAPL"
            className="bg-transparent border-b border-[#D8D0C8] pb-1 text-sm text-[#1E1A14] placeholder-[#D8D0C8] focus:outline-none focus:border-[#C8804A] transition-colors w-24"
          />
        </div>
        <div>
          <label className="t-label block mb-1">Gorilla Verdict</label>
          <select
            value={verdict}
            onChange={e => setVerdict(e.target.value)}
            className="bg-transparent border-b border-[#D8D0C8] pb-1 text-sm text-[#6E6258] focus:outline-none focus:border-[#C8804A] transition-colors"
          >
            <option value="">All</option>
            <option value="GORILLA">GORILLA</option>
            <option value="SMALL_ANIMAL">SMALL_ANIMAL</option>
            <option value="PEDESTRIAN">PEDESTRIAN</option>
          </select>
        </div>
        <div>
          <label className="t-label block mb-1">Thesis Quality</label>
          <select
            value={quality}
            onChange={e => setQuality(e.target.value)}
            className="bg-transparent border-b border-[#D8D0C8] pb-1 text-sm text-[#6E6258] focus:outline-none focus:border-[#C8804A] transition-colors"
          >
            <option value="">All</option>
            <option value="investment_grade">investment_grade</option>
            <option value="needs_work">needs_work</option>
            <option value="incomplete">incomplete</option>
          </select>
        </div>
        <button
          onClick={load}
          className="text-xs font-bold tracking-widest uppercase text-[#C8804A] hover:text-[#A86030] border-b border-[#C8804A]/40 pb-0.5 transition-colors"
        >
          Filter →
        </button>
      </div>

      <hr className="t-rule" />

      {/* Count */}
      <p className="t-label">{total} research{total !== 1 ? "es" : ""} saved</p>

      {/* Error */}
      {error && <p className="text-xs text-[#C84848]">{error}</p>}

      {/* Loading */}
      {loading && <p className="t-label text-[#A89E94]">Loading…</p>}

      {/* List */}
      {!loading && !error && items.length === 0 && (
        <p className="prose-tufte text-[#A89E94]">
          No research saved yet. Run the Research Pipeline from the main page to save results here.
        </p>
      )}

      {!loading && items.map((item, i) => (
        <div key={item.id} className="border-b border-[#E4DDD6] py-5">
          {/* Row 1: ticker + metadata */}
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-[#D8D0C8] text-xs">{i + 1}</span>
            <span className="text-[#C8804A] font-bold tracking-widest text-sm">{item.ticker}</span>
            <span className="t-label">{item.analyst_id}</span>
            <span className="t-label ml-auto">
              {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>

          {/* Row 2: key metrics */}
          <div className="flex gap-5 text-[11px] mb-3 flex-wrap">
            {/* Gorilla verdict */}
            <span>
              <span className="text-[#C0B8AC] uppercase tracking-wider text-[9px] mr-1.5">Gorilla</span>
              <span className={`font-semibold ${verdictColor(item.gorilla_verdict)}`}>
                {item.gorilla_verdict ?? "—"}
              </span>
              {item.gorilla_total != null && (
                <span className="text-[#A89E94] ml-1">{item.gorilla_total.toFixed(0)}/100</span>
              )}
            </span>
            {/* Thesis quality */}
            <span>
              <span className="text-[#C0B8AC] uppercase tracking-wider text-[9px] mr-1.5">Thesis</span>
              <span className={qualityColor(item.thesis_quality)}>
                {item.thesis_quality?.replace("_", " ") ?? "—"}
              </span>
            </span>
            {/* Moat */}
            <span>
              <span className="text-[#C0B8AC] uppercase tracking-wider text-[9px] mr-1.5">Moat</span>
              <span className="text-[#6E6258]">{item.moat_source ?? "—"}</span>
              {item.moat_depth && (
                <span className={`ml-1 ${moatColor(item.moat_depth)}`}>({item.moat_depth})</span>
              )}
            </span>
            {/* Trust */}
            {item.trust_score != null && (
              <span>
                <span className="text-[#C0B8AC] uppercase tracking-wider text-[9px] mr-1.5">Trust</span>
                <span className="text-[#6E6258]">{item.trust_score}/100</span>
              </span>
            )}
            {/* Digital stage */}
            {item.digital_stage && (
              <span>
                <span className="text-[#C0B8AC] uppercase tracking-wider text-[9px] mr-1.5">Stage</span>
                <span className={stageColor(item.digital_stage)}>{item.digital_stage}</span>
              </span>
            )}
            {/* Growth driver */}
            {item.growth_driver && (
              <span>
                <span className="text-[#C0B8AC] uppercase tracking-wider text-[9px] mr-1.5">Growth</span>
                <span className="text-[#6E6258]">{item.growth_driver}</span>
              </span>
            )}
          </div>

          {/* View link */}
          <Link
            href={`/research-library/${item.id}`}
            className="text-xs text-[#A89E94] hover:text-[#C8804A] transition-colors"
          >
            View full research →
          </Link>
        </div>
      ))}
    </div>
  );
}
