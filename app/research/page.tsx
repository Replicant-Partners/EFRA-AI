"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { GorillaBoard } from "@/src/shared/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "valentine" | "gunn" | "dual";
type Tab = "business" | "thesis" | "evidence" | "gorilla" | "launch";
type EconomicDomain = "biological" | "physical" | "digital" | "mixed" | "";
type MoatType = "brand" | "costs" | "network" | "regulatory" | "other" | "";

interface NewsItem {
  headline: string;
  why: string;
}

interface ResearchDraft {
  ticker: string;
  company_name: string;
  analyst_id: string;
  mode: Mode;
  // Business
  business_summary: string;
  economic_domain: EconomicDomain;
  geographic_exposure: string;
  moat_type: MoatType;
  moat_evidence: string;
  management_notes: string;
  key_metrics: string;
  // Thesis
  main_thesis: string;
  bull_triggers: string;
  bull_pt: string;
  base_narrative: string;
  base_pt: string;
  bear_risk: string;
  invalidation: string;
  catalyst: string;
  // Evidence
  news_items: NewsItem[];
  // Meta
  updated_at: string;
}

const STORAGE_KEY = "efrain_research_draft";
const PREFILL_KEY = "efrain_research_prefill";

const DEFAULT_DRAFT: ResearchDraft = {
  ticker: "",
  company_name: "",
  analyst_id: "analyst_001",
  mode: "valentine",
  business_summary: "",
  economic_domain: "",
  geographic_exposure: "",
  moat_type: "",
  moat_evidence: "",
  management_notes: "",
  key_metrics: "",
  main_thesis: "",
  bull_triggers: "",
  bull_pt: "",
  base_narrative: "",
  base_pt: "",
  bear_risk: "",
  invalidation: "",
  catalyst: "",
  news_items: [{ headline: "", why: "" }],
  updated_at: "",
};

const MODE_INFO: Record<Mode, { label: string; desc: string }> = {
  valentine: { label: "Valentine", desc: "12M catalyst" },
  gunn:      { label: "Gunn",      desc: "5Y compounder" },
  dual:      { label: "Dual",      desc: "12M + 5Y" },
};

const DOMAIN_OPTIONS: { value: EconomicDomain; label: string }[] = [
  { value: "",           label: "Select domain…" },
  { value: "biological", label: "Biological" },
  { value: "physical",   label: "Physical" },
  { value: "digital",    label: "Digital" },
  { value: "mixed",      label: "Mixed" },
];

const MOAT_OPTIONS: { value: MoatType; label: string }[] = [
  { value: "",           label: "Select moat…" },
  { value: "brand",      label: "Brand / intangible asset" },
  { value: "costs",      label: "Cost advantage" },
  { value: "network",    label: "Network effect" },
  { value: "regulatory", label: "Regulatory / switching costs" },
  { value: "other",      label: "Other / none" },
];

// ─── Primitives ───────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-semibold tracking-[0.14em] text-[#C0B8AC] uppercase block mb-1.5">
      {children}
    </span>
  );
}

