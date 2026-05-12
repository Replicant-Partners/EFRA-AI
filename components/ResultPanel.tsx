"use client";

import type { PipelineState } from "@/src/shared/types";

// ─── CASCADE Renderer ─────────────────────────────────────────────────────────

const CASCADE_SECTION_DEFS = [
  { re: /\b(CONCLUSION|^C\s*[—:–])/i,          label: "Conclusion",  accent: true  },
  { re: /\b(ACTION|RECOMMENDATION|^A\s*[—:–])/i, label: "Action",    accent: false },
  { re: /\b(SCENARIO|^S\s*[—:–])/i,             label: "Scenarios",   accent: false },
  { re: /\b(CATALYST|UPCOMING|^C2?\s*[—:–])/i,  label: "Catalysts",  accent: false },
  { re: /\b(DATA|EDGAR|SOURCES|^D\s*[—:–])/i,   label: "Data",       accent: false },
];

function parseCascade(raw: string) {
  const text = raw.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  const sections: { label: string; accent: boolean; lines: string[] }[] =
    CASCADE_SECTION_DEFS.map(d => ({ label: d.label, accent: d.accent, lines: [] }));

  let idx = 0;
  let foundHeader = false;

  for (const line of lines) {
    let matched = false;
    for (let i = 0; i < CASCADE_SECTION_DEFS.length; i++) {
      if (CASCADE_SECTION_DEFS[i].re.test(line) && line.length < 80) {
        idx = i; foundHeader = true; matched = true; break;
      }
    }
    if (!matched) sections[idx].lines.push(line);
  }

  if (!foundHeader) sections[0].lines = lines;
  return sections.filter(s => s.lines.length > 0);
}

function CascadeLine({ line }: { line: string }) {
  // Key-value: "Rating: BUY"
  const kv = line.match(/^([A-Z][A-Za-z /]{1,28}):\s*(.+)$/);
  if (kv && kv[1].length < 30) {
    return (
      <div className="flex items-baseline gap-3 py-1 border-b border-[#F0EBE4] last:border-0">
        <span className="text-[9px] font-semibold tracking-[0.12em] text-[#C0B8AC] uppercase w-28 shrink-0">
          {kv[1]}
        </span>
        <span className="text-[11px] text-[#1E1A14] font-medium">{kv[2]}</span>
      </div>
    );
  }
  // Bullet
  const isBullet = /^[•·\-–*▸►]/.test(line) || /^\d+[.)]\s/.test(line);
  const clean = line.replace(/^[•·\-–*▸►]\s*/, "").replace(/^\d+[.)]\s*/, "");
  if (isBullet) {
    return (
      <div className="flex items-start gap-2.5 py-0.5">
        <span className="text-[#C8804A] shrink-0 mt-[3px] text-[10px]">·</span>
        <p className="text-[11px] text-[#6E6258] leading-relaxed">{clean}</p>
      </div>
    );
  }
  return <p className="text-[11px] text-[#6E6258] leading-relaxed py-0.5">{line}</p>;
}

