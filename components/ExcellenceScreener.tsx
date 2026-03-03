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
  revenue_ttm: string;        // e.g. "$4.2B"
  gross_margin_pct: string;   // e.g. "72%"
  ps_ratio: string;           // e.g. "8.2x"
  pe_ratio: string;           // e.g. "24x" or "N/M"
  pb_ratio: string;           // e.g. "5.1x"
  debt_assets_pct: string;    // e.g. "18%"
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-green-500 tracking-tight">Excellence Universe Screener</h1>
          <p className="text-gray-500 text-sm mt-1">Ajusta los criterios S1–S11 y obtén ideas de compañías candidatas</p>
        </div>
        <button
          onClick={resetDefaults}
          className="text-xs text-gray-600 border border-[#2a2a2a] px-3 py-1.5 hover:border-[#3a3a3a] hover:text-gray-400 transition-colors"
        >
          Reset defaults
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">

        {/* S1 + S2 — Fixed */}
        <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-4">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">S1–S2 · Fixed Criteria</div>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-2 text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              S1 · Trading Status: Active
            </div>
            <div className="flex items-center gap-2 text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              S2 · Primary Security only
            </div>
          </div>
        </div>

        {/* S3 — Exchange exclusions */}
        <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-4">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">S3 · Exchange Exclusions</div>
          <div className="flex flex-wrap gap-2">
            {EXCHANGES.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => set(key, !criteria[key])}
                className={`px-3 py-1.5 border text-xs transition-colors ${
                  criteria[key]
                    ? "border-red-500/50 bg-red-500/10 text-red-400"
                    : "border-[#3a3a3a] text-gray-500 hover:border-[#4a4a4a]"
                }`}
              >
                {criteria[key] ? "✕ " : "+ "}{label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-2">Rojo = excluido · Gris = incluido</p>
        </div>

        {/* S4–S6 */}
        <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-4">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-4">S4–S6 · Price, Capital & Debt</div>
          <div className="grid grid-cols-3 gap-4">
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
        </div>

        {/* S7–S9 */}
        <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-4">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-4">S7–S9 · Gross Margin & Profitability</div>
          <div className="grid grid-cols-4 gap-4">
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
        </div>

        {/* S10–S11 */}
        <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-4">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-4">S10–S11 · Market Cap & Growth</div>
          <div className="grid grid-cols-2 gap-4">
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
        </div>

        {/* Optional filters */}
        <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-4">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-4">Filtros Adicionales</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1.5">Sector focus (opcional)</label>
              <input
                type="text"
                value={criteria.sector_focus}
                onChange={e => set("sector_focus", e.target.value)}
                placeholder="ej: Technology, Healthcare, Industrials…"
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] px-3 py-2 text-sm text-gray-300 placeholder-[#3a3a3a] focus:outline-none focus:border-[#3a3a3a]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1.5">Número de candidatas</label>
              <select
                value={criteria.max_results}
                onChange={e => set("max_results", Number(e.target.value))}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#3a3a3a]"
              >
                {[5, 10, 15, 20].map(n => (
                  <option key={n} value={n}>{n} compañías</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Screen button */}
        <button
          onClick={handleScreen}
          disabled={phase === "running"}
          className="w-full py-4 font-bold text-sm tracking-widest uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-green-500 text-green-500 hover:bg-green-500 hover:text-black"
        >
          {phase === "running" ? "Screening…" : "Screen Universe →"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="border border-red-500 bg-red-500/10 p-4 text-red-400 text-sm">
          ERROR: {error}
        </div>
      )}

      {/* Results */}
      {phase === "done" && results.length > 0 && (
        <div className="space-y-4">
          <div className="text-xs text-gray-500 uppercase tracking-widest">
            {results.length} candidata{results.length !== 1 ? "s" : ""} encontrada{results.length !== 1 ? "s" : ""}
          </div>
          {results.map((c, i) => (
            <div key={c.ticker} className="border border-[#2a2a2a] bg-[#1a1a1a] p-4 space-y-3">
              {/* Header row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-gray-600 text-xs">#{i + 1}</span>
                  <span className="text-green-400 font-bold text-lg tracking-widest">{c.ticker}</span>
                  <span className="text-gray-300 text-sm">{c.company_name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs flex-shrink-0">
                  <span className="text-gray-500 border border-[#2a2a2a] px-2 py-0.5">{c.sector}</span>
                  <span className="text-gray-600 border border-[#2a2a2a] px-2 py-0.5">{c.exchange}</span>
                </div>
              </div>

              {/* Financial metrics grid */}
              <div className="grid grid-cols-7 gap-2 border border-[#222] bg-[#141414] px-3 py-2">
                <FinMetric label="Mkt Cap"      value={c.market_cap_estimate} highlight />
                <FinMetric label="Revenue TTM"  value={c.revenue_ttm} />
                <FinMetric label="Gross Margin" value={c.gross_margin_pct} />
                <FinMetric label="P/Sales"      value={c.ps_ratio} />
                <FinMetric label="P/Earnings"   value={c.pe_ratio} />
                <FinMetric label="P/Book"       value={c.pb_ratio} />
                <FinMetric label="Debt/Assets"  value={c.debt_assets_pct} />
              </div>

              {/* Narrative */}
              <p className="text-xs text-gray-400 leading-relaxed">{c.rationale}</p>
              {c.criteria_notes && (
                <p className="text-xs text-gray-600 italic">{c.criteria_notes}</p>
              )}
              <div className="pt-1">
                <a
                  href={`/?ticker=${c.ticker}`}
                  className="text-xs text-green-600 hover:text-green-400 transition-colors"
                  onClick={e => {
                    e.preventDefault();
                    window.location.href = `/?ticker=${c.ticker}`;
                  }}
                >
                  → Enviar al Pipeline
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {phase === "done" && results.length === 0 && !error && (
        <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-6 text-center text-gray-500 text-sm">
          No se encontraron candidatas con los criterios actuales. Intenta relajar algún umbral.
        </div>
      )}
    </div>
  );
}

// ─── FinMetric ────────────────────────────────────────────────────────────────

function FinMetric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-center">
      <div className="text-gray-600 text-[10px] mb-0.5 truncate">{label}</div>
      <div className={`text-xs font-bold ${highlight ? "text-green-400" : "text-gray-300"}`}>
        {value || "—"}
      </div>
    </div>
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
      <label className="block text-xs text-gray-600 mb-1.5">{label}</label>
      <div className="flex items-center border border-[#2a2a2a] bg-[#0f0f0f] focus-within:border-[#3a3a3a]">
        {prefix && <span className="text-gray-500 text-xs pl-3">{prefix}</span>}
        <input
          type="number"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1 bg-transparent px-2 py-2 text-sm text-green-400 focus:outline-none w-0"
        />
        {suffix && <span className="text-gray-500 text-xs pr-3">{suffix}</span>}
      </div>
    </div>
  );
}
