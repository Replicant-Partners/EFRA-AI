"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ResearchDraftPatch, ResearchSource, CompanyBoard } from "@/src/shared/types";
import { SECTIONS } from "@/src/agents/research-chat/index";
import type { SectionKey } from "@/src/agents/research-chat/index";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode   = "valentine" | "gunn" | "dual";
type Status = "idle" | "running" | "done" | "error";

interface SectionState {
  key:       SectionKey;
  status:    Status;
  content:   string;
  question:  string;
  sources:   ResearchSource[];
  userNote:  string;
  submitted: boolean;
}

interface CompanyState {
  status:  Status;
  logs:    string[];
  result:  CompanyBoard | null;
  sources: ResearchSource[];
  error:   string;
}

const STORAGE_KEY = "efrain_research_v4";
const PREFILL_KEY = "efrain_research_prefill";

const MODE_INFO: Record<Mode, { label: string; desc: string }> = {
  valentine: { label: "Valentine", desc: "12M catalyst" },
  gunn:      { label: "Gunn",      desc: "5Y compounder" },
  dual:      { label: "Dual",      desc: "12M + 5Y" },
};

// Sections after the COMPANY analysis (moat already covered by COMPANY)
const POST_COMPANY_SECTIONS = SECTIONS.filter(s =>
  s.key !== "business" && s.key !== "moat",
);

function initSections(): SectionState[] {
  return SECTIONS.map(s => ({
    key: s.key, status: "idle", content: "", question: "",
    sources: [], userNote: "", submitted: false,
  }));
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-semibold tracking-[0.14em] text-[#C0B8AC] uppercase block mb-1.5">
      {children}
    </span>
  );
}

function Rule() { return <hr className="border-t border-[#EDE7E0]" />; }

function Pill({ value, green, red }: { value: string; green?: string[]; red?: string[] }) {
  const isGreen = green?.includes(value);
  const isRed   = red?.includes(value);
  const color   = isGreen ? "text-[#7A9E6A]" : isRed ? "text-[#C84848]" : "text-[#C8804A]";
  return (
    <span className={`text-[9px] font-bold tracking-wider uppercase ${color}`}>{value}</span>
  );
}

function SourceBadge({ source }: { source: ResearchSource }) {
  const colors: Record<ResearchSource["type"], string> = {
    sec_filing: "text-[#7A9E6A] border-[#7A9E6A]/40",
    ir_page:    "text-[#C8804A] border-[#C8804A]/40",
    news:       "text-[#A89E94] border-[#A89E94]/40",
    regulatory: "text-[#6E6258] border-[#6E6258]/40",
    other:      "text-[#C0B8AC] border-[#C0B8AC]/40",
  };
  const labels: Record<ResearchSource["type"], string> = {
    sec_filing: "SEC", ir_page: "IR", news: "News", regulatory: "Reg", other: "Web",
  };
  return (
    <a href={source.url} target="_blank" rel="noopener noreferrer"
       title={source.snippet ?? source.title}
       className={`inline-flex items-center gap-1 px-1.5 py-0.5 border rounded text-[9px] font-semibold ${colors[source.type]} hover:opacity-70 transition-opacity`}>
      {labels[source.type]}
      <span className="opacity-50 max-w-[100px] truncate text-[8px]">{source.title}</span>
    </a>
  );
}

// ─── COMPANY result display ───────────────────────────────────────────────────

