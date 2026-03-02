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

const MODE_INFO: Record<Mode, { label: string; desc: string; horizon: string }> = {
  valentine: { label: "Valentine", desc: "12M catalyst", horizon: "SHORT" },
  gunn:      { label: "Gunn",      desc: "5Y compounder", horizon: "COMPOUNDER" },
  dual:      { label: "Dual",      desc: "12M + 5Y",       horizon: "MEDIUM" },
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
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-green-500 tracking-tight">New Idea</h1>
        <p className="text-gray-500 text-sm mt-1">Submit an investment idea to the pipeline</p>
      </div>

      {/* Ticker + Analyst */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-widest">Ticker</label>
          <input
            type="text"
            value={ticker}
            onChange={e => setTicker(e.target.value)}
            placeholder="NVDA"
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] px-4 py-3 text-xl font-bold text-green-400 placeholder-[#3a3a3a] focus:outline-none focus:border-green-500 uppercase tracking-widest"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-widest">Analyst ID</label>
          <input
            type="text"
            value={analystId}
            onChange={e => setAnalystId(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] px-4 py-3 text-gray-300 focus:outline-none focus:border-green-500"
            required
          />
        </div>
      </div>

      {/* Mode */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-widest">Mode</label>
        <div className="flex gap-0">
          {(Object.keys(MODE_INFO) as Mode[]).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 py-3 px-4 border text-sm transition-colors ${
                mode === m
                  ? "border-green-500 bg-green-500/10 text-green-400"
                  : "border-[#2a2a2a] text-gray-500 hover:border-[#3a3a3a]"
              }`}
            >
              <div className="font-bold">{MODE_INFO[m].label}</div>
              <div className="text-xs opacity-60">{MODE_INFO[m].desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Catalyst */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-widest">Catalyst</label>
        <textarea
          value={catalyst}
          onChange={e => setCatalyst(e.target.value)}
          placeholder="Describe the investment catalyst in detail…"
          rows={3}
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] px-4 py-3 text-gray-300 placeholder-[#3a3a3a] focus:outline-none focus:border-green-500 resize-none"
          required
        />
      </div>

      {/* News items */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-gray-500 uppercase tracking-widest">
            News Pool <span className="text-[#3a3a3a]">({news.length}/10)</span>
          </label>
          {news.length < 10 && (
            <button
              type="button"
              onClick={addNews}
              className="text-xs text-green-600 hover:text-green-500"
            >
              + Add item
            </button>
          )}
        </div>
        <div className="space-y-2">
          {news.map((item, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={item}
                onChange={e => updateNews(i, e.target.value)}
                placeholder={`Headline ${i + 1}…`}
                className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] px-3 py-2 text-sm text-gray-300 placeholder-[#3a3a3a] focus:outline-none focus:border-[#3a3a3a]"
              />
              {news.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeNews(i)}
                  className="text-[#3a3a3a] hover:text-red-500 px-2 transition-colors"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-2">Optional — leave empty to run without news pool</p>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!valid}
        className="w-full py-4 font-bold text-sm tracking-widest uppercase transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-green-500 text-green-500 hover:bg-green-500 hover:text-black"
      >
        Run Pipeline →
      </button>
    </form>
  );
}