function Rule() {
  return <hr className="border-t border-[#EDE7E0]" />;
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-[11px] font-semibold tracking-wider pb-1 border-b transition-colors ${
        active
          ? "text-[#C8804A] border-[#C8804A]"
          : "text-[#A89E94] border-transparent hover:text-[#6E6258]"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      {children}
      {hint && <p className="text-[10px] text-[#C0B8AC] mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-transparent border-b border-[#D8D0C8] pb-1 text-sm text-[#1E1A14] placeholder-[#D8D0C8] focus:outline-none focus:border-[#C8804A] resize-none transition-colors leading-relaxed"
    />
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  large,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  large?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-transparent border-b border-[#D8D0C8] pb-1 placeholder-[#D8D0C8] focus:outline-none focus:border-[#C8804A] transition-colors ${
        large
          ? "text-2xl font-bold text-[#C8804A] uppercase tracking-widest"
          : "text-sm text-[#1E1A14]"
      }`}
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-transparent border-b border-[#D8D0C8] pb-1 text-sm text-[#1E1A14] focus:outline-none focus:border-[#C8804A] transition-colors"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ─── Business Tab ─────────────────────────────────────────────────────────────

function BusinessTab({
  draft,
  update,
}: {
  draft: ResearchDraft;
  update: (patch: Partial<ResearchDraft>) => void;
}) {
  return (
    <div className="space-y-8">
      <Field
        label="Business Summary"
        hint="What does the company do, how does it make money, and why does it have a right to win?"
      >
        <Textarea
          value={draft.business_summary}
          onChange={v => update({ business_summary: v })}
          placeholder="Describe the business model, core revenue streams, and value proposition…"
          rows={4}
        />
      </Field>

      <div className="grid grid-cols-2 gap-8">
        <Field label="Economic Domain">
          <SelectInput
            value={draft.economic_domain}
            onChange={v => update({ economic_domain: v as EconomicDomain })}
            options={DOMAIN_OPTIONS}
          />
        </Field>
        <Field
          label="Geographic Exposure"
          hint="Priority: BR · ID · MX · ZA · TR · UK · USA"
        >
          <TextInput
            value={draft.geographic_exposure}
            onChange={v => update({ geographic_exposure: v })}
            placeholder="USA 60%, UK 20%, Brazil 20%…"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <Field label="Competitive Moat">
          <SelectInput
            value={draft.moat_type}
            onChange={v => update({ moat_type: v as MoatType })}
            options={MOAT_OPTIONS}
          />
        </Field>
        <Field label="Moat Evidence">
          <TextInput
            value={draft.moat_evidence}
            onChange={v => update({ moat_evidence: v })}
            placeholder="Gross margins 70%+, 95% net retention…"
          />
        </Field>
      </div>

      <Field
        label="Key Metrics"
        hint="Revenue growth, margins, P/E, EV/EBITDA, FCF yield, market cap"
      >
        <Textarea
          value={draft.key_metrics}
          onChange={v => update({ key_metrics: v })}
          placeholder="Rev growth 25% YoY · Gross margin 72% · P/E 35x · EV/EBITDA 28x · Market cap $45B…"
          rows={2}
        />
      </Field>

      <Field label="Management Quality Notes">
        <Textarea
          value={draft.management_notes}
          onChange={v => update({ management_notes: v })}
          placeholder="Founder-led, insider ownership %, capital allocation track record, key decisions…"
          rows={3}
        />
      </Field>
    </div>
  );
}

// ─── Thesis Tab ───────────────────────────────────────────────────────────────

function ThesisTab({
  draft,
  update,
}: {
  draft: ResearchDraft;
  update: (patch: Partial<ResearchDraft>) => void;
}) {
  return (
    <div className="space-y-8">
      <Field
        label="Main Thesis"
        hint="One paragraph — the core investment case. Why should this be in the portfolio?"
      >
        <Textarea
          value={draft.main_thesis}
          onChange={v => update({ main_thesis: v })}
          placeholder="The central reason this is a compelling investment opportunity…"
          rows={4}
        />
      </Field>

      <Rule />

      {/* Scenarios */}
      <div className="space-y-6">
        <p className="text-[9px] font-semibold tracking-[0.14em] text-[#C0B8AC] uppercase">
          Scenarios
        </p>

        {/* Bull */}
        <div className="border-l-2 border-[#7A9E6A] pl-4 space-y-4">
          <span className="text-[11px] font-bold text-[#7A9E6A] tracking-wider uppercase">
            Bull
          </span>
          <Field label="Key Triggers">
            <Textarea
              value={draft.bull_triggers}
              onChange={v => update({ bull_triggers: v })}
              placeholder="What must happen for the bull case to materialize…"
              rows={2}
            />
          </Field>
          <Field label="Price Target Estimate">
            <TextInput
              value={draft.bull_pt}
              onChange={v => update({ bull_pt: v })}
              placeholder="$250 · EPS $3.50 × 72x"
            />
          </Field>
        </div>

        {/* Base */}
        <div className="border-l-2 border-[#C8804A] pl-4 space-y-4">
          <span className="text-[11px] font-bold text-[#C8804A] tracking-wider uppercase">
            Base
          </span>
          <Field label="Central Expectation">
            <Textarea
              value={draft.base_narrative}
              onChange={v => update({ base_narrative: v })}
              placeholder="The most likely outcome over the investment horizon…"
              rows={2}
            />
          </Field>
          <Field label="Price Target Estimate">
            <TextInput
              value={draft.base_pt}
              onChange={v => update({ base_pt: v })}
              placeholder="$180 · EPS $2.80 × 64x"
            />
          </Field>
        </div>

        {/* Bear */}
        <div className="border-l-2 border-[#C84848] pl-4 space-y-4">
          <span className="text-[11px] font-bold text-[#C84848] tracking-wider uppercase">
            Bear
          </span>
          <Field label="Main Risk">
            <Textarea
              value={draft.bear_risk}
              onChange={v => update({ bear_risk: v })}
              placeholder="The scenario that kills the thesis…"
              rows={2}
            />
          </Field>
          <Field label="Invalidation Condition">
            <TextInput
              value={draft.invalidation}
              onChange={v => update({ invalidation: v })}
              placeholder="If gross margins fall below 60% for 2 consecutive quarters…"
            />
          </Field>
        </div>
      </div>

      <Rule />

      <Field
        label="Catalyst — Why Now?"
        hint="This becomes the pipeline catalyst input. Be specific: earnings beat, product launch, regulatory approval, M&A, management change, macro shift…"
      >
        <Textarea
          value={draft.catalyst}
          onChange={v => update({ catalyst: v })}
          placeholder="Describe the specific event or dynamic that makes this timely. Why should the market re-rate within the investment horizon?…"
          rows={5}
        />
      </Field>
    </div>
  );
}

// ─── Evidence Tab ─────────────────────────────────────────────────────────────

function EvidenceTab({
  draft,
  update,
}: {
  draft: ResearchDraft;
  update: (patch: Partial<ResearchDraft>) => void;
}) {
  function updateItem(i: number, patch: Partial<NewsItem>) {
    const items = [...draft.news_items];
    items[i] = { ...items[i], ...patch };
    update({ news_items: items });
  }

  function addItem() {
    if (draft.news_items.length < 10) {
      update({ news_items: [...draft.news_items, { headline: "", why: "" }] });
    }
  }

  function removeItem(i: number) {
    if (draft.news_items.length > 1) {
      update({ news_items: draft.news_items.filter((_, idx) => idx !== i) });
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-[#6E6258] leading-relaxed">
        Add news headlines, data points, and evidence. Headlines feed into the pipeline&apos;s news
        pool — INTEL uses them to build the information mosaic, CRITICAL FACTOR uses them to
        stress-test scenarios.
      </p>

      <div className="flex items-baseline justify-between">
        <SectionLabel>
          News &amp; Evidence ({draft.news_items.filter(n => n.headline.trim()).length}/10)
        </SectionLabel>
        {draft.news_items.length < 10 && (
          <button
            onClick={addItem}
            className="text-xs text-[#A89E94] hover:text-[#C8804A] transition-colors"
          >
            + add item
          </button>
        )}
      </div>

      <div className="space-y-5">
        {draft.news_items.map((item, i) => (
          <div key={i}>
            <div className="flex items-start gap-3">
              <span className="text-[#D8D0C8] text-[11px] w-5 text-right flex-shrink-0 mt-1">
                {i + 1}
              </span>
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={item.headline}
                  onChange={e => updateItem(i, { headline: e.target.value })}
                  placeholder={`Headline or data point ${i + 1}…`}
                  className="w-full bg-transparent border-b border-[#D8D0C8] pb-0.5 text-sm text-[#1E1A14] placeholder-[#D8D0C8] focus:outline-none focus:border-[#C8804A] transition-colors"
                />
                <input
                  type="text"
                  value={item.why}
                  onChange={e => updateItem(i, { why: e.target.value })}
                  placeholder="Why this matters for the thesis…"
                  className="w-full bg-transparent border-b border-[#EDE7E0] pb-0.5 text-[11px] text-[#6E6258] placeholder-[#D8D0C8] focus:outline-none focus:border-[#C8804A] transition-colors"
                />
              </div>
              {draft.news_items.length > 1 && (
                <button
                  onClick={() => removeItem(i)}
                  className="text-[#D8D0C8] hover:text-[#C84848] transition-colors text-lg leading-none flex-shrink-0 mt-0.5"
                >
                  ×
                </button>
              )}
            </div>
            {i < draft.news_items.length - 1 && (
              <div className="mt-4">
                <Rule />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Launch Tab ───────────────────────────────────────────────────────────────

function LaunchTab({ draft }: { draft: ResearchDraft }) {
  const filled = {
    ticker:   draft.ticker.trim().length > 0,
    catalyst: draft.catalyst.trim().length > 10 || draft.main_thesis.trim().length > 10,
    thesis:   draft.main_thesis.trim().length > 0,
    news:     draft.news_items.filter(n => n.headline.trim()).length > 0,
  };

  const newsCount = draft.news_items.filter(n => n.headline.trim()).length;

  const builtCatalyst = [
    draft.main_thesis.trim()    && `Thesis: ${draft.main_thesis.trim()}`,
    draft.catalyst.trim()       && `Catalyst: ${draft.catalyst.trim()}`,
    draft.bull_triggers.trim()  && `Bull triggers: ${draft.bull_triggers.trim()}`,
    draft.base_narrative.trim() && `Base case: ${draft.base_narrative.trim()}`,
    draft.bear_risk.trim()      && `Bear risk: ${draft.bear_risk.trim()}`,
    draft.invalidation.trim()   && `Invalidation: ${draft.invalidation.trim()}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <div className="space-y-8">
      <p className="text-sm text-[#6E6258] leading-relaxed">
        Review what will be sent to the 9-agent pipeline. The catalyst field is assembled from
        your thesis notes for maximum context.
      </p>

      {/* Readiness checklist */}
      <div className="space-y-2.5">
        <SectionLabel>Pre-flight checklist</SectionLabel>
        {[
          {
            key: "ticker",
            label: "Ticker",
            ok: filled.ticker,
            value: draft.ticker || "missing",
          },
          {
            key: "analyst",
            label: "Analyst ID",
            ok: draft.analyst_id.trim().length > 0,
            value: draft.analyst_id || "missing",
          },
          {
            key: "catalyst",
            label: "Thesis / Catalyst",
            ok: filled.catalyst,
            value: filled.catalyst ? "ready" : "too short — add main thesis or catalyst",
          },
          {
            key: "news",
            label: "News items",
            ok: true,
            value:
              newsCount > 0
                ? `${newsCount} item${newsCount > 1 ? "s" : ""} ready`
                : "none (optional)",
          },
          {
            key: "mode",
            label: "Mode",
            ok: true,
            value: `${draft.mode.charAt(0).toUpperCase() + draft.mode.slice(1)} · ${MODE_INFO[draft.mode].desc}`,
          },
        ].map(item => (
          <div key={item.key} className="flex items-baseline gap-3 text-[11px]">
            <span className={item.ok ? "text-[#7A9E6A]" : "text-[#C89040]"}>
              {item.ok ? "✓" : "○"}
            </span>
            <span className="text-[#6E6258] w-32">{item.label}</span>
            <span className={item.ok ? "text-[#1E1A14]" : "text-[#A89E94]"}>{item.value}</span>
          </div>
        ))}
      </div>

      <Rule />

      {/* Catalyst preview */}
      {builtCatalyst ? (
        <div>
          <SectionLabel>Catalyst field preview</SectionLabel>
          <div className="bg-[#F5F0EB] rounded p-4 text-[11px] text-[#6E6258] leading-relaxed whitespace-pre-wrap border border-[#EDE7E0]">
            {builtCatalyst}
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-[#A89E94]">
          Fill in Main Thesis and/or Catalyst in the Thesis tab to see the preview.
        </p>
      )}
    </div>
  );
}

// ─── Gorilla Score Bar ────────────────────────────────────────────────────────

function ScoreBar({
  score,
  label,
  weight,
}: {
  score: number;
  label: string;
  weight: string;
}) {
  const color =
    score >= 65 ? "bg-[#7A9E6A]" : score >= 40 ? "bg-[#C8804A]" : "bg-[#C84848]";
  const textColor =
    score >= 65 ? "text-[#7A9E6A]" : score >= 40 ? "text-[#C8804A]" : "text-[#C84848]";
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] text-[#1E1A14] font-semibold">{label}</span>
          <span className="text-[9px] text-[#C0B8AC] tracking-wider">{weight}</span>
        </div>
        <span className={`text-[11px] font-bold ${textColor}`}>{score}/100</span>
      </div>
      <div className="h-[3px] bg-[#EDE7E0] rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// ─── Gorilla Tab ──────────────────────────────────────────────────────────────

function GorillaTab({
  draft,
}: {
  draft: ResearchDraft;
}) {
  const [phase,  setPhase]  = useState<"idle" | "running" | "done" | "error">("idle");
  const [logs,   setLogs]   = useState<string[]>([]);
  const [result, setResult] = useState<GorillaBoard | null>(null);
  const [error,  setError]  = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const canRun = draft.ticker.trim().length > 0 &&
    (draft.business_summary.trim().length > 0 || draft.main_thesis.trim().length > 0);

  async function run() {
    setPhase("running");
    setLogs([]);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/research/gorilla", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker:               draft.ticker.toUpperCase().trim(),
          company_name:         draft.company_name,
          analyst_id:           draft.analyst_id,
          business_summary:     draft.business_summary,
          economic_domain:      draft.economic_domain,
          geographic_exposure:  draft.geographic_exposure,
          moat_type:            draft.moat_type,
          moat_evidence:        draft.moat_evidence,
          key_metrics:          draft.key_metrics,
          management_notes:     draft.management_notes,
          main_thesis:          draft.main_thesis,
          catalyst:             draft.catalyst,
          bull_triggers:        draft.bull_triggers,
          base_narrative:       draft.base_narrative,
          bear_risk:            draft.bear_risk,
          invalidation:         draft.invalidation,
          news_headlines:       draft.news_items.map(n => n.headline).filter(Boolean),
        }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;

          const msg = JSON.parse(json) as {
            type: string;
            msg?: string;
            result?: GorillaBoard;
            error?: string;
          };

          if (msg.type === "log" && msg.msg) {
            setLogs(prev => [...prev, msg.msg!]);
          } else if (msg.type === "done" && msg.result) {
            setResult(msg.result);
            setPhase("done");
          } else if (msg.type === "error") {
            setError(msg.error ?? "Unknown error");
            setPhase("error");
          }
        }
      }
    } catch (err) {
      setError(String(err));
      setPhase("error");
    }
  }

  const verdictConfig: Record<
    GorillaBoard["gorilla_verdict"],
    { label: string; color: string; bg: string; border: string }
  > = {
    GORILLA:      { label: "GORILLA",      color: "text-[#7A9E6A]", bg: "bg-[#7A9E6A]/10", border: "border-[#7A9E6A]/40" },
    SMALL_ANIMAL: { label: "SMALL ANIMAL", color: "text-[#C8804A]", bg: "bg-[#C8804A]/10", border: "border-[#C8804A]/40" },
    PEDESTRIAN:   { label: "PEDESTRIAN",   color: "text-[#C84848]", bg: "bg-[#C84848]/10", border: "border-[#C84848]/40" },
  };

  return (
    <div className="space-y-6">

      {/* Description */}
      <p className="text-sm text-[#6E6258] leading-relaxed">
        Evaluates whether this opportunity fits the firm&apos;s{" "}
        <span className="text-[#1E1A14] font-semibold">Value Gorilla</span> profile: a large,
        obvious problem with an invisible solution that is a new combinatorial assembly sitting at
        a choke point — and trading at a valuation that reflects the market&apos;s disbelief.
      </p>

      {/* Requirements check */}
      {!canRun && (
        <p className="text-[11px] text-[#C89040]">
          Add a ticker and at least a business summary or main thesis in the previous tabs.
        </p>
      )}

      {/* Run button */}
      {phase === "idle" || phase === "error" ? (
        <div className="space-y-3">
          <button
            onClick={run}
            disabled={!canRun}
            className="text-xs font-bold tracking-widest uppercase transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[#C8804A] hover:text-[#A86030] border-b border-[#C8804A]/40 hover:border-[#A86030] pb-0.5"
          >
            {phase === "error" ? "↺ Retry Gorilla Analysis" : "Run Gorilla Analysis →"}
          </button>
          {error && (
            <p className="text-[11px] text-[#C84848]">{error}</p>
          )}
        </div>
      ) : phase === "running" ? (
        <button
          disabled
          className="text-xs font-bold tracking-widest uppercase text-[#A89E94] opacity-60 cursor-not-allowed"
        >
          Running…
        </button>
      ) : null}

      {/* Streaming logs */}
      {(phase === "running" || (phase === "done" && logs.length > 0)) && (
        <div className="bg-[#F5F0EB] rounded border border-[#EDE7E0] p-4 space-y-0.5 max-h-72 overflow-y-auto font-mono">
          {logs.map((line, i) => (
            <p key={i} className="text-[10px] text-[#6E6258] leading-relaxed whitespace-pre-wrap">
              {line}
            </p>
          ))}
          {phase === "running" && (
            <p className="text-[10px] text-[#C8804A] animate-pulse">▌</p>
          )}
          <div ref={logsEndRef} />
        </div>
      )}

      {/* Result */}
      {phase === "done" && result && (
        <div className="space-y-6">
          <hr className="t-rule" />

          {/* Verdict banner */}
          {(() => {
            const cfg = verdictConfig[result.gorilla_verdict];
            return (
              <div className={`border rounded p-4 ${cfg.bg} ${cfg.border}`}>
                <div className="flex items-baseline justify-between mb-2">
                  <span className={`text-sm font-bold tracking-widest uppercase ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  <span className={`text-lg font-bold ${cfg.color}`}>
                    {result.gorilla_total}/100
                  </span>
                </div>
                <p className="text-[12px] text-[#6E6258] leading-relaxed">
                  {result.verdict_rationale}
                </p>
              </div>
            );
          })()}

          {/* Dimension scores */}
          <div className="space-y-4">
            <SectionLabel>Four Dimensions</SectionLabel>
            <ScoreBar score={result.obvious_problem.score}   label="Obvious Problem"    weight="25%" />
            <ScoreBar score={result.invisible_gorilla.score} label="Invisible Gorilla"  weight="30%" />
            <ScoreBar score={result.combinatorial.score}     label="Combinatorial"      weight="25%" />
            <ScoreBar score={result.choke_point.score}       label="Choke Point"        weight="20%" />
          </div>

          <hr className="t-rule" />

          {/* Dimension details */}
          <div className="space-y-6">

            {/* Obvious Problem */}
            <div>
              <div className="flex items-baseline gap-2 mb-2">
                <SectionLabel>Obvious Problem</SectionLabel>
                <span className={`text-[10px] font-semibold ml-auto ${result.obvious_problem.score >= 65 ? "text-[#7A9E6A]" : result.obvious_problem.score >= 40 ? "text-[#C8804A]" : "text-[#C84848]"}`}>
                  {result.obvious_problem.score}/100
                </span>
              </div>
              <p className="text-[12px] text-[#6E6258] leading-relaxed mb-2">
                {result.obvious_problem.assessment}
              </p>
              {result.obvious_problem.evidence?.length > 0 && (
                <ul className="space-y-1">
                  {result.obvious_problem.evidence.map((e, i) => (
                    <li key={i} className="text-[11px] text-[#A89E94] flex gap-2">
                      <span className="text-[#C0B8AC] flex-shrink-0">·</span>
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Invisible Gorilla */}
            <div>
              <div className="flex items-baseline gap-2 mb-2">
                <SectionLabel>Invisible Gorilla</SectionLabel>
                <span className={`text-[10px] font-semibold ml-auto ${result.invisible_gorilla.score >= 65 ? "text-[#7A9E6A]" : result.invisible_gorilla.score >= 40 ? "text-[#C8804A]" : "text-[#C84848]"}`}>
                  {result.invisible_gorilla.score}/100
                </span>
              </div>
              <p className="text-[12px] text-[#6E6258] leading-relaxed mb-3">
                {result.invisible_gorilla.assessment}
              </p>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <SectionLabel>Why invisible</SectionLabel>
                  <p className="text-[12px] text-[#1E1A14]">{result.invisible_gorilla.why_invisible}</p>
                </div>
                <div>
                  <SectionLabel>Market&apos;s wrong assumption</SectionLabel>
                  <p className="text-[12px] text-[#C84848]">{result.invisible_gorilla.market_assumption}</p>
                </div>
              </div>
            </div>

            {/* Combinatorial */}
            <div>
              <div className="flex items-baseline gap-2 mb-2">
                <SectionLabel>Combinatorial</SectionLabel>
                <span className={`text-[10px] font-semibold ml-auto ${result.combinatorial.score >= 65 ? "text-[#7A9E6A]" : result.combinatorial.score >= 40 ? "text-[#C8804A]" : "text-[#C84848]"}`}>
                  {result.combinatorial.score}/100
                </span>
              </div>
              <p className="text-[12px] text-[#6E6258] leading-relaxed mb-3">
                {result.combinatorial.assessment}
              </p>
              <div>
                <SectionLabel>New combination</SectionLabel>
                <p className="text-[12px] text-[#1E1A14] mb-2">{result.combinatorial.new_combination}</p>
                {result.combinatorial.existing_technologies?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {result.combinatorial.existing_technologies.map((t, i) => (
                      <span key={i} className="text-[10px] text-[#6E6258] bg-[#F5F0EB] px-2 py-0.5 rounded border border-[#EDE7E0]">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Choke Point */}
            <div>
              <div className="flex items-baseline gap-2 mb-2">
                <SectionLabel>Choke Point</SectionLabel>
                <span className={`text-[10px] font-semibold ml-auto ${result.choke_point.score >= 65 ? "text-[#7A9E6A]" : result.choke_point.score >= 40 ? "text-[#C8804A]" : "text-[#C84848]"}`}>
                  {result.choke_point.score}/100
                </span>
              </div>
              <p className="text-[12px] text-[#6E6258] leading-relaxed mb-3">
                {result.choke_point.assessment}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <SectionLabel>Value chain</SectionLabel>
                  <p className="text-[12px] text-[#1E1A14]">{result.choke_point.value_chain}</p>
                </div>
                <div>
                  <SectionLabel>Position</SectionLabel>
                  <p className="text-[12px] text-[#1E1A14]">{result.choke_point.position}</p>
                </div>
              </div>
            </div>
          </div>

          <hr className="t-rule" />

          {/* Valuation gap */}
          <div>
            <div className="flex items-baseline gap-3 mb-2">
              <SectionLabel>Valuation consistency</SectionLabel>
              <span className={`text-[10px] font-semibold ${result.valuation_gap.consistent ? "text-[#7A9E6A]" : "text-[#C84848]"}`}>
                {result.valuation_gap.consistent ? "✓ Consistent with gorilla thesis" : "✗ Inconsistent — may already be priced in"}
              </span>
            </div>
            <p className="text-[12px] text-[#6E6258] mb-1">{result.valuation_gap.assessment}</p>
            <p className="text-[11px] text-[#A89E94]">{result.valuation_gap.current_pricing}</p>
          </div>

          <hr className="t-rule" />

          {/* Key questions */}
          {result.key_questions?.length > 0 && (
            <div>
              <SectionLabel>Key questions to resolve</SectionLabel>
              <ol className="space-y-2 mt-2">
                {result.key_questions.map((q, i) => (
                  <li key={i} className="flex gap-3 text-[12px] text-[#1E1A14]">
                    <span className="text-[#C0B8AC] flex-shrink-0 w-4">{i + 1}.</span>
                    <span className="leading-relaxed">{q}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <hr className="t-rule" />

          {/* Gorilla memo */}
          <div>
            <SectionLabel>Gorilla memo</SectionLabel>
            <p className="text-[12px] text-[#6E6258] leading-relaxed whitespace-pre-wrap mt-2">
              {result.gorilla_memo}
            </p>
          </div>

          {/* Re-run button */}
          <div className="pt-2">
            <button
              onClick={() => { setPhase("idle"); setResult(null); setLogs([]); }}
              className="text-[10px] text-[#A89E94] hover:text-[#C8804A] transition-colors"
            >
              ↺ Run again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResearchPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("business");
  const [draft, setDraft] = useState<ResearchDraft>(DEFAULT_DRAFT);
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved">("saved");
  const [launched, setLaunched] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setDraft(JSON.parse(raw) as ResearchDraft);
      }
    } catch {
      // ignore corrupt data
    }
  }, []);

  function update(patch: Partial<ResearchDraft>) {
    setDraft(prev => {
      const next = { ...prev, ...patch, updated_at: new Date().toISOString() };
      // Debounced auto-save
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setSaveStatus("unsaved");
      saveTimer.current = setTimeout(() => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          setSaveStatus("saved");
        } catch {
          // quota exceeded or private mode — ignore
        }
      }, 600);
      return next;
    });
  }

  function handleClear() {
    if (!confirm("Clear all research? This cannot be undone.")) return;
    const fresh = { ...DEFAULT_DRAFT };
    setDraft(fresh);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  function handleLaunch() {
    const builtCatalyst = [
      draft.main_thesis.trim()    && `Thesis: ${draft.main_thesis.trim()}`,
      draft.catalyst.trim()       && `Catalyst: ${draft.catalyst.trim()}`,
      draft.bull_triggers.trim()  && `Bull triggers: ${draft.bull_triggers.trim()}`,
      draft.base_narrative.trim() && `Base case: ${draft.base_narrative.trim()}`,
      draft.bear_risk.trim()      && `Bear risk: ${draft.bear_risk.trim()}`,
      draft.invalidation.trim()   && `Invalidation: ${draft.invalidation.trim()}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const prefill = {
      ticker:     draft.ticker.toUpperCase().trim(),
      analyst_id: draft.analyst_id.trim() || "analyst_001",
      mode:       draft.mode,
      catalyst:   builtCatalyst || draft.catalyst.trim(),
      news:       draft.news_items.map(n => n.headline.trim()).filter(Boolean),
    };

    try {
      localStorage.setItem(PREFILL_KEY, JSON.stringify(prefill));
    } catch {
      // ignore
    }

    setLaunched(true);
    setTimeout(() => router.push("/"), 300);
  }

  const canLaunch =
    draft.ticker.trim().length > 0 &&
    (draft.catalyst.trim().length > 10 || draft.main_thesis.trim().length > 10);

  const TABS: { key: Tab; label: string }[] = [
    { key: "business", label: "Business" },
    { key: "thesis",   label: "Thesis" },
    { key: "evidence", label: "Evidence" },
    { key: "gorilla",  label: "Gorilla" },
    { key: "launch",   label: "Launch" },
  ];

  const lastSaved = draft.updated_at
    ? new Date(draft.updated_at).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#C8804A] tracking-widest uppercase">
            Research
          </h1>
          <p className="t-label mt-1">Build your investment thesis before running the pipeline</p>
        </div>
        <div className="flex items-center gap-5">
          {lastSaved && (
            <span className={`text-[10px] ${saveStatus === "saved" ? "text-[#A89E94]" : "text-[#C89040]"}`}>
              {saveStatus === "saved" ? `saved ${lastSaved}` : "saving…"}
            </span>
          )}
          <button
            onClick={handleClear}
            className="text-[10px] text-[#C0B8AC] hover:text-[#C84848] transition-colors"
          >
            clear
          </button>
          <a
            href="/"
            className="text-xs text-[#A89E94] hover:text-[#C8804A] transition-colors"
          >
            ← Pipeline
          </a>
        </div>
      </div>

      <hr className="t-rule" />

      {/* Ticker · Company · Analyst */}
      <div className="grid grid-cols-[1fr_1.5fr_1fr] gap-6 items-end">
        <div>
          <SectionLabel>Ticker</SectionLabel>
          <TextInput
            value={draft.ticker}
            onChange={v => update({ ticker: v.toUpperCase() })}
            placeholder="NVDA"
            large
          />
        </div>
        <div>
          <SectionLabel>Company Name</SectionLabel>
          <TextInput
            value={draft.company_name}
            onChange={v => update({ company_name: v })}
            placeholder="NVIDIA Corporation"
          />
        </div>
        <div>
          <SectionLabel>Analyst ID</SectionLabel>
          <TextInput
            value={draft.analyst_id}
            onChange={v => update({ analyst_id: v })}
            placeholder="analyst_001"
          />
        </div>
      </div>

      {/* Mode selector */}
      <div>
        <SectionLabel>Mode</SectionLabel>
        <div className="flex gap-6 mt-1">
          {(Object.keys(MODE_INFO) as Mode[]).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => update({ mode: m })}
              className={`text-left transition-colors ${
                draft.mode === m
                  ? "text-[#C8804A]"
                  : "text-[#C0B8AC] hover:text-[#8C7E70]"
              }`}
            >
              <div className="text-sm font-bold tracking-wide">{MODE_INFO[m].label}</div>
              <div className="t-label">{MODE_INFO[m].desc}</div>
            </button>
          ))}
        </div>
      </div>

      <hr className="t-rule" />

      {/* Tabs */}
      <div className="flex gap-6">
        {TABS.map(t => (
          <TabButton key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </TabButton>
        ))}
      </div>

      <hr className="t-rule" />

      {/* Tab content */}
      <div className="pb-12">
        {tab === "business" && <BusinessTab draft={draft} update={update} />}
        {tab === "thesis"   && <ThesisTab   draft={draft} update={update} />}
        {tab === "evidence" && <EvidenceTab draft={draft} update={update} />}
        {tab === "gorilla"  && <GorillaTab  draft={draft} />}
        {tab === "launch" && (
          <div className="space-y-8">
            <LaunchTab draft={draft} />
            <Rule />
            <div className="space-y-3">
              <button
                onClick={handleLaunch}
                disabled={!canLaunch || launched}
                className="text-xs font-bold tracking-widest uppercase transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[#C8804A] hover:text-[#A86030] border-b border-[#C8804A]/40 hover:border-[#A86030] pb-0.5"
              >
                {launched
                  ? "Launching…"
                  : `Launch Pipeline → ${draft.ticker || "…"}`}
              </button>
              {!canLaunch && (
                <p className="text-[11px] text-[#A89E94]">
                  Add a ticker and at least a main thesis or catalyst to unlock the pipeline.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
