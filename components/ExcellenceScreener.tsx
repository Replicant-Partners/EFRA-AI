"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScreenerCriteria {
  // S3 — Exchange exclusions
  exclude_china: boolean;
  exclude_india: boolean;
  exclude_saudi: boolean;
  exclude_russia: boolean;
  exclude_taiwan: boolean;
  exclude_korea: boolean;
  // S4
  min_price: number;
  // S5
  working_capital_revenue_max: number;
  // S6
  debt_assets_max_pct: number;
  // S7
  gm_stability_max: number;
  // S8
  gm_min_pct: number;
  gm_max_pct: number;
  // S9
  gross_profitability_min_pct: number;
  // S10
  market_cap_min_usd_m: number;
  // S11
  sales_growth_min_pct: number;
  // Extra
  sector_focus: string;
  max_results: number;
}

interface ScreenerCandidate {
  ticker: string;
  company_name: string;
  market_cap_estimate: string;
  sector: string;
  exchange: string;
  // Financials
  revenue_ttm: string;
  gross_margin_pct: string;
  ps_ratio: string;
  pe_ratio: string;
  pb_ratio: string;
  debt_assets_pct: string;
  // Narrative
  rationale: string;
  criteria_notes: string;
}

const DEFAULTS: ScreenerCriteria = {
  exclude_china: true,
  exclude_india: true,
  exclude_saudi: true,
  exclude_russia: true,
  exclude_taiwan: true,
  exclude_korea: true,
  min_price: 0.50,
  working_capital_revenue_max: 0.33,
  debt_assets_max_pct: 30,
  gm_stability_max: 5,
  gm_min_pct: 20,
  gm_max_pct: 80,
  gross_profitability_min_pct: 20,
  market_cap_min_usd_m: 200,
  sales_growth_min_pct: 7,
  sector_focus: "",
  max_results: 10,
};