function CompanyResultPanel({ board, sources }: { board: CompanyBoard; sources: ResearchSource[] }) {
  const [open, setOpen] = useState<string | null>("franchise");

  const Section = ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) => (
    <div className="border-b border-[#EDE7E0] last:border-0">
      <button onClick={() => setOpen(o => o === id ? null : id)}
              className="w-full flex items-center justify-between py-2.5 text-left">
        <span className="text-[10px] font-bold tracking-[0.12em] text-[#6E6258] uppercase">{label}</span>
        <span className="text-[#C0B8AC] text-[9px]">{open === id ? "▲" : "▼"}</span>
      </button>
      {open === id && <div className="pb-4 space-y-4">{children}</div>}
    </div>
  );

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <Label>{label}</Label>
      <div className="text-[12px] text-[#1E1A14] leading-relaxed">{children}</div>
    </div>
  );

  const List = ({ items }: { items: string[] }) => (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-[12px] text-[#6E6258]">
          <span className="text-[#C0B8AC] flex-shrink-0 mt-0.5">·</span>{item}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-4">

      {/* Sources */}
      {sources.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {sources.map((s, i) => <SourceBadge key={i} source={s} />)}
        </div>
      )}

      {/* Elevator pitch — always visible */}
      <div className="bg-[#F5F0EB] border border-[#EDE7E0] rounded p-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Pill value={board.gorilla_elevator.is_gorilla_candidate ? "GORILLA CANDIDATE" : "NOT A GORILLA"}
                green={["GORILLA CANDIDATE"]} red={["NOT A GORILLA"]} />
          <span className="text-[#D8D0C8]">·</span>
          <Pill value={board.thesis_statement.thesis_quality.replace("_", " ")}
                green={["investment grade"]} red={["incomplete"]} />
          <span className="text-[#D8D0C8]">·</span>
          <Pill value={board.turd_blossom.is_turd_blossom ? "TURD BLOSSOM" : "QUALITY COMPOUNDER"}
                green={["TURD BLOSSOM"]} />
          <span className="text-[#D8D0C8]">·</span>
          <span className="text-[9px] text-[#A89E94] uppercase tracking-wider">
            moat: {board.franchise.moat_depth} · {board.franchise.moat_source} · {board.franchise.moat_durability} durability
          </span>
        </div>
        <p className="text-[13px] text-[#1E1A14] font-medium leading-relaxed italic">
          &ldquo;{board.gorilla_elevator.elevator_pitch}&rdquo;
        </p>
      </div>

      {/* Thesis */}
      <div className="space-y-2">
        <Label>Investment Thesis</Label>
        <p className="text-[12px] text-[#1E1A14] leading-relaxed whitespace-pre-wrap">
          {board.thesis_statement.thesis}
        </p>
        <p className="text-[11px] text-[#A89E94] italic">{board.thesis_statement.three_year_test}</p>
      </div>

      <Rule />

      {/* Accordion sections */}
      <div className="space-y-0">

        <Section id="franchise" label="Business Franchise">
          <Field label="Executive summary">{board.franchise.executive_summary}</Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Business model">
              <Pill value={board.franchise.business_model_type} />{" "}
              <span className="text-[#6E6258]">— {board.franchise.business_model_logic}</span>
            </Field>
            <Field label="Moat">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Pill value={board.franchise.moat_depth}
                      green={["wide"]} red={["none"]} />
                <span className="text-[#D8D0C8]">·</span>
                <span className="text-[9px] text-[#A89E94] uppercase tracking-wider">{board.franchise.moat_source}</span>
                <span className="text-[#D8D0C8]">·</span>
                <span className="text-[9px] text-[#A89E94]">durability: {board.franchise.moat_durability}</span>
              </div>
              <p className="text-[11px] text-[#C8804A] italic mb-1">{board.franchise.value_creation_mechanism}</p>
              <p className="text-[11px] text-[#6E6258]">{board.franchise.moat_evidence}</p>
            </Field>
          </div>
          <Field label="Identity">{board.franchise.identity}</Field>
          <Field label="Geography">{board.franchise.geography}</Field>
          <Field label="Competitive position">{board.franchise.competitive_position}</Field>
          <Field label="Customers & channels">{board.franchise.customers_channels}</Field>
          <Field label="Growth history">{board.franchise.growth_history}</Field>
          <Field label="Catalyst assessment">{board.franchise.catalyst_assessment}</Field>
        </Section>

        <Section id="self_view" label="How They See Themselves">
          <Field label="Self-description">{board.self_view.how_they_describe_themselves}</Field>
          <Field label="Stated strategy">{board.self_view.stated_strategy}</Field>
          <Field label="Metrics management highlights">{board.self_view.key_metrics_management_uses}</Field>
          {board.self_view.red_flags_in_language && (
            <Field label="Language red flags">
              <span className="text-[#C84848]">{board.self_view.red_flags_in_language}</span>
            </Field>
          )}
        </Section>

        <Section id="owner_op" label="Owner Operator">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Founder involvement">{board.owner_operator.founder_involvement}</Field>
            <Field label="Insider ownership">{board.owner_operator.insider_ownership_pct}</Field>
            <Field label="Agency risk">
              <Pill value={board.owner_operator.agency_risk}
                    green={["low"]} red={["high"]} />
            </Field>
          </div>
          <Field label="Incentive alignment">{board.owner_operator.incentive_alignment}</Field>
          <Field label="Key decisions">{board.owner_operator.key_decisions_assessment}</Field>
          <Field label="Imagine running it">
            <span className="text-[#C8804A]">{board.owner_operator.imagine_running_it}</span>
          </Field>
        </Section>

        <Section id="invisible" label="What Isn't There Yet">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Not on the page</Label>
              <List items={board.invisible_layer.not_on_the_page} />
            </div>
            <div>
              <Label>Not in the price</Label>
              <List items={board.invisible_layer.not_in_the_price} />
            </div>
          </div>
          <Field label="Market's wrong assumption">
            <span className="text-[#C8804A]">{board.invisible_layer.market_wrong_assumption}</span>
          </Field>
          <div>
            <Label>Analyst blind spots</Label>
            <List items={board.invisible_layer.analyst_blind_spots} />
          </div>
        </Section>

        <Section id="turd" label="Turd Blossom">
          {board.turd_blossom.is_turd_blossom ? (
            <div className="space-y-3">
              <Field label="Current reputation">
                <span className="text-[#C84848]">{board.turd_blossom.current_reputation}</span>
              </Field>
              <div>
                <Label>Early shoots</Label>
                <List items={board.turd_blossom.early_shoots} />
              </div>
              <Field label="Blossom thesis">{board.turd_blossom.blossom_thesis}</Field>
              <Field label="Timeline">{board.turd_blossom.blossom_timeline}</Field>
            </div>
          ) : (
            <p className="text-[12px] text-[#A89E94]">
              Quality compounder — market appreciates this business. {board.turd_blossom.current_reputation}
            </p>
          )}
        </Section>

        <Section id="gorilla" label="Value Gorilla">
          <Field label="Economic opportunity">{board.gorilla_elevator.economic_opportunity}</Field>
          <Field label="Exploitation method">{board.gorilla_elevator.exploitation_method}</Field>
          <Field label="Why likely to succeed">{board.gorilla_elevator.why_likely_to_succeed}</Field>
          <Field label="Why market doubts it">
            <span className="text-[#C8804A]">{board.gorilla_elevator.why_market_doubts_it}</span>
          </Field>
        </Section>

        <Section id="risks" label="Key Risks & Open Questions">
          <div>
            <Label>Durable risks</Label>
            <List items={board.thesis_statement.key_risks} />
          </div>
          <div>
            <Label>Open questions for analyst</Label>
            <ul className="space-y-1">
              {board.analyst_questions.map((q, i) => (
                <li key={i} className="flex gap-2 text-[12px] text-[#C8804A] italic">
                  <span className="flex-shrink-0">→</span>{q}
                </li>
              ))}
            </ul>
          </div>
        </Section>

      </div>

      {/* Business memo */}
      <Rule />
      <div>
        <Label>Business Memo</Label>
        <p className="text-[12px] text-[#6E6258] leading-relaxed whitespace-pre-wrap">
          {board.business_memo}
        </p>
      </div>
    </div>
  );
}

