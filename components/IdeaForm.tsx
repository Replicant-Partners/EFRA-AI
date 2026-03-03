"use client";

import { useState } from "react";

type Mode = "valentine" | "gunn" | "dual";

interface Props {
  onSubmit: (data: {
    ticker: string;
    analyst_id: string;
    catalyst: string;
    mode: Mode;
    news: string[];
  }) => void;
}

const MODE_INFO: Record<Mode, { label: string; desc: string }> = {
  valentine: { label: "Valentine", desc: "12M catalyst" },
  gunn:      { label: "Gunn",      desc: "5Y compounder" },
  dual:      { label: "Dual",      desc: "12M + 5Y" },
};

export default function IdeaForm({ onSubmit }: Props) {
  const [ticker, setTicker] = useState("");
  const [analystId, setAnalystId] = useState("analyst_001");
  const [catalyst, setCatalyst] = useState("");
  const [mode, setMode] = useState<Mode>("valentine");
  const [news, setNews] = useState<string[]>([""]);

  function addNews() {
    if (news.length < 10) setNews([...news, ""]);
  }

  function updateNews(i: number, val: string) {
    const updated = [...news];
    updated[i] = val;
    setNews(updated);
  }

  function removeNews(i: number) {
    setNews(news.filter((_, idx) => idx !== i));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanNews = news.filter(n => n.trim().length > 0);
    onSubmit({ ticker: ticker.toUpperCase().trim(), analyst_id: analystId, catalyst, mode, news: cleanNews });
  }

  const valid = ticker.trim().length > 0 && catalyst.trim().length > 10;

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {/* Title */}
      <div>
        <h1 className="text-lg font-bold text-green-500 tracking-widest uppercase">New Idea</h1>
        <p className="t-label mt-1">Submit an investment idea to the pipeline</p>
      </div>

      <hr className="t-rule" />

      {/* Ticker + Analyst */}
      <div className="grid grid-cols-2 gap-8">
        <Field label="Ticker">
          <input
            type="text"
            value={ticker}
            onChange={e => setTicker(e.target.value)}
            placeholder="NVDA"
            className="w-full bg-transparent border-b border-[#2a2a2a] pb-1 text-2xl font-bold text-green-400 placeholder-[#333] focus:outline-none focus:border-green-500 uppercase tracking-widest transition-colors"
            required
          />
        </Field>
        <Field label="Analyst ID">
          <input
            type="text"
            value={analystId}
            onChange={e => setAnalystId(e.target.value)}
            className="w-full bg-transparent border-b border-[#2a2a2a] pb-1 text-gray-300 focus:outline-none focus:border-green-500 transition-colors"
            required
          />
        </Field>
      </div>

      {/* Mode */}
      <Field label="Mode">
        <div className="flex gap-6 mt-1">
          {(Object.keys(MODE_INFO) as Mode[]).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`text-left transition-colors ${
                mode === m ? "text-green-400" : "text-[#3a3a3a] hover:text-[#666]"
              }`}
            >
              <div className="text-sm font-bold tracking-wide">{MODE_INFO[m].label}</div>
              <div className="t-label">{MODE_INFO[m].desc}</div>
            </button>
          ))}
        </div>
      </Field>

      <hr className="t-rule" />

      {/* Catalyst */}
      <Field label="Catalyst">
        <textarea
          value={catalyst}
          onChange={e => setCatalyst(e.target.value)}
          placeholder="Describe the investment catalyst in detail…"
          rows={4}
          className="w-full bg-transparent border-b border-[#2a2a2a] pb-1 text-gray-300 placeholder-[#333] focus:outline-none focus:border-green-500 resize-none transition-colors prose-tufte leading-relaxed"
          required
        />
      </Field>

      {/* News items */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <span className="t-label">News Pool <span className="text-[#2a2a2a]">({news.length}/10)</span></span>
          {news.length < 10 && (
            <button
              type="button"
              onClick={addNews}
              className="text-xs text-[#555] hover:text-green-500 transition-colors"
            >
              + add
            </button>
          )}
        </div>
        <div className="space-y-2">
          {news.map((item, i) => (
            <div key={i} className="flex gap-3 items-center">
              <span className="text-[#3a3a3a] text-xs w-4 text-right flex-shrink-0">{i + 1}</span>
              <input
                type="text"
                value={item}
                onChange={e => updateNews(i, e.target.value)}
                placeholder={`Headline ${i + 1}…`}
                className="flex-1 bg-transparent border-b border-[#1e1e1e] pb-0.5 text-xs text-gray-300 placeholder-[#2a2a2a] focus:outline-none focus:border-[#3a3a3a] transition-colors"
              />
              {news.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeNews(i)}
                  className="text-[#2a2a2a] hover:text-red-500 transition-colors text-sm leading-none"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="t-label mt-3">Optional — leave empty to run without news pool</p>
      </div>

      <hr className="t-rule" />

      {/* Submit */}
      <button
        type="submit"
        disabled={!valid}
        className="text-xs font-bold tracking-widest uppercase transition-colors disabled:opacity-20 disabled:cursor-not-allowed text-green-500 hover:text-green-400 border-b border-green-500/30 hover:border-green-400 pb-0.5"
      >
        Run Pipeline →
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="t-label block mb-2">{label}</label>
      {children}
    </div>
  );
}
