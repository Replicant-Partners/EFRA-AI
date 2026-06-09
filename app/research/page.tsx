"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ResearchDraftPatch, ResearchSource } from "@/src/shared/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "valentine" | "gunn" | "dual";

interface ChatMessage {
  id:        string;
  role:      "user" | "assistant";
  content:   string;           // displayed text (no <draft_patch> tags)
  sources?:  ResearchSource[];
  streaming?: boolean;
}

const STORAGE_KEY  = "efrain_research_draft_v2";
const CHAT_KEY     = "efrain_research_chat_v2";
const PREFILL_KEY  = "efrain_research_prefill";

const DEFAULT_DRAFT: ResearchDraftPatch = {
  ticker:              "",
  company_name:        "",
  mode:                "valentine",
  business_summary:    "",
  economic_domain:     "",
  geographic_exposure: "",
  moat_type:           "",
  moat_evidence:       "",
  management_notes:    "",
  key_metrics:         "",
  main_thesis:         "",
  bull_triggers:       "",
  bull_pt:             "",
  base_narrative:      "",
  base_pt:             "",
  bear_risk:           "",
  invalidation:        "",
  catalyst:            "",
  news_items:          [],
};

const MODE_INFO: Record<Mode, { label: string; desc: string }> = {
  valentine: { label: "Valentine", desc: "12M catalyst" },
  gunn:      { label: "Gunn",      desc: "5Y compounder" },
  dual:      { label: "Dual",      desc: "12M + 5Y" },
};

// ─── Primitive components ─────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-semibold tracking-[0.14em] text-[#C0B8AC] uppercase block mb-1">
      {children}
    </span>
  );
}

function Rule() {
  return <hr className="border-t border-[#EDE7E0]" />;
}

// ─── Draft completeness indicator ────────────────────────────────────────────