// ─── Section card (for post-COMPANY sections) ─────────────────────────────────

function SectionCard({
  section, sectionMeta, isActive, onContinue, onNoteChange,
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

  const prose = section.content
    .split("\n").filter(l => !l.trim().startsWith("→")).join("\n").trim();

  if (section.status === "idle" && !isActive) {
    return (
      <div className="flex items-center gap-4 py-3 opacity-30">
        <span className="text-[10px] font-mono text-[#C0B8AC] w-5">{sectionMeta.icon}</span>
        <span className="text-[11px] font-semibold tracking-wider text-[#6E6258] uppercase">{sectionMeta.label}</span>
      </div>
    );
  }

  return (
    <div className={section.submitted ? "opacity-70" : ""}>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[10px] font-mono text-[#C8804A] w-5">{sectionMeta.icon}</span>
        <span className="text-[11px] font-bold tracking-[0.12em] text-[#1E1A14] uppercase">{sectionMeta.label}</span>
        {section.status === "running" && (
          <span className="text-[9px] text-[#C8804A] animate-pulse">analyzing…</span>
        )}
        {section.submitted && (
          <span className="text-[9px] text-[#7A9E6A] ml-auto">✓ done</span>
        )}
      </div>

      <div className="pl-8 space-y-3">
        {section.status === "running" && !prose && (
          <div className="space-y-1.5">
            {[1,2,3].map(i => (
              <div key={i} className={`h-2.5 bg-[#EDE7E0] rounded animate-pulse ${i===2?"w-4/5":i===3?"w-3/5":"w-full"}`} />
            ))}
          </div>
        )}

        {prose && (
          <div className="text-sm text-[#1E1A14] leading-relaxed whitespace-pre-wrap">
            {prose}
            {section.status === "running" && (
              <span className="inline-block w-[5px] h-[13px] bg-[#C8804A] animate-pulse ml-0.5 rounded-sm align-middle" />
            )}
          </div>
        )}

        {section.status === "error" && (
          <p className="text-[11px] text-[#C84848]">{section.content}</p>
        )}

        {section.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {section.sources.map((s, i) => <SourceBadge key={i} source={s} />)}
          </div>
        )}

        {section.status === "done" && !section.submitted && (
          <div className="border-l-2 border-[#C8804A]/40 pl-4 space-y-3 pt-1">
            {section.question && (
              <p className="text-[12px] text-[#C8804A] italic leading-relaxed">{section.question}</p>
            )}
            <textarea
              ref={textareaRef}
              value={section.userNote}
              onChange={e => onNoteChange(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onContinue(); } }}
              placeholder="Add context, corrections, or additional data… (optional)"
              rows={2}
              className="w-full bg-transparent border-b border-[#D8D0C8] pb-1 text-sm text-[#1E1A14] placeholder-[#C0B8AC] focus:outline-none focus:border-[#C8804A] resize-none leading-relaxed transition-colors"
            />
            <div className="flex items-center gap-4">
              <button onClick={onContinue}
                      className="text-[10px] font-bold tracking-widest uppercase text-[#C8804A] hover:text-[#A86030] border-b border-[#C8804A]/40 hover:border-[#A86030] pb-0.5 transition-colors">
                Continue →
              </button>
              <span className="text-[9px] text-[#C0B8AC]">⌘↵ to continue</span>
            </div>
          </div>
        )}

        {section.submitted && section.userNote.trim() && (
          <div className="border-l-2 border-[#EDE7E0] pl-4">
            <p className="text-[11px] text-[#A89E94] italic">{section.userNote}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResearchPage() {
  const router = useRouter();

  const [ticker,    setTicker]    = useState("");
  const [mode,      setMode]      = useState<Mode>("valentine");
  const [started,   setStarted]   = useState(false);

  // Phase 1: COMPANY agent
  const [company,   setCompany]   = useState<CompanyState>({
    status: "idle", logs: [], result: null, sources: [], error: "",
  });
  const [companyNote, setCompanyNote] = useState("");
  const [companyDone, setCompanyDone] = useState(false);

  // Phase 2: remaining sections
  const [sections,  setSections]  = useState<SectionState[]>(initSections());
  const [activeIdx, setActiveIdx] = useState(0);
  const [allDone,   setAllDone]   = useState(false);

  const [draft,     setDraft]     = useState<ResearchDraftPatch>({});

  const draftRef    = useRef<ResearchDraftPatch>({});
  const sectionsRef = useRef<SectionState[]>(sections);
  const logsEndRef  = useRef<HTMLDivElement>(null);

  draftRef.current    = draft;
  sectionsRef.current = sections;

  // ── Persistence ─────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const s = JSON.parse(saved) as {
        ticker: string; mode: Mode; draft: ResearchDraftPatch;
        company: CompanyState; companyDone: boolean; companyNote: string;
        sections: SectionState[]; activeIdx: number; allDone: boolean;
      };
      if (!s.ticker) return;
      setTicker(s.ticker); setMode(s.mode ?? "valentine");
      setDraft(s.draft ?? {}); setCompany(s.company);
      setCompanyDone(s.companyDone ?? false); setCompanyNote(s.companyNote ?? "");
      setSections(s.sections); setActiveIdx(s.activeIdx ?? 0);
      setAllDone(s.allDone ?? false); setStarted(true);
    } catch { /* ignore */ }
  }, []);

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ticker, mode, draft: draftRef.current, company,
        companyDone, companyNote, sections: sectionsRef.current,
        activeIdx, allDone,
      }));
    } catch { /* ignore */ }
  }

  // ── Scroll logs to bottom ───────────────────────────────────────────────────
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [company.logs]);

  // ── Update draft from company result ───────────────────────────────────────
  const updateDraft = useCallback((patch: Partial<ResearchDraftPatch>) => {
    setDraft(prev => {
      const next = { ...prev, ...patch };
      draftRef.current = next;
      return next;
    });
  }, []);

  // ── Run COMPANY agent ───────────────────────────────────────────────────────
  async function runCompanyAgent(analystNote?: string) {
    setCompany({ status: "running", logs: [], result: null, sources: [], error: "" });

    try {
      const res = await fetch("/api/research/company", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          ticker:       ticker.toUpperCase().trim(),
          analyst_note: analystNote?.trim() || undefined,
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
            type: string; msg?: string; sources?: ResearchSource[];
            result?: CompanyBoard; error?: string;
          };

          if (msg.type === "log" && msg.msg) {
            setCompany(prev => ({ ...prev, logs: [...prev.logs, msg.msg!] }));
          } else if (msg.type === "sources" && msg.sources) {
            setCompany(prev => ({ ...prev, sources: msg.sources! }));
          } else if (msg.type === "done" && msg.result) {
            const board = msg.result;
            setCompany(prev => ({ ...prev, status: "done", result: board }));
            // Seed draft from COMPANY result
            updateDraft({
              ticker:              ticker.toUpperCase().trim(),
              mode,
              business_summary:    board.franchise.executive_summary,
              moat_type:           `${board.franchise.moat_depth} · ${board.franchise.moat_source}`,
              moat_evidence:       `${board.franchise.value_creation_mechanism}\n\n${board.franchise.moat_evidence}`,
              economic_domain:     board.franchise.business_model_type,
              geographic_exposure: board.franchise.geography,
              management_notes:    board.owner_operator.key_decisions_assessment,
              main_thesis:         board.thesis_statement.thesis,
            });
            setCompanyDone(true);
          } else if (msg.type === "error") {
            setCompany(prev => ({ ...prev, status: "error", error: msg.error ?? "Unknown error" }));
          }
        }
      }
    } catch (err) {
      setCompany(prev => ({ ...prev, status: "error", error: String(err) }));
    }
  }

  // ── Run a post-COMPANY section ──────────────────────────────────────────────
  async function runSection(idx: number, userNote?: string) {
    const sectionKey = POST_COMPANY_SECTIONS[idx].key;

    setSections(prev => {
      const next: SectionState[] = prev.map(s =>
        s.key === sectionKey
          ? { ...s, status: "running" as Status, content: "", question: "", sources: [], submitted: false }
          : s,
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
              const next: SectionState[] = prev.map(s =>
                s.key === sectionKey ? { ...s, content: s.content + msg.token! } : s,
              );
              sectionsRef.current = next; return next;
            });
          } else if (msg.type === "sources" && msg.sources) {
            setSections(prev => {
              const next: SectionState[] = prev.map(s =>
                s.key === sectionKey ? { ...s, sources: msg.sources! } : s,
              );
              sectionsRef.current = next; return next;
            });
          } else if (msg.type === "patch" && msg.patch) {
            updateDraft(msg.patch);
          } else if (msg.type === "question" && msg.question) {
            setSections(prev => {
              const next: SectionState[] = prev.map(s =>
                s.key === sectionKey ? { ...s, question: msg.question! } : s,
              );
              sectionsRef.current = next; return next;
            });
          } else if (msg.type === "done") {
            setSections(prev => {
              const next: SectionState[] = prev.map(s =>
                s.key === sectionKey ? { ...s, status: "done" as Status } : s,
              );
              sectionsRef.current = next; return next;
            });
          } else if (msg.type === "error") {
            setSections(prev => {
              const next: SectionState[] = prev.map(s =>
                s.key === sectionKey ? { ...s, status: "error" as Status, content: msg.error ?? "Unknown error" } : s,
              );
              sectionsRef.current = next; return next;
            });
          }
        }
      }
    } catch (err) {
      setSections(prev => {
        const next: SectionState[] = prev.map(s =>
          s.key === POST_COMPANY_SECTIONS[idx].key
            ? { ...s, status: "error" as Status, content: String(err) }
            : s,
        );
        sectionsRef.current = next; return next;
      });
    }
  }

  // ── Start ───────────────────────────────────────────────────────────────────
  async function handleStart() {
    if (!ticker.trim()) return;
    const t = ticker.toUpperCase().trim();
    setTicker(t);
    setStarted(true);
    setSections(initSections());
    setDraft({ ticker: t, mode });
    setCompanyDone(false);
    setAllDone(false);
    setActiveIdx(0);
    await runCompanyAgent();
  }

  // ── Continue from COMPANY to sections ──────────────────────────────────────
  async function handleCompanyContinue() {
    if (companyNote.trim()) {
      await runCompanyAgent(companyNote);
    }
    setActiveIdx(0);
    await runSection(0);
  }

  // ── Continue between sections ───────────────────────────────────────────────
  async function handleSectionContinue(idx: number) {
    const note    = sectionsRef.current.find(s => s.key === POST_COMPANY_SECTIONS[idx].key)?.userNote ?? "";
    const nextIdx = idx + 1;

    setSections(prev => {
      const next: SectionState[] = prev.map(s =>
        s.key === POST_COMPANY_SECTIONS[idx].key ? { ...s, submitted: true } : s,
      );
      sectionsRef.current = next; return next;
    });

    if (note.trim()) {
      await runSection(idx, note);
      setSections(prev => {
        const next: SectionState[] = prev.map(s =>
          s.key === POST_COMPANY_SECTIONS[idx].key ? { ...s, submitted: true } : s,
        );
        sectionsRef.current = next; return next;
      });
    }

    if (nextIdx < POST_COMPANY_SECTIONS.length) {
      setActiveIdx(nextIdx);
      await runSection(nextIdx);
    } else {
      setAllDone(true);
    }
    persist();
  }

  // ── Launch pipeline ─────────────────────────────────────────────────────────
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

    try {
      localStorage.setItem(PREFILL_KEY, JSON.stringify({
        ticker:     (d.ticker ?? ticker).toUpperCase().trim(),
        analyst_id: "analyst_001",
        mode:       d.mode ?? mode,
        catalyst:   builtCatalyst || d.catalyst?.trim() || "",
        news:       (d.news_items ?? []).map(n => n.headline).filter(Boolean),
      }));
    } catch { /* ignore */ }
    router.push("/");
  }

  function handleReset() {
    if (!confirm("Start over?")) return;
    setStarted(false); setSections(initSections()); setDraft({});
    setTicker(""); setMode("valentine"); setActiveIdx(0);
    setAllDone(false); setCompanyDone(false); setCompanyNote("");
    setCompany({ status: "idle", logs: [], result: null, sources: [], error: "" });
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  const canLaunch = companyDone && (
    (draft.main_thesis ?? "").length > 10 || (draft.catalyst ?? "").length > 10
  );

  const currentlyRunning =
    company.status === "running" ||
    sections.some(s => s.status === "running");

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────────

  if (!started) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-lg font-bold text-[#C8804A] tracking-widest uppercase">Research</h1>
          <p className="t-label mt-1">AI-guided investment thesis builder</p>
        </div>
        <p className="text-sm text-[#6E6258] leading-relaxed max-w-lg">
          Enter a ticker. The AI runs a deep company analysis — Self-View, Business Franchise,
          Owner Operator, Invisible Layer, Turd Blossom, Value Gorilla, and Investment Thesis —
          pulling live SEC EDGAR data. After each section you can add context or corrections.
        </p>
        <Rule />
        <div className="space-y-6 max-w-xs">
          <div>
            <Label>Ticker</Label>
            <input type="text" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())}
                   onKeyDown={e => e.key === "Enter" && void handleStart()}
                   placeholder="NVDA" autoFocus
                   className="w-full bg-transparent border-b border-[#D8D0C8] pb-1 text-2xl font-bold text-[#C8804A] uppercase tracking-widest placeholder-[#D8D0C8] focus:outline-none focus:border-[#C8804A] transition-colors" />
          </div>
          <div>
            <Label>Mode</Label>
            <div className="flex gap-6 mt-1">
              {(Object.keys(MODE_INFO) as Mode[]).map(m => (
                <button key={m} onClick={() => setMode(m)}
                        className={`text-left transition-colors ${mode === m ? "text-[#C8804A]" : "text-[#C0B8AC] hover:text-[#8C7E70]"}`}>
                  <div className="text-sm font-bold">{MODE_INFO[m].label}</div>
                  <div className="t-label">{MODE_INFO[m].desc}</div>
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => void handleStart()} disabled={!ticker.trim()}
                  className="text-xs font-bold tracking-widest uppercase text-[#C8804A] hover:text-[#A86030] border-b border-[#C8804A]/40 pb-0.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            Build Thesis →
          </button>
        </div>
      </div>
    );
  }

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
            <button onClick={handleLaunch}
                    className="text-[10px] font-bold tracking-widest uppercase text-[#C8804A] hover:text-[#A86030] border-b border-[#C8804A]/40 pb-0.5 transition-colors">
              Launch Pipeline →
            </button>
          )}
          <button onClick={handleReset} className="text-[10px] text-[#C0B8AC] hover:text-[#C84848] transition-colors">
            New
          </button>
        </div>
      </div>

      <Rule />

      <div className="mt-6 space-y-8 pb-16">

        {/* ── Phase 1: COMPANY analysis ── */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-mono text-[#C8804A] w-5">00</span>
            <span className="text-[11px] font-bold tracking-[0.12em] text-[#1E1A14] uppercase">Company Analysis</span>
            {company.status === "running" && (
              <span className="text-[9px] text-[#C8804A] animate-pulse">analyzing…</span>
            )}
            {companyDone && (
              <span className="text-[9px] text-[#7A9E6A] ml-auto">✓ done</span>
            )}
          </div>

          {/* Logs */}
          {(company.status === "running" || (company.status === "done" && company.logs.length > 0)) && (
            <div className="pl-8 mb-4">
              <div className="bg-[#F5F0EB] rounded border border-[#EDE7E0] p-3 space-y-0.5 max-h-40 overflow-y-auto font-mono">
                {company.logs.map((line, i) => (
                  <p key={i} className="text-[10px] text-[#6E6258] leading-relaxed">{line}</p>
                ))}
                {company.status === "running" && (
                  <p className="text-[10px] text-[#C8804A] animate-pulse">▌</p>
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}

          {/* Error */}
          {company.status === "error" && (
            <div className="pl-8 space-y-2">
              <p className="text-[11px] text-[#C84848]">{company.error}</p>
              <button onClick={() => void runCompanyAgent()}
                      className="text-[10px] font-bold tracking-widest uppercase text-[#C8804A] hover:text-[#A86030] border-b border-[#C8804A]/40 pb-0.5 transition-colors">
                ↺ Retry
              </button>
            </div>
          )}

          {/* Result */}
          {company.status === "done" && company.result && (
            <div className="pl-8 space-y-5">
              <CompanyResultPanel board={company.result} sources={company.sources} />

              {/* Analyst checkpoint */}
              {!companyDone || activeIdx === 0 ? (
                <div className="border-l-2 border-[#C8804A]/40 pl-4 space-y-3">
                  <p className="text-[12px] text-[#C8804A] italic">
                    Anything to add, correct, or clarify before we continue to scenarios and catalyst?
                  </p>
                  <textarea value={companyNote} onChange={e => setCompanyNote(e.target.value)}
                            placeholder="Add context or corrections… (optional)"
                            rows={2}
                            className="w-full bg-transparent border-b border-[#D8D0C8] pb-1 text-sm text-[#1E1A14] placeholder-[#C0B8AC] focus:outline-none focus:border-[#C8804A] resize-none leading-relaxed transition-colors" />
                  <button onClick={() => void handleCompanyContinue()}
                          className="text-[10px] font-bold tracking-widest uppercase text-[#C8804A] hover:text-[#A86030] border-b border-[#C8804A]/40 pb-0.5 transition-colors">
                    Continue to Scenarios →
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* ── Phase 2: post-COMPANY sections ── */}
        {companyDone && POST_COMPANY_SECTIONS.map((meta, idx) => {
          const section  = sections.find(s => s.key === meta.key)!;
          const isActive = idx === activeIdx;
          return (
            <div key={meta.key}>
              <Rule />
              <div className="mt-6">
                <SectionCard
                  section={section}
                  sectionMeta={meta}
                  isActive={isActive}
                  onContinue={() => void handleSectionContinue(idx)}
                  onNoteChange={v =>
                    setSections(prev =>
                      prev.map(s => s.key === meta.key ? { ...s, userNote: v } : s),
                    )
                  }
                />
              </div>
            </div>
          );
        })}

        {/* ── All done ── */}
        {allDone && (
          <div className="space-y-4 pt-2">
            <Rule />
            <p className="text-sm text-[#6E6258]">Thesis complete. Ready for the pipeline.</p>
            <button onClick={handleLaunch}
                    className="text-xs font-bold tracking-widest uppercase text-[#C8804A] hover:text-[#A86030] border-b border-[#C8804A]/40 pb-0.5 transition-colors">
              Launch Pipeline → {ticker}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