const EXCHANGES = [
  { key: "exclude_china",  label: "China" },
  { key: "exclude_india",  label: "India" },
  { key: "exclude_saudi",  label: "Saudi Arabia" },
  { key: "exclude_russia", label: "Russia" },
  { key: "exclude_taiwan", label: "Taiwan" },
  { key: "exclude_korea",  label: "South Korea" },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExcellenceScreener() {
  const [criteria, setCriteria] = useState<ScreenerCriteria>(DEFAULTS);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [results, setResults] = useState<ScreenerCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ScreenerCriteria>(key: K, value: ScreenerCriteria[K]) {
    setCriteria(prev => ({ ...prev, [key]: value }));
  }

  function resetDefaults() {
    setCriteria(DEFAULTS);
    setResults([]);
    setError(null);
    setPhase("idle");
  }

  async function handleScreen() {
    setPhase("running");
    setResults([]);
    setError(null);

    try {
      const res = await fetch("/api/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(criteria),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { candidates: ScreenerCandidate[]; error?: string };

      if (data.error) throw new Error(data.error);
      setResults(data.candidates ?? []);
      setPhase("done");
    } catch (err) {
      setError(String(err));
      setPhase("done");
    }
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-lg font-bold text-green-500 tracking-widest uppercase">Excellence Universe Screener</h1>
          <p className="t-label mt-1">Ajusta los criterios S1–S11 y obtén ideas de compañías candidatas</p>
        </div>
        <button
          onClick={resetDefaults}
          className="text-xs text-[#555] hover:text-[#888] transition-colors"
        >
          Reset defaults
        </button>
      </div>

      <hr className="t-rule" />

      {/* S1 + S2 — Fixed */}
      <Section label="S1–S2 · Fixed Criteria">
        <div className="flex gap-6 text-xs text-[#555]">
          <span className="text-green-600">S1 · Trading Status: Active</span>
          <span className="text-green-600">S2 · Primary Security only</span>
        </div>
      </Section>

      <hr className="t-rule" />

      {/* S3 — Exchange exclusions */}
      <Section label="S3 · Exchange Exclusions">
        <div className="flex flex-wrap gap-3 mt-1">
          {EXCHANGES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => set(key, !criteria[key])}
              className={`text-xs transition-colors border-b pb-0.5 ${
                criteria[key]
                  ? "text-red-400 border-red-500/40"
                  : "text-[#555] border-[#2a2a2a] hover:text-[#888]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="t-label mt-2">Red = excluded · gray = included</p>
      </Section>

      <hr className="t-rule" />

      {/* S4–S6 */}
      <Section label="S4–S6 · Price, Capital &amp; Debt">
        <div className="grid grid-cols-3 gap-6 mt-2">
          <CriteriaInput
            label="S4 · Min Price (USD)"
            value={criteria.min_price}
            onChange={v => set("min_price", v)}
            step={0.10}
            min={0}
            prefix="$"
          />
          <CriteriaInput
            label="S5 · Working Capital / Revenue max"
            value={criteria.working_capital_revenue_max}
            onChange={v => set("working_capital_revenue_max", v)}
            step={0.01}
            min={0}
            max={1}
          />
          <CriteriaInput
            label="S6 · Debt / Assets max"
            value={criteria.debt_assets_max_pct}
            onChange={v => set("debt_assets_max_pct", v)}
            step={1}
            min={0}
            max={100}
            suffix="%"
          />
        </div>
      </Section>

      <hr className="t-rule" />

      {/* S7–S9 */}
      <Section label="S7–S9 · Gross Margin &amp; Profitability">
        <div className="grid grid-cols-4 gap-6 mt-2">
          <CriteriaInput
            label="S7 · GM Stability max (10Y)"
            value={criteria.gm_stability_max}
            onChange={v => set("gm_stability_max", v)}
            step={0.5}
            min={0}
            max={20}
          />
          <CriteriaInput
            label="S8 · GM min"
            value={criteria.gm_min_pct}
            onChange={v => set("gm_min_pct", v)}
            step={1}
            min={0}
            max={100}
            suffix="%"
          />
          <CriteriaInput
            label="S8 · GM max"
            value={criteria.gm_max_pct}
            onChange={v => set("gm_max_pct", v)}
            step={1}
            min={0}
            max={100}
            suffix="%"
          />
          <CriteriaInput
            label="S9 · Gross Profitability min"
            value={criteria.gross_profitability_min_pct}
            onChange={v => set("gross_profitability_min_pct", v)}
            step={1}
            min={0}
            max={100}
            suffix="%"
          />
        </div>
      </Section>

      <hr className="t-rule" />

      {/* S10–S11 */}
      <Section label="S10–S11 · Market Cap &amp; Growth">
        <div className="grid grid-cols-2 gap-6 mt-2">
          <CriteriaInput
            label="S10 · Market Cap min (USD)"
            value={criteria.market_cap_min_usd_m}
            onChange={v => set("market_cap_min_usd_m", v)}
            step={50}
            min={0}
            prefix="$"
            suffix="M"
          />
          <CriteriaInput
            label="S11 · Sales Growth min (Q vs 5Y avg)"
            value={criteria.sales_growth_min_pct}
            onChange={v => set("sales_growth_min_pct", v)}
            step={0.5}
            min={0}
            suffix="%"
          />
        </div>
      </Section>

      <hr className="t-rule" />

      {/* Optional filters */}
      <Section label="Filtros Adicionales">
        <div className="grid grid-cols-2 gap-6 mt-2">
          <div>
            <label className="t-label block mb-2">Sector focus (opcional)</label>
            <input
              type="text"
              value={criteria.sector_focus}
              onChange={e => set("sector_focus", e.target.value)}
              placeholder="Technology, Healthcare, Industrials…"
              className="w-full bg-transparent border-b border-[#2a2a2a] pb-1 text-sm text-gray-300 placeholder-[#333] focus:outline-none focus:border-[#3a3a3a] transition-colors"
            />
          </div>
          <div>
            <label className="t-label block mb-2">Número de candidatas</label>
            <select
              value={criteria.max_results}
              onChange={e => set("max_results", Number(e.target.value))}
              className="w-full bg-transparent border-b border-[#2a2a2a] pb-1 text-sm text-gray-300 focus:outline-none focus:border-[#3a3a3a] transition-colors"
            >
              {[5, 10, 15, 20].map(n => (
                <option key={n} value={n} className="bg-[#0d0d0d]">{n} compañías</option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      <hr className="t-rule" />

      {/* Screen button */}
      <button
        onClick={handleScreen}
        disabled={phase === "running"}
        className="text-xs font-bold tracking-widest uppercase transition-colors disabled:opacity-20 disabled:cursor-not-allowed text-green-500 hover:text-green-400 border-b border-green-500/30 hover:border-green-400 pb-0.5"
      >
        {phase === "running" ? "Screening…" : "Screen Universe →"}
      </button>

      {/* Error */}
      {error && (
        <p className="prose-tufte text-red-400 text-sm">Error: {error}</p>
      )}

      {/* Results */}
      {phase === "done" && results.length > 0 && (
        <div className="space-y-0 mt-6">
          <hr className="t-rule mb-4" />
          <div className="t-label mb-6">
            {results.length} candidata{results.length !== 1 ? "s" : ""} encontrada{results.length !== 1 ? "s" : ""}
          </div>
          {results.map((c, i) => (
            <div key={c.ticker} className="border-b border-[#1e1e1e] py-5">
              {/* Header */}
              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-[#444] text-xs">{i + 1}</span>
                <span className="text-green-400 font-bold tracking-widest">{c.ticker}</span>
                <span className="text-gray-300 text-sm">{c.company_name}</span>
                <span className="t-label">{c.sector}</span>
                <span className="t-label">{c.exchange}</span>
              </div>

              {/* Financial metrics — inline data row */}
              <div className="flex gap-6 text-xs mb-3">
                <FinMetric label="Mkt Cap"     value={c.market_cap_estimate} />
                <FinMetric label="Revenue TTM" value={c.revenue_ttm} />
                <FinMetric label="Grs Margin"  value={c.gross_margin_pct} />
                <FinMetric label="P/Sales"     value={c.ps_ratio} />
                <FinMetric label="P/E"         value={c.pe_ratio} />
                <FinMetric label="P/Book"      value={c.pb_ratio} />
                <FinMetric label="Debt/Assets" value={c.debt_assets_pct} />
              </div>

              {/* Narrative */}
              <p className="prose-tufte text-sm leading-relaxed">{c.rationale}</p>
              {c.criteria_notes && (
                <p className="text-xs text-[#555] mt-1 italic">{c.criteria_notes}</p>
              )}
              <button
                onClick={() => { window.location.href = `/?ticker=${c.ticker}`; }}
                className="mt-2 text-xs text-[#555] hover:text-green-500 transition-colors"
              >
                → Send to Pipeline
              </button>
            </div>
          ))}
        </div>
      )}

      {phase === "done" && results.length === 0 && !error && (
        <p className="prose-tufte">
          No se encontraron candidatas con los criterios actuales. Intenta relajar algún umbral.
        </p>
      )}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="t-label mb-3">{label}</div>
      {children}
    </div>
  );
}

// ─── FinMetric ────────────────────────────────────────────────────────────────

function FinMetric({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="t-label mr-1">{label}</span>
      <span className="text-[#aaa]">{value || "—"}</span>
    </span>
  );
}

// ─── CriteriaInput ────────────────────────────────────────────────────────────

function CriteriaInput({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div>
      <label className="t-label block mb-2">{label}</label>
      <div className="flex items-center border-b border-[#2a2a2a] focus-within:border-[#3a3a3a] transition-colors">
        {prefix && <span className="text-[#555] text-xs pr-1">{prefix}</span>}
        <input
          type="number"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1 bg-transparent py-1 text-sm text-green-400 focus:outline-none w-0"
        />
        {suffix && <span className="text-[#555] text-xs pl-1">{suffix}</span>}
      </div>
    </div>
  );
}