function DraftProgress({ draft }: { draft: ResearchDraftPatch }) {
  const fields = [
    draft.business_summary,
    draft.moat_type,
    draft.moat_evidence,
    draft.main_thesis,
    draft.catalyst,
    draft.key_metrics,
    draft.bear_risk,
    draft.invalidation,
    draft.bull_triggers,
    draft.base_narrative,
  ];
  const filled  = fields.filter(f => typeof f === "string" && f.trim().length > 0).length;
  const total   = fields.length;
  const pct     = Math.round((filled / total) * 100);
  const color   = pct >= 70 ? "bg-[#7A9E6A]" : pct >= 40 ? "bg-[#C8804A]" : "bg-[#D8D0C8]";

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <SectionLabel>Draft completeness</SectionLabel>
        <span className="text-[9px] text-[#A89E94]">{filled}/{total}</span>
      </div>
      <div className="h-[3px] bg-[#EDE7E0] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Draft panel ──────────────────────────────────────────────────────────────

function DraftPanel({
  draft,
  onUpdate,
}: {
  draft: ResearchDraftPatch;
  onUpdate: (patch: Partial<ResearchDraftPatch>) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>("thesis");

  const Section = ({
    id,
    label,
    children,
  }: {
    id: string;
    label: string;
    children: React.ReactNode;
  }) => {
    const open = expanded === id;
    return (
      <div className="border-b border-[#EDE7E0] last:border-0">
        <button
          onClick={() => setExpanded(open ? null : id)}
          className="w-full flex items-center justify-between py-2.5 text-left"
        >
          <span className="text-[10px] font-semibold tracking-[0.12em] text-[#6E6258] uppercase">
            {label}
          </span>
          <span className="text-[#C0B8AC] text-[10px]">{open ? "▲" : "▼"}</span>
        </button>
        {open && <div className="pb-3 space-y-3">{children}</div>}
      </div>
    );
  };

  const Field = ({
    label,
    value,
    onChange,
    rows = 2,
    placeholder,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    rows?: number;
    placeholder?: string;
  }) => (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder ?? "—"}
        className="w-full bg-transparent border-b border-[#D8D0C8] pb-1 text-[11px] text-[#1E1A14] placeholder-[#D8D0C8] focus:outline-none focus:border-[#C8804A] resize-none leading-relaxed transition-colors"
      />
    </div>
  );

  return (
    <div className="space-y-0">
      <DraftProgress draft={draft} />

      <div className="pt-3">
        <Section id="business" label="Business">
          <Field
            label="Summary"
            value={draft.business_summary ?? ""}
            onChange={v => onUpdate({ business_summary: v })}
            rows={3}
            placeholder="What the company does and how it makes money…"
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Domain"
              value={draft.economic_domain ?? ""}
              onChange={v => onUpdate({ economic_domain: v })}
              rows={1}
            />
            <Field
              label="Geography"
              value={draft.geographic_exposure ?? ""}
              onChange={v => onUpdate({ geographic_exposure: v })}
              rows={1}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Moat type"
              value={draft.moat_type ?? ""}
              onChange={v => onUpdate({ moat_type: v })}
              rows={1}
            />
            <Field
              label="Moat evidence"
              value={draft.moat_evidence ?? ""}
              onChange={v => onUpdate({ moat_evidence: v })}
              rows={1}
            />
          </div>
          <Field
            label="Key metrics"
            value={draft.key_metrics ?? ""}
            onChange={v => onUpdate({ key_metrics: v })}
            rows={2}
            placeholder="Rev growth · Margins · EV/EBITDA · FCF…"
          />
          <Field
            label="Management"
            value={draft.management_notes ?? ""}
            onChange={v => onUpdate({ management_notes: v })}
            rows={2}
          />
        </Section>

        <Section id="thesis" label="Thesis">
          <Field
            label="Main thesis"
            value={draft.main_thesis ?? ""}
            onChange={v => onUpdate({ main_thesis: v })}
            rows={3}
            placeholder="The core investment case…"
          />
          <Field
            label="Catalyst"
            value={draft.catalyst ?? ""}
            onChange={v => onUpdate({ catalyst: v })}
            rows={2}
            placeholder="Why now?"
          />
        </Section>

        <Section id="scenarios" label="Scenarios">
          <div className="space-y-3">
            <div className="border-l-2 border-[#7A9E6A] pl-3 space-y-2">
              <span className="text-[9px] font-bold text-[#7A9E6A] tracking-wider uppercase">Bull</span>
              <Field
                label="Triggers"
                value={draft.bull_triggers ?? ""}
                onChange={v => onUpdate({ bull_triggers: v })}
                rows={1}
              />
              <Field
                label="Price target"
                value={draft.bull_pt ?? ""}
                onChange={v => onUpdate({ bull_pt: v })}
                rows={1}
              />
            </div>
            <div className="border-l-2 border-[#C8804A] pl-3 space-y-2">
              <span className="text-[9px] font-bold text-[#C8804A] tracking-wider uppercase">Base</span>
              <Field
                label="Narrative"
                value={draft.base_narrative ?? ""}
                onChange={v => onUpdate({ base_narrative: v })}
                rows={1}
              />
              <Field
                label="Price target"
                value={draft.base_pt ?? ""}
                onChange={v => onUpdate({ base_pt: v })}
                rows={1}
              />
            </div>
            <div className="border-l-2 border-[#C84848] pl-3 space-y-2">
              <span className="text-[9px] font-bold text-[#C84848] tracking-wider uppercase">Bear</span>
              <Field
                label="Risk"
                value={draft.bear_risk ?? ""}
                onChange={v => onUpdate({ bear_risk: v })}
                rows={1}
              />
              <Field
                label="Invalidation"
                value={draft.invalidation ?? ""}
                onChange={v => onUpdate({ invalidation: v })}
                rows={1}
              />
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

// ─── Source badge ─────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: ResearchSource }) {
  const typeColors: Record<ResearchSource["type"], string> = {
    sec_filing:  "text-[#7A9E6A] border-[#7A9E6A]/40",
    ir_page:     "text-[#C8804A] border-[#C8804A]/40",
    news:        "text-[#A89E94] border-[#A89E94]/40",
    regulatory:  "text-[#6E6258] border-[#6E6258]/40",
    other:       "text-[#C0B8AC] border-[#C0B8AC]/40",
  };

  const typeLabel: Record<ResearchSource["type"], string> = {
    sec_filing:  "SEC",
    ir_page:     "IR",
    news:        "News",
    regulatory:  "Reg",
    other:       "Web",
  };

  const color = typeColors[source.type] ?? typeColors.other;
  const label = typeLabel[source.type] ?? "Web";

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      title={source.snippet ?? source.title}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 border rounded text-[9px] font-semibold tracking-wider ${color} hover:opacity-80 transition-opacity`}
    >
      <span>{label}</span>
      <span className="text-[8px] opacity-60 max-w-[120px] truncate">{source.title}</span>
    </a>
  );
}

// ─── Chat bubble ──────────────────────────────────────────────────────────────

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  // Strip <draft_patch> blocks from displayed content
  const visibleContent = message.content
    .replace(/<draft_patch>[\s\S]*?<\/draft_patch>/g, "")
    .trim();

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5 ${
        isUser
          ? "bg-[#C8804A]/20 text-[#C8804A]"
          : "bg-[#E8E2DC] text-[#6E6258]"
      }`}>
        {isUser ? "A" : "E"}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-[88%] space-y-2 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div className={`rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-[#C8804A]/10 text-[#1E1A14] ml-auto"
            : "bg-white border border-[#EDE7E0] text-[#1E1A14]"
        }`}>
          <p className="whitespace-pre-wrap">{visibleContent}</p>
          {message.streaming && (
            <span className="inline-block w-[6px] h-[13px] bg-[#C8804A] animate-pulse ml-0.5 rounded-sm" />
          )}
        </div>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.sources.map((s, i) => (
              <SourceBadge key={i} source={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Draft changed indicator ──────────────────────────────────────────────────

function DraftChangedPill({ fields }: { fields: string[] }) {
  if (fields.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 py-1">
      <div className="flex-1 h-px bg-[#EDE7E0]" />
      <span className="text-[9px] text-[#A89E94] tracking-wider px-2">
        draft updated · {fields.slice(0, 3).join(" · ")}{fields.length > 3 ? ` +${fields.length - 3}` : ""}
      </span>
      <div className="flex-1 h-px bg-[#EDE7E0]" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResearchPage() {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────
  const [ticker,    setTicker]    = useState("");
  const [mode,      setMode]      = useState<Mode>("valentine");
  const [started,   setStarted]   = useState(false);
  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [draft,     setDraft]     = useState<ResearchDraftPatch>(DEFAULT_DRAFT);
  const [input,     setInput]     = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showDraft, setShowDraft] = useState(false);
  const [lastPatchFields, setLastPatchFields] = useState<string[]>([]);

  const bottomRef   = useRef<HTMLDivElement | null>(null);
  const inputRef    = useRef<HTMLTextAreaElement | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const draftRef    = useRef<ResearchDraftPatch>(DEFAULT_DRAFT);

  // Keep refs in sync
  messagesRef.current = messages;
  draftRef.current    = draft;

  // ── Persistence ────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(STORAGE_KEY);
      const savedChat  = localStorage.getItem(CHAT_KEY);
      if (savedDraft) {
        const d = JSON.parse(savedDraft) as ResearchDraftPatch & { _ticker?: string; _mode?: Mode };
        setDraft(d);
        if (d.ticker)  setTicker(d.ticker);
        if (d.mode)    setMode(d.mode as Mode);
      }
      if (savedChat) {
        const { messages: msgs, started: s } = JSON.parse(savedChat) as { messages: ChatMessage[]; started: boolean };
        if (msgs?.length > 0) { setMessages(msgs); setStarted(s ?? true); }
      }
    } catch { /* ignore */ }
  }, []);

  function persistDraft(d: ResearchDraftPatch) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch { /* ignore */ }
  }

  function persistChat(msgs: ChatMessage[], s: boolean) {
    try { localStorage.setItem(CHAT_KEY, JSON.stringify({ messages: msgs, started: s })); } catch { /* ignore */ }
  }

  // ── Scroll to bottom ───────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Update draft ──────────────────────────────────────────────────────────
  const updateDraft = useCallback((patch: Partial<ResearchDraftPatch>) => {
    setDraft(prev => {
      const next = { ...prev, ...patch };
      persistDraft(next);
      return next;
    });
  }, []);

  // ── Apply patch from AI ────────────────────────────────────────────────────
  function applyPatch(newPatch: ResearchDraftPatch) {
    const changed: string[] = [];
    const current = draftRef.current;

    const stringFields = [
      "business_summary", "moat_type", "moat_evidence", "management_notes",
      "key_metrics", "main_thesis", "bull_triggers", "bull_pt",
      "base_narrative", "base_pt", "bear_risk", "invalidation",
      "catalyst", "geographic_exposure", "economic_domain", "company_name",
    ] as const;

    const fieldLabels: Record<string, string> = {
      business_summary: "business", moat_type: "moat", moat_evidence: "moat evidence",
      key_metrics: "metrics", main_thesis: "thesis", catalyst: "catalyst",
      bull_triggers: "bull", base_narrative: "base", bear_risk: "bear",
      invalidation: "invalidation", management_notes: "management",
      geographic_exposure: "geography", economic_domain: "domain",
      company_name: "company",
    };

    const update: Partial<ResearchDraftPatch> = {};
    for (const field of stringFields) {
      const newVal = newPatch[field];
      if (typeof newVal === "string" && newVal.trim() && newVal !== current[field]) {
        (update as Record<string, unknown>)[field] = newVal;
        changed.push(fieldLabels[field] ?? field);
      }
    }

    if (newPatch.news_items && newPatch.news_items.length > 0) {
      update.news_items = newPatch.news_items;
      changed.push("evidence");
    }

    if (Object.keys(update).length > 0) {
      updateDraft(update);
      setLastPatchFields(changed);
      // Clear patch indicator after 4s
      setTimeout(() => setLastPatchFields([]), 4000);
    }
  }

  // ── SSE stream consumer ────────────────────────────────────────────────────
  async function streamChat(isOpening: boolean, userContent?: string) {
    setStreaming(true);

    // Add streaming placeholder for assistant
    const assistantId = `msg_${Date.now()}_a`;
    setMessages(prev => {
      const next = [
        ...prev,
        {
          id:        assistantId,
          role:      "assistant" as const,
          content:   "",
          streaming: true,
        },
      ];
      persistChat(next, true);
      return next;
    });

    try {
      const currentMessages = messagesRef.current
        .filter(m => !m.streaming)
        .map(m => ({ role: m.role, content: m.content }));

      if (userContent) {
        currentMessages.push({ role: "user", content: userContent });
      }

      const res = await fetch("/api/research/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker:   ticker.toUpperCase().trim(),
          messages: currentMessages,
          draft:    draftRef.current,
          opening:  isOpening,
        }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";
      let   accText = "";

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
            type:    string;
            token?:  string;
            sources?: ResearchSource[];
            patch?:  ResearchDraftPatch;
            error?:  string;
          };

          if (msg.type === "token" && msg.token) {
            accText += msg.token;
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: accText, streaming: true }
                  : m,
              ),
            );
          } else if (msg.type === "sources" && msg.sources) {
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId
                  ? { ...m, sources: msg.sources }
                  : m,
              ),
            );
          } else if (msg.type === "draft_patch" && msg.patch) {
            applyPatch(msg.patch);
          } else if (msg.type === "done") {
            setMessages(prev => {
              const next = prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: accText, streaming: false }
                  : m,
              );
              persistChat(next, true);
              return next;
            });
          } else if (msg.type === "error") {
            setMessages(prev => {
              const next = prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: `Error: ${msg.error}`, streaming: false }
                  : m,
              );
              persistChat(next, true);
              return next;
            });
          }
        }
      }
    } catch (err) {
      setMessages(prev => {
        const next = prev.map(m =>
          m.id === assistantId
            ? { ...m, content: `Connection error: ${String(err)}`, streaming: false }
            : m,
        );
        persistChat(next, true);
        return next;
      });
    }

    setStreaming(false);
  }

  // ── Start session ──────────────────────────────────────────────────────────
  async function handleStart() {
    if (!ticker.trim()) return;
    const t = ticker.toUpperCase().trim();
    setTicker(t);
    updateDraft({ ticker: t, mode });
    setStarted(true);
    setMessages([]);
    await streamChat(true);
  }

  // ── Send message ───────────────────────────────────────────────────────────
  async function handleSend() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const userMsg: ChatMessage = {
      id:      `msg_${Date.now()}_u`,
      role:    "user",
      content: text,
    };

    setMessages(prev => {
      const next = [...prev, userMsg];
      persistChat(next, true);
      return next;
    });

    await streamChat(false, text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  function handleReset() {
    if (!confirm("Start a new research session? This will clear the current conversation.")) return;
    setStarted(false);
    setMessages([]);
    setDraft(DEFAULT_DRAFT);
    setTicker("");
    setMode("valentine");
    setInput("");
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(CHAT_KEY);
    } catch { /* ignore */ }
  }

  // ── Launch pipeline ────────────────────────────────────────────────────────
  function handleLaunch() {
    const canLaunch =
      (draft.ticker ?? "").trim().length > 0 &&
      ((draft.main_thesis ?? "").trim().length > 10 || (draft.catalyst ?? "").trim().length > 10);

    if (!canLaunch) return;

    const builtCatalyst = [
      (draft.main_thesis ?? "").trim()    && `Thesis: ${draft.main_thesis}`,
      (draft.catalyst ?? "").trim()       && `Catalyst: ${draft.catalyst}`,
      (draft.bull_triggers ?? "").trim()  && `Bull triggers: ${draft.bull_triggers}`,
      (draft.base_narrative ?? "").trim() && `Base case: ${draft.base_narrative}`,
      (draft.bear_risk ?? "").trim()      && `Bear risk: ${draft.bear_risk}`,
      (draft.invalidation ?? "").trim()   && `Invalidation: ${draft.invalidation}`,
    ].filter(Boolean).join("\n\n");

    const prefill = {
      ticker:     (draft.ticker ?? "").toUpperCase().trim(),
      analyst_id: "analyst_001",
      mode:       draft.mode ?? "valentine",
      catalyst:   builtCatalyst || (draft.catalyst ?? "").trim(),
      news:       (draft.news_items ?? []).map(n => n.headline).filter(Boolean),
    };

    try { localStorage.setItem(PREFILL_KEY, JSON.stringify(prefill)); } catch { /* ignore */ }
    router.push("/");
  }

  const canLaunch =
    (draft.ticker ?? "").trim().length > 0 &&
    ((draft.main_thesis ?? "").trim().length > 10 || (draft.catalyst ?? "").trim().length > 10);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  // ── Start screen ──────────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-lg font-bold text-[#C8804A] tracking-widest uppercase">Research</h1>
          <p className="t-label mt-1">Collaborative investment thesis development</p>
        </div>

        <p className="text-sm text-[#6E6258] leading-relaxed max-w-lg">
          Enter a ticker and start a conversation. The AI pulls live data from SEC EDGAR
          and asks targeted questions to help you build a rigorous thesis — which gets
          assembled into a structured draft as the dialogue unfolds.
        </p>

        <Rule />

        <div className="space-y-6 max-w-sm">
          {/* Ticker */}
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

          {/* Mode */}
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
            Begin Research →
          </button>
        </div>
      </div>
    );
  }

  // ── Chat screen ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-0">

      {/* ── Header ── */}
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-[#C8804A] tracking-widest uppercase">
            {ticker}
          </h1>
          <p className="t-label mt-0.5">
            {MODE_INFO[mode].label} · {MODE_INFO[mode].desc}
            {streaming && <span className="text-[#C8804A] ml-2">· thinking…</span>}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowDraft(s => !s)}
            className={`text-[10px] font-semibold tracking-wider transition-colors ${
              showDraft ? "text-[#C8804A]" : "text-[#A89E94] hover:text-[#C8804A]"
            }`}
          >
            {showDraft ? "Hide draft ▲" : "Show draft ▼"}
          </button>
          <button
            onClick={handleLaunch}
            disabled={!canLaunch}
            className="text-[10px] font-bold tracking-widest uppercase text-[#C8804A] hover:text-[#A86030] border-b border-[#C8804A]/40 hover:border-[#A86030] pb-0.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Launch Pipeline →
          </button>
          <button
            onClick={handleReset}
            className="text-[10px] text-[#C0B8AC] hover:text-[#C84848] transition-colors"
          >
            New
          </button>
        </div>
      </div>

      <Rule />

      {/* ── Two-column layout: chat + draft ── */}
      <div className={`mt-5 ${showDraft ? "grid grid-cols-[1fr_300px] gap-6" : ""}`}>

        {/* ── Chat column ── */}
        <div className="flex flex-col">

          {/* Messages */}
          <div className="space-y-5 min-h-[400px]">
            {messages.map((msg, i) => (
              <div key={msg.id}>
                <ChatBubble message={msg} />
                {/* Show draft update pill after assistant messages */}
                {msg.role === "assistant" && !msg.streaming && i === messages.length - 1 && lastPatchFields.length > 0 && (
                  <DraftChangedPill fields={lastPatchFields} />
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <Rule />

          {/* ── Input ── */}
          <div className="mt-4 flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Share your thoughts on the company, ask a question, or push back on the analysis…"
              rows={3}
              disabled={streaming}
              className="flex-1 bg-transparent border-b border-[#D8D0C8] pb-1 text-sm text-[#1E1A14] placeholder-[#C0B8AC] focus:outline-none focus:border-[#C8804A] resize-none leading-relaxed transition-colors disabled:opacity-50"
            />
            <button
              onClick={() => void handleSend()}
              disabled={!input.trim() || streaming}
              className="text-[10px] font-bold tracking-widest uppercase text-[#C8804A] hover:text-[#A86030] border-b border-[#C8804A]/40 hover:border-[#A86030] pb-0.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 mb-1.5"
            >
              Send →
            </button>
          </div>
          <p className="text-[9px] text-[#C0B8AC] mt-1.5">
            Enter to send · Shift+Enter for new line
          </p>
        </div>

        {/* ── Draft panel (visible when toggled) ── */}
        {showDraft && (
          <div className="border-l border-[#EDE7E0] pl-5">
            <div className="sticky top-4 space-y-4">
              <div className="flex items-baseline justify-between">
                <SectionLabel>Research draft</SectionLabel>
                <span className="text-[9px] text-[#A89E94]">auto-updated by AI</span>
              </div>
              <DraftPanel draft={draft} onUpdate={updateDraft} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
