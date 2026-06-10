"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ResearchDraftPatch, ResearchSource } from "@/src/shared/types";
import { SECTIONS } from "@/src/agents/research-chat/index";
import type { SectionKey } from "@/src/agents/research-chat/index";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode    = "valentine" | "gunn" | "dual";
type Status  = "idle" | "running" | "done" | "error";

interface SectionState {
  key:       SectionKey;
  status:    Status;
  content:   string;       // streamed prose
  question:  string;       // socratic question from IA
  sources:   ResearchSource[];
  userNote:  string;       // analyst input
  submitted: boolean;      // user submitted their note and continued
}

const STORAGE_KEY = "efrain_research_v3";
const PREFILL_KEY = "efrain_research_prefill";

const MODE_INFO: Record<Mode, { label: string; desc: string }> = {
  valentine: { label: "Valentine", desc: "12M catalyst" },
  gunn:      { label: "Gunn",      desc: "5Y compounder" },
  dual:      { label: "Dual",      desc: "12M + 5Y" },
};

function initSections(): SectionState[] {
  return SECTIONS.map(s => ({
    key:       s.key,
    status:    "idle",
    content:   "",
    question:  "",
    sources:   [],
    userNote:  "",
    submitted: false,
  }));
}

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

function SourceBadge({ source }: { source: ResearchSource }) {
  const colors: Record<ResearchSource["type"], string> = {
    sec_filing:  "text-[#7A9E6A] border-[#7A9E6A]/40",
    ir_page:     "text-[#C8804A] border-[#C8804A]/40",
    news:        "text-[#A89E94] border-[#A89E94]/40",
    regulatory:  "text-[#6E6258] border-[#6E6258]/40",
    other:       "text-[#C0B8AC] border-[#C0B8AC]/40",
  };
  const labels: Record<ResearchSource["type"], string> = {
    sec_filing: "SEC", ir_page: "IR", news: "News", regulatory: "Reg", other: "Web",
  };
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      title={source.snippet ?? source.title}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 border rounded text-[9px] font-semibold tracking-wider ${colors[source.type]} hover:opacity-70 transition-opacity`}
    >
      {labels[source.type]}
      <span className="opacity-50 max-w-[100px] truncate text-[8px]">{source.title}</span>
    </a>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  section,
  sectionMeta,
  isActive,
  onContinue,
  onNoteChange,
}: {
  section:     SectionState;
  sectionMeta: typeof SECTIONS[number];
  isActive:    boolean;
  onContinue:  () => void;
  onNoteChange:(v: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (section.status === "done" && !section.submitted && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [section.status, section.submitted]);

  // Clean prose: remove → question line from displayed content
  const prose = section.content
    .split("\n")
    .filter(l => !l.trim().startsWith("→"))
    .join("\n")
    .trim();

  const isIdle    = section.status === "idle";
  const isRunning = section.status === "running";
  const isDone    = section.status === "done" || section.submitted;
  const isError   = section.status === "error";

  // Collapsed state: section not yet reached
  if (isIdle && !isActive) {
    return (
      <div className="flex items-center gap-4 py-3 opacity-30">
        <span className="text-[10px] font-mono text-[#C0B8AC] w-5">{sectionMeta.icon}</span>
        <span className="text-[11px] font-semibold tracking-wider text-[#6E6258] uppercase">{sectionMeta.label}</span>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${section.submitted ? "opacity-70" : ""}`}>

      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono text-[#C8804A] w-5">{sectionMeta.icon}</span>
        <span className="text-[11px] font-bold tracking-[0.12em] text-[#1E1A14] uppercase">{sectionMeta.label}</span>
        {isRunning && (
          <span className="text-[9px] text-[#C8804A] animate-pulse tracking-wider">analyzing…</span>
        )}
        {section.submitted && (
          <span className="text-[9px] text-[#7A9E6A] tracking-wider ml-auto">✓ done</span>
        )}
      </div>

      {/* Streamed prose */}
      {(isRunning || isDone || isError) && (
        <div className="pl-8 space-y-3">
          {isRunning && !prose && (
            <div className="space-y-1.5">
              <div className="h-2.5 bg-[#EDE7E0] rounded animate-pulse w-full" />
              <div className="h-2.5 bg-[#EDE7E0] rounded animate-pulse w-4/5" />
              <div className="h-2.5 bg-[#EDE7E0] rounded animate-pulse w-3/5" />
            </div>
          )}

          {prose && (
            <div className="text-sm text-[#1E1A14] leading-relaxed whitespace-pre-wrap">
              {prose}
              {isRunning && (
                <span className="inline-block w-[5px] h-[13px] bg-[#C8804A] animate-pulse ml-0.5 rounded-sm align-middle" />
              )}
            </div>
          )}

          {isError && (
            <p className="text-[11px] text-[#C84848]">{section.content}</p>
          )}

          {/* Sources */}
          {section.sources.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {section.sources.map((s, i) => <SourceBadge key={i} source={s} />)}
            </div>
          )}

          {/* Socratic question + user input — show after streaming done */}
          {section.status === "done" && !section.submitted && (
            <div className="border-l-2 border-[#C8804A]/40 pl-4 space-y-3 pt-1">
              {section.question && (
                <p className="text-[12px] text-[#C8804A] italic leading-relaxed">
                  {section.question}
                </p>
              )}
              <textarea
                ref={textareaRef}
                value={section.userNote}
                onChange={e => onNoteChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    onContinue();
                  }
                }}
                placeholder="Add context, corrections, or additional data… (optional)"
                rows={2}
                className="w-full bg-transparent border-b border-[#D8D0C8] pb-1 text-sm text-[#1E1A14] placeholder-[#C0B8AC] focus:outline-none focus:border-[#C8804A] resize-none leading-relaxed transition-colors"
              />
              <div className="flex items-center gap-4">
                <button
                  onClick={onContinue}
                  className="text-[10px] font-bold tracking-widest uppercase text-[#C8804A] hover:text-[#A86030] border-b border-[#C8804A]/40 hover:border-[#A86030] pb-0.5 transition-colors"
                >
                  Continue →
                </button>
                <span className="text-[9px] text-[#C0B8AC]">⌘↵ to continue</span>
              </div>
            </div>
          )}

          {/* Submitted note preview */}
          {section.submitted && section.userNote.trim() && (
            <div className="border-l-2 border-[#EDE7E0] pl-4">
              <p className="text-[11px] text-[#A89E94] italic">{section.userNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResearchPage() {
  const router = useRouter();

  const [ticker,     setTicker]     = useState("");
  const [mode,       setMode]       = useState<Mode>("valentine");
  const [started,    setStarted]    = useState(false);
  const [sections,   setSections]   = useState<SectionState[]>(initSections());
  const [draft,      setDraft]      = useState<ResearchDraftPatch>({});
  const [activeIdx,  setActiveIdx]  = useState(0);
  const [facts,      setFacts]      = useState("");   // cached EDGAR facts
  const [allDone,    setAllDone]    = useState(false);

  const draftRef    = useRef<ResearchDraftPatch>({});
  const factsRef    = useRef("");
  const sectionsRef = useRef<SectionState[]>(sections);

  draftRef.current    = draft;
  factsRef.current    = facts;
  sectionsRef.current = sections;

  // ── Persistence ────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { ticker: t, mode: m, sections: s, draft: d, facts: f, activeIdx: ai, allDone: ad } =
          JSON.parse(saved) as {
            ticker: string; mode: Mode; sections: SectionState[];
            draft: ResearchDraftPatch; facts: string; activeIdx: number; allDone: boolean;
          };
        if (t) { setTicker(t); setMode(m ?? "valentine"); setSections(s); setDraft(d ?? {}); setFacts(f ?? ""); setActiveIdx(ai ?? 0); setAllDone(ad ?? false); setStarted(true); }
      }
    } catch { /* ignore */ }
  }, []);

  function persist(
    t: string, m: Mode, s: SectionState[], d: ResearchDraftPatch,
    f: string, ai: number, ad: boolean,
  ) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ticker: t, mode: m, sections: s, draft: d, facts: f, activeIdx: ai, allDone: ad })); } catch { /* ignore */ }
  }

  // ── Update draft ──────────────────────────────────────────────────────────
  const updateDraft = useCallback((patch: ResearchDraftPatch) => {
    setDraft(prev => {
      const next = { ...prev, ...patch };
      draftRef.current = next;
      return next;
    });
  }, []);

  // ── Run a section ──────────────────────────────────────────────────────────
  async function runSection(idx: number, userNote?: string) {
    const sectionKey = SECTIONS[idx].key;

    setSections(prev => {
      const next: SectionState[] = prev.map((s, i) =>
        i === idx ? { ...s, status: "running" as Status, content: "", question: "", sources: [], submitted: false } : s,
      );
      sectionsRef.current = next;
      return next;
    });

    try {
      const res = await fetch("/api/research/section", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          ticker:     ticker.toUpperCase().trim(),
          sectionKey,
          userNote:   userNote?.trim() || undefined,
          draft:      draftRef.current,
          facts:      factsRef.current || undefined,
        }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";

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
            type: string; token?: string; sources?: ResearchSource[];
            patch?: ResearchDraftPatch; question?: string; error?: string;
          };

          if (msg.type === "token" && msg.token) {
            setSections(prev => {
              const next: SectionState[] = prev.map((s, i) =>
                i === idx ? { ...s, content: s.content + msg.token! } : s,
              );
              sectionsRef.current = next;
              return next;
            });
          } else if (msg.type === "sources" && msg.sources) {
            setSections(prev => {
              const next: SectionState[] = prev.map((s, i) =>
                i === idx ? { ...s, sources: msg.sources! } : s,
              );
              sectionsRef.current = next;
              return next;
            });
          } else if (msg.type === "patch" && msg.patch) {
            updateDraft(msg.patch);
          } else if (msg.type === "question" && msg.question) {
            setSections(prev => {
              const next: SectionState[] = prev.map((s, i) =>
                i === idx ? { ...s, question: msg.question! } : s,
              );
              sectionsRef.current = next;
              return next;
            });
          } else if (msg.type === "done") {
            setSections(prev => {
              const next: SectionState[] = prev.map((s, i) =>
                i === idx ? { ...s, status: "done" as Status } : s,
              );
              sectionsRef.current = next;
              persist(ticker, mode, next, draftRef.current, factsRef.current, idx, false);
              return next;
            });
          } else if (msg.type === "error") {
            setSections(prev => {
              const next: SectionState[] = prev.map((s, i) =>
                i === idx ? { ...s, status: "error" as Status, content: msg.error ?? "Unknown error" } : s,
              );
              sectionsRef.current = next;
              return next;
            });
          }
        }
      }
    } catch (err) {
      setSections(prev => {
        const next: SectionState[] = prev.map((s, i) =>
          i === idx ? { ...s, status: "error" as Status, content: String(err) } : s,
        );
        sectionsRef.current = next;
        return next;
      });
    }
  }

  // ── Start research ─────────────────────────────────────────────────────────
  async function handleStart() {
    if (!ticker.trim()) return;
    const t = ticker.toUpperCase().trim();
    setTicker(t);
    const fresh = initSections();
    setSections(fresh);
    setDraft({ ticker: t, mode });
    setActiveIdx(0);
    setAllDone(false);
    setStarted(true);
    persist(t, mode, fresh, { ticker: t, mode }, "", 0, false);
    await runSection(0);
  }

  // ── User clicks Continue ────────────────────────────────────────────────────
  async function handleContinue(idx: number) {
    const section   = sectionsRef.current[idx];
    const userNote  = section.userNote.trim();
    const nextIdx   = idx + 1;

    // Mark current as submitted
    setSections(prev => {
      const next: SectionState[] = prev.map((s, i) =>
        i === idx ? { ...s, submitted: true } : s,
      );
      sectionsRef.current = next;
      return next;
    });

    // If user added a note, regenerate current section with the note
    if (userNote) {
      await runSection(idx, userNote);
      // After regeneration mark submitted again
      setSections(prev => {
        const next: SectionState[] = prev.map((s, i) =>
          i === idx ? { ...s, submitted: true } : s,
        );
        sectionsRef.current = next;
        return next;
      });
    }

    // Advance to next section
    if (nextIdx < SECTIONS.length) {
      setActiveIdx(nextIdx);
      persist(ticker, mode, sectionsRef.current, draftRef.current, factsRef.current, nextIdx, false);
      await runSection(nextIdx);
    } else {
      setAllDone(true);
      persist(ticker, mode, sectionsRef.current, draftRef.current, factsRef.current, nextIdx, true);
    }
  }

  // ── Launch pipeline ────────────────────────────────────────────────────────
  function handleLaunch() {
    const d = draftRef.current;
    const builtCatalyst = [
      d.main_thesis?.trim()    && `Thesis: ${d.main_thesis}`,
      d.catalyst?.trim()       && `Catalyst: ${d.catalyst}`,
      d.bull_triggers?.trim()  && `Bull triggers: ${d.bull_triggers}`,
      d.base_narrative?.trim() && `Base case: ${d.base_narrative}`,
      d.bear_risk?.trim()      && `Bear risk: ${d.bear_risk}`,
      d.invalidation?.trim()   && `Invalidation: ${d.invalidation}`,
    ].filter(Boolean).join("\n\n");

    const prefill = {
      ticker:     (d.ticker ?? ticker).toUpperCase().trim(),
      analyst_id: "analyst_001",
      mode:       d.mode ?? mode,
      catalyst:   builtCatalyst || d.catalyst?.trim() || "",
      news:       (d.news_items ?? []).map(n => n.headline).filter(Boolean),
    };

    try { localStorage.setItem(PREFILL_KEY, JSON.stringify(prefill)); } catch { /* ignore */ }
    router.push("/");
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  function handleReset() {
    if (!confirm("Start over? This will clear the current research.")) return;
    setStarted(false);
    setSections(initSections());
    setDraft({});
    setTicker("");
    setMode("valentine");
    setActiveIdx(0);
    setAllDone(false);
    setFacts("");
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  const currentlyRunning = sections.some(s => s.status === "running");
  const canLaunch = allDone || (
    (draft.main_thesis ?? "").trim().length > 10 ||
    (draft.catalyst ?? "").trim().length > 10
  );

  // ── Scroll active section into view ────────────────────────────────────────
  const activeSectionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (activeSectionRef.current) {
      activeSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeIdx]);

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────────

  // ── Start screen ────────────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-lg font-bold text-[#C8804A] tracking-widest uppercase">Research</h1>
          <p className="t-label mt-1">AI-guided investment thesis builder</p>
        </div>

        <p className="text-sm text-[#6E6258] leading-relaxed max-w-lg">
          Enter a ticker and the AI will build the investment thesis section by section —
          pulling live data from SEC EDGAR — pausing after each section so you can
          add context or corrections before moving on.
        </p>

        <Rule />

        <div className="space-y-6 max-w-xs">
          <div>
            <SectionLabel>Ticker</SectionLabel>
            <input
              type="text"
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && void handleStart()}
              placeholder="NVDA"
              autoFocus
              className="w-full bg-transparent border-b border-[#D8D0C8] pb-1 text-2xl font-bold text-[#C8804A] uppercase tracking-widest placeholder-[#D8D0C8] focus:outline-none focus:border-[#C8804A] transition-colors"
            />
          </div>

          <div>
            <SectionLabel>Mode</SectionLabel>
            <div className="flex gap-6 mt-1">
              {(Object.keys(MODE_INFO) as Mode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`text-left transition-colors ${
                    mode === m ? "text-[#C8804A]" : "text-[#C0B8AC] hover:text-[#8C7E70]"
                  }`}
                >
                  <div className="text-sm font-bold tracking-wide">{MODE_INFO[m].label}</div>
                  <div className="t-label">{MODE_INFO[m].desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => void handleStart()}
            disabled={!ticker.trim()}
            className="text-xs font-bold tracking-widest uppercase text-[#C8804A] hover:text-[#A86030] border-b border-[#C8804A]/40 hover:border-[#A86030] pb-0.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Build Thesis →
          </button>
        </div>
      </div>
    );
  }

  // ── Research screen ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-0">

      {/* Header */}
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-[#C8804A] tracking-widest uppercase">{ticker}</h1>
          <p className="t-label mt-0.5">
            {MODE_INFO[mode].label} · {MODE_INFO[mode].desc}
            {currentlyRunning && <span className="text-[#C8804A] ml-2">· analyzing…</span>}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {canLaunch && (
            <button
              onClick={handleLaunch}
              className="text-[10px] font-bold tracking-widest uppercase text-[#C8804A] hover:text-[#A86030] border-b border-[#C8804A]/40 hover:border-[#A86030] pb-0.5 transition-colors"
            >
              Launch Pipeline →
            </button>
          )}
          <button
            onClick={handleReset}
            className="text-[10px] text-[#C0B8AC] hover:text-[#C84848] transition-colors"
          >
            New
          </button>
        </div>
      </div>

      <Rule />

      {/* Sections */}
      <div className="mt-6 space-y-6 pb-16">
        {sections.map((section, idx) => {
          const meta     = SECTIONS[idx];
          const isActive = idx === activeIdx;
          return (
            <div key={section.key} ref={isActive ? activeSectionRef : undefined}>
              <SectionCard
                section={section}
                sectionMeta={meta}
                isActive={isActive}
                onContinue={() => void handleContinue(idx)}
                onNoteChange={v =>
                  setSections(prev =>
                    prev.map((s, i) => i === idx ? { ...s, userNote: v } : s),
                  )
                }
              />
              {idx < sections.length - 1 && (section.status !== "idle" || isActive) && (
                <div className="mt-6">
                  <Rule />
                </div>
              )}
            </div>
          );
        })}

        {/* All done */}
        {allDone && (
          <div className="space-y-4 pt-2">
            <Rule />
            <div className="space-y-2">
              <p className="text-sm text-[#6E6258]">
                Thesis complete. Ready to run through the 9-agent pipeline.
              </p>
              <button
                onClick={handleLaunch}
                className="text-xs font-bold tracking-widest uppercase text-[#C8804A] hover:text-[#A86030] border-b border-[#C8804A]/40 hover:border-[#A86030] pb-0.5 transition-colors"
              >
                Launch Pipeline → {ticker}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