function CascadeRenderer({ content }: { content: string }) {
  const sections = parseCascade(content);
  return (
    <div className="space-y-4">
      {sections.map((sec, i) => (
        <div
          key={i}
          className={`rounded-sm px-4 py-3 ${
            sec.accent
              ? "border border-[#C8804A]/25 bg-[#FDF8F4]"
              : "border border-[#EDE7E0]"
          }`}
        >
          <div className={`text-[9px] font-bold tracking-[0.16em] uppercase mb-2.5 ${
            sec.accent ? "text-[#C8804A]" : "text-[#C0B8AC]"
          }`}>
            {sec.label}
          </div>
          <div>
            {sec.lines.map((line, j) => (
              <CascadeLine key={j} line={line} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Scorecard bar ────────────────────────────────────────────────────────────

function ScoreBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-[3px] bg-[#EDE7E0] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#C8804A] rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-[#8C7E70] w-8 text-right">
        {value}<span className="text-[#D8D0C8]">/{max}</span>
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props { state: PipelineState; }

export default function ResultPanel({ state }: Props) {
  const { status, scout, valuation, communication: comm, forensic, cf } = state;

  if (!comm || !valuation) {
    if (status === "DROPPED" || status === "COMPLIANCE_HALT") {
      return (
        <div className="mt-8">
          <hr className="t-rule mb-6" />
          <p className="prose-tufte text-sm">
            {status === "COMPLIANCE_HALT"
              ? "Pipeline halted — MNPI concern detected. Compliance team notified."
              : "Idea did not pass pipeline gates. See agent steps above for the drop reason."}
          </p>
        </div>
      );
    }
    return null;
  }

  const ratingColor =
    valuation.rating === "BUY"         ? "text-[#C8804A]" :
    valuation.rating === "UNDERPERFORM" ? "text-[#C84848]" :
                                          "text-[#C89040]";

  const bull = cf?.scenarios?.find(s => s.type === "Bull");
  const base = cf?.scenarios?.find(s => s.type === "Base");
  const bear = cf?.scenarios?.find(s => s.type === "Bear");

  return (
    <div className="mt-10 space-y-8">
      <hr className="t-rule" />

      {/* ── 1. VERDICT ───────────────────────────────────────────────────── */}
      <div>
        {/* Output type tag */}
        <div className="t-label mb-3">
          {comm.output_type?.toLowerCase().replace(/_/g, " ")}
        </div>

        {/* Rating + PT — the two numbers a PM sees first */}
        <div className="flex items-end gap-6 mb-4">
          <div>
            <div className="text-[10px] tracking-[0.14em] text-[#C0B8AC] uppercase mb-1">Rating</div>
            <div className={`text-2xl font-bold tracking-widest ${ratingColor}`}>
              {valuation.rating}
            </div>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.14em] text-[#C0B8AC] uppercase mb-1">Price Target 12M</div>
            <div className="text-2xl font-bold text-[#1E1A14]">${valuation.pt_12m}</div>
          </div>
          {valuation.pt_5y && (
            <div>
              <div className="text-[10px] tracking-[0.14em] text-[#C0B8AC] uppercase mb-1">Price Target 5Y</div>
              <div className="text-2xl font-bold text-[#1E1A14]">${valuation.pt_5y}</div>
            </div>
          )}
        </div>

        {/* Quick stats strip */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-[#A89E94]">
          <span>R/R <span className="text-[#6E6258] font-semibold">{valuation.rr_ratio.toFixed(1)}:1</span></span>
          <span>FaVeS <span className="text-[#6E6258] font-semibold">{valuation.faves_score?.total ?? "?"}/9</span></span>
          <span>Confidence <span className="text-[#6E6258] font-semibold">{((comm.audit_trail?.final_confidence ?? 0) * 100).toFixed(0)}%</span></span>
          {valuation.ic_premium != null && (
            <span>IC Premium <span className="text-[#6E6258] font-semibold">+{(valuation.ic_premium * 100).toFixed(0)}%</span></span>
          )}
          <span className="flex items-center gap-1">
            ENTER{" "}
            {(["E","N","T","E","R"] as const).map((letter, i) => {
              const vals = [
                comm.enter_gate.edge,
                comm.enter_gate.new_catalyst,
                comm.enter_gate.timely,
                comm.enter_gate.examples,
                comm.enter_gate.revealing,
              ];
              return (
                <span
                  key={i}
                  className={`font-bold ${vals[i] ? "text-[#C8804A]" : "text-[#D8D0C8]"}`}
                >
                  {letter}
                </span>
              );
            })}
            <span className="text-[#6E6258] font-semibold ml-1">{comm.enter_gate.effective_score}/5</span>
          </span>
        </div>
      </div>

      {/* ── 2. EXECUTIVE SUMMARY (from comm.summary) ─────────────────────── */}
      {comm.summary && (
        <div className="space-y-4">
          <hr className="t-rule" />

          {/* Business */}
          <div>
            <div className="t-label mb-2">Business</div>
            <p className="prose-tufte">{comm.summary.business}</p>
          </div>

          {/* Management */}
          <div>
            <div className="t-label mb-2">Management</div>
            <p className="prose-tufte">{comm.summary.management}</p>
          </div>

          {/* Valuation one-liner — highlighted */}
          <div className="border-l-2 border-[#C8804A] pl-4 py-1">
            <div className="t-label mb-1">Valuation</div>
            <p className="prose-tufte text-[#C8804A]">{comm.summary.valuation}</p>
          </div>
        </div>
      )}

      {/* ── 3. SCENARIOS ─────────────────────────────────────────────────── */}
      {bull && base && bear && (
        <>
          <hr className="t-rule" />
          <div>
            <div className="t-label mb-3">Scenarios</div>
            <div className="grid grid-cols-3 gap-3">
              {[bull, base, bear].map(s => {
                const isBull = s.type === "Bull";
                const isBear = s.type === "Bear";
                return (
                  <div
                    key={s.type}
                    className={`rounded-sm border px-3 py-3 ${
                      isBull ? "border-[#7A9E6A]/30 bg-[#F6FAF4]" :
                      isBear ? "border-[#C84848]/30 bg-[#FDF5F5]" :
                               "border-[#C8804A]/30 bg-[#FDF8F4]"
                    }`}
                  >
                    <div className={`text-[9px] font-bold tracking-[0.16em] uppercase mb-2 ${
                      isBull ? "text-[#7A9E6A]" : isBear ? "text-[#C84848]" : "text-[#C8804A]"
                    }`}>
                      {s.type} · {(s.probability * 100).toFixed(0)}%
                    </div>
                    <div className={`text-xl font-bold mb-1.5 ${
                      isBull ? "text-[#7A9E6A]" : isBear ? "text-[#C84848]" : "text-[#1E1A14]"
                    }`}>
                      ${s.implied_pt}
                    </div>
                    {s.price_derivation && (
                      <div className="text-[10px] font-mono text-[#A89E94] mb-1.5">
                        {s.price_derivation}
                      </div>
                    )}
                    {s.triggers && (
                      <p className="text-[10px] text-[#8C7E70] leading-relaxed">{s.triggers}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── 4. RESEARCH NOTE (CASCADE) ───────────────────────────────────── */}
      {comm.content && (
        <>
          <hr className="t-rule" />
          <div>
            <div className="t-label mb-3">Research Note</div>
            <CascadeRenderer content={comm.content} />
          </div>
        </>
      )}

      {/* ── 5. SCORECARD ─────────────────────────────────────────────────── */}
      <hr className="t-rule" />
      <div>
        <div className="t-label mb-4">Scorecard</div>
        <div className="space-y-3">

          {/* Alpha score */}
          {scout?.alpha_score && (
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              {[
                ["Coverage gap",    scout.alpha_score.coverage_gap_score, 25],
                ["Market cap fit",  scout.alpha_score.market_cap_fit,     20],
                ["Sector relevance",scout.alpha_score.sector_relevance,   25],
                ["Valuation anomaly",scout.alpha_score.valuation_anomaly, 30],
              ].map(([label, value, max]) => (
                <div key={label as string}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] text-[#A89E94]">{label as string}</span>
                  </div>
                  <ScoreBar value={value as number} max={max as number} />
                </div>
              ))}
            </div>
          )}

          {/* Forensic flags */}
          {forensic && (forensic.flags ?? []).length > 0 && (
            <div className="mt-4">
              <div className="text-[9px] font-semibold tracking-[0.12em] text-[#C0B8AC] uppercase mb-2">
                Forensic Flags · EPS haircut {(forensic.eps_haircut_total ?? 0).toFixed(0)}%
              </div>
              <div className="space-y-1">
                {(forensic.flags ?? []).map((f, i) => (
                  <div key={i} className="flex items-baseline gap-3 text-[11px]">
                    <span className={`font-mono w-6 shrink-0 ${
                      f.severity >= 4 ? "text-[#C84848]" :
                      f.severity === 3 ? "text-[#C89040]" : "text-[#A89E94]"
                    }`}>
                      S{f.severity}
                    </span>
                    <span className="text-[#6E6258] flex-1">{f.description}</span>
                    {f.eps_haircut_pct > 0 && (
                      <span className="text-[#A89E94] shrink-0">
                        −{(f.eps_haircut_pct * 100).toFixed(0)}% eps
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fallbacks */}
          {(comm.audit_trail?.fallback_flags ?? []).length > 0 && (
            <div className="text-[11px] text-[#C89040] mt-2">
              Fallbacks: {(comm.audit_trail?.fallback_flags ?? []).join(" · ")}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
