"use client";

import type { PipelineState } from "@/src/shared/types";

// ─── CASCADE Renderer ─────────────────────────────────────────────────────────
// Parses the raw CASCADE text (C/A/S/C/D sections) into structured readable blocks.

const CASCADE_SECTIONS = [
  { key: "C", label: "Conclusion",  color: "text-[#C8804A]", border: "border-[#C8804A]/30", bg: "bg-[#FDF8F4]" },
  { key: "A", label: "Action",      color: "text-[#1E1A14]", border: "border-[#E4DDD6]",    bg: "" },
  { key: "S", label: "Scenarios",   color: "text-[#1E1A14]", border: "border-[#E4DDD6]",    bg: "" },
  { key: "C2","label": "Catalysts", color: "text-[#1E1A14]", border: "border-[#E4DDD6]",    bg: "" },
  { key: "D", label: "Data",        color: "text-[#1E1A14]", border: "border-[#E4DDD6]",    bg: "" },
];

function parseCascade(raw: string): { label: string; color: string; border: string; bg: string; lines: string[] }[] {
  // Normalize line endings and split
  const text = raw.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  // Try to detect CASCADE section headers: lines that are or contain
  // CONCLUSION, ACTION, SCENARIOS, CATALYSTS, DATA (case-insensitive)
  const sectionPatterns = [
    { re: /\b(CONCLUSION|^C\s*—|^C\s*:)/i,  idx: 0 },
    { re: /\b(ACTION|^A\s*—|^A\s*:)/i,       idx: 1 },
    { re: /\b(SCENARIO|^S\s*—|^S\s*:)/i,     idx: 2 },
    { re: /\b(CATALYST|^C2?\s*—|UPCOMING)/i, idx: 3 },
    { re: /\b(DATA|EDGAR|^D\s*—|^D\s*:)/i,  idx: 4 },
  ];

  // Build sections by scanning lines
  const sections: { label: string; color: string; border: string; bg: string; lines: string[] }[] = CASCADE_SECTIONS.map(s => ({
    label: s.label, color: s.color, border: s.border, bg: s.bg, lines: [],
  }));

  let currentIdx = 0; // default: dump everything into Conclusion until a header is found
  let foundAnyHeader = false;

  for (const line of lines) {
    let matched = false;
    for (const { re, idx } of sectionPatterns) {
      if (re.test(line) && line.length < 80) {
        currentIdx = idx;
        foundAnyHeader = true;
        matched = true;
        break;
      }
    }
    if (!matched) {
      sections[currentIdx].lines.push(line);
    }
  }

  // If no headers were found at all, put everything in one block
  if (!foundAnyHeader) {
    sections[0].lines = lines;
  }

  return sections.filter(s => s.lines.length > 0);
}

function CascadeRenderer({ content }: { content: string }) {
  const sections = parseCascade(content);

  return (
    <div className="space-y-3">
      {sections.map((sec, i) => (
        <div key={i} className={`border rounded-sm ${sec.border} ${sec.bg} px-4 py-3`}>
          {/* Section label */}
          <div className={`text-[9px] font-bold tracking-[0.15em] uppercase mb-2 ${sec.color}`}>
            {sec.label}
          </div>
          {/* Content lines — bullet-aware */}
          <div className="space-y-1.5">
            {sec.lines.map((line, j) => {
              // Detect bullet-like lines
              const isBullet = /^[•·\-–*▸►]/.test(line) || /^\d+[\.\)]/.test(line);
              const cleanLine = line.replace(/^[•·\-–*▸►]\s*/, "").replace(/^\d+[\.\)]\s*/, "");

              // Detect key-value lines like "Rating: BUY" or "PT: $148"
              const kvMatch = line.match(/^([A-Z][A-Za-z\s\/]{1,30}):\s*(.+)$/);

              if (kvMatch && kvMatch[1].length < 30) {
                return (
                  <div key={j} className="flex items-baseline gap-2 text-xs">
                    <span className="t-label shrink-0 w-28">{kvMatch[1]}</span>
                    <span className="text-[#1E1A14] font-medium">{kvMatch[2]}</span>
                  </div>
                );
              }

              if (isBullet) {
                return (
                  <div key={j} className="flex items-start gap-2 text-xs">
                    <span className="text-[#C8804A] shrink-0 mt-px">·</span>
                    <span className="text-[#6E6258] leading-relaxed">{cleanLine}</span>
                  </div>
                );
              }

              // Plain paragraph line
              return (
                <p key={j} className="text-xs text-[#6E6258] leading-relaxed">
                  {line}
                </p>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  state: PipelineState;
}

export default function ResultPanel({ state }: Props) {
  const { status, scout, valuation, communication, forensic, cf } = state;
  const comm = communication;

  const statusColor =
    status === "COMPLETED"       ? "text-[#C8804A]"  :
    status === "DROPPED"         ? "text-[#C84848]"  :
    status === "COMPLIANCE_HALT" ? "text-[#C89040]"  :
    "text-[#A89E94]";

  return (
    <div className="mt-8 space-y-0">
      <hr className="t-rule mb-4" />

      {/* Status line */}
      <div className="flex items-baseline gap-4 mb-6">
        <span className={`text-xs font-bold tracking-widest ${statusColor}`}>{status}</span>
        {comm && <span className="t-label">{comm.output_type?.toLowerCase().replace(/_/g, " ")}</span>}
      </div>

      {comm && valuation && (
        <>
          {/* Key metrics — inline data row */}
          <div className="flex items-baseline gap-6 mb-6 text-xs">
            <DataPoint
              label="Rating"
              value={valuation.rating}
              color={valuation.rating === "BUY" ? "text-[#C8804A]" : valuation.rating === "UNDERPERFORM" ? "text-[#C84848]" : "text-[#C89040]"}
            />
            <DataPoint label="PT 12M" value={`$${valuation.pt_12m}`} color="text-[#C8804A]" />
            <DataPoint label="RR" value={`${(valuation.rr_ratio ?? 0).toFixed(1)}:1`} color="text-[#C8804A]" />
            <DataPoint
              label="Confidence"
              value={`${((comm.audit_trail?.final_confidence ?? 0) * 100).toFixed(0)}%`}
              color="text-[#6E6258]"
            />
            <DataPoint
              label="FaVeS"
              value={`${valuation.faves_score?.total ?? "?"}/9`}
              color="text-[#6E6258]"
            />
          </div>

          <hr className="t-rule mb-4" />

          {/* ENTER gate — compact inline */}
          <div className="mb-6">
            <span className="t-label mr-4">ENTER Gate</span>
            <span className="text-xs text-[#6E6258]">
              score <span className={comm.enter_gate.effective_score >= 5 ? "text-[#C8804A]" : "text-[#C84848]"}>{comm.enter_gate.effective_score}/5</span>
              {" · "}
              {(["Edge", "New", "Timely", "Examples", "Revealing"] as const).map((name, i) => {
                const vals = [comm.enter_gate.edge, comm.enter_gate.new_catalyst, comm.enter_gate.timely, comm.enter_gate.examples, comm.enter_gate.revealing];
                const pass = vals[i];
                return (
                  <span key={name} className={`mr-2 ${pass ? "text-[#C8804A]" : "text-[#D8D0C8]"}`}>
                    {name[0]}
                  </span>
                );
              })}
            </span>
          </div>

          {/* Scenarios */}
          {cf && (cf.scenarios ?? []).length > 0 && (
            <div className="mb-6">
              <div className="t-label mb-2">Scenarios</div>
              <div className="flex gap-8 text-xs">
                {(cf.scenarios ?? []).map(s => (
                  <div key={s.type}>
                    <span className="text-[#A89E94]">{s.type?.toLowerCase()}</span>
                    {" "}
                    <span className="text-[#C8804A]">${s.implied_pt}</span>
                    {" "}
                    <span className="text-[#A89E94]">{(s.probability * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Forensic flags */}
          {forensic && (forensic.flags ?? []).length > 0 && (
            <div className="mb-6">
              <div className="t-label mb-2">
                Forensic Flags · {(forensic.flags ?? []).length} · haircut{" "}
                <span className="text-[#6E6258]">{(forensic.eps_haircut_total ?? 0).toFixed(0)}%</span>
              </div>
              <div className="space-y-1">
                {(forensic.flags ?? []).map((f, i) => (
                  <div key={i} className="flex items-baseline gap-3 text-xs">
                    <span className={`font-mono ${f.severity >= 4 ? "text-[#C84848]" : f.severity === 3 ? "text-[#C89040]" : "text-[#A89E94]"}`}>
                      {f.severity}
                    </span>
                    <span className="text-[#6E6258] flex-1">{f.description}</span>
                    <span className="text-[#A89E94]">−{(f.eps_haircut_pct * 100).toFixed(0)}% eps</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fallback flags */}
          {(comm.audit_trail?.fallback_flags ?? []).length > 0 && (
            <div className="mb-6">
              <span className="t-label mr-3">Fallbacks</span>
              <span className="text-xs text-[#C89040]">
                {(comm.audit_trail?.fallback_flags ?? []).join(" · ")}
              </span>
            </div>
          )}

          <hr className="t-rule mb-4" />

          {/* Alpha score breakdown */}
          {scout && scout.alpha_score && (
            <div className="mb-6">
              <div className="flex items-baseline gap-3 mb-3">
                <span className="t-label">Alpha Score</span>
                <span className="text-[#C8804A] text-xs font-bold">{scout.alpha_score.total}/100</span>
                {scout.confidence != null && (
                  <span className="text-[#A89E94] text-xs">conf {(scout.confidence * 100).toFixed(0)}%</span>
                )}
              </div>
              <div className="flex gap-6 text-xs">
                <ScorePair label="Coverage"  value={scout.alpha_score.coverage_gap_score} max={25} />
                <ScorePair label="Mkt Cap"   value={scout.alpha_score.market_cap_fit}     max={20} />
                <ScorePair label="Sector"    value={scout.alpha_score.sector_relevance}   max={25} />
                <ScorePair label="Valuation" value={scout.alpha_score.valuation_anomaly}  max={30} />
                <ScorePair label="Gunn +"    value={scout.alpha_score.gunn_bonus}         max={25} />
              </div>
              {(scout.alpha_score.gunn_bonus ?? 0) > 0 && (
                <div className="flex gap-3 text-xs text-[#A89E94] mt-2">
                  {scout.alpha_score.em_gdp_bonus > 0 && <span className="text-[#A86030]">+{scout.alpha_score.em_gdp_bonus} EM GDP</span>}
                  {scout.alpha_score.bessembinder_bonus > 0 && <span className="text-[#A86030]">+{scout.alpha_score.bessembinder_bonus} Bessembinder</span>}
                  {scout.alpha_score.low_coverage_bonus > 0 && <span className="text-[#A86030]">+{scout.alpha_score.low_coverage_bonus} Low Coverage</span>}
                </div>
              )}
            </div>
          )}

          <hr className="t-rule mb-4" />

          {/* CASCADE output */}
          {comm.content && (
            <div className="mb-6">
              <div className="t-label mb-3">Research Note</div>
              <CascadeRenderer content={comm.content} />
            </div>
          )}
        </>
      )}

      {(status === "DROPPED" || status === "COMPLIANCE_HALT") && !comm && (
        <p className="prose-tufte text-sm">
          {status === "COMPLIANCE_HALT"
            ? "Pipeline halted — MNPI concern detected. Compliance team notified."
            : "Idea did not pass pipeline gates. See agent steps above for drop reason."}
        </p>
      )}
    </div>
  );
}

function DataPoint({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span>
      <span className="t-label mr-1">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </span>
  );
}

function ScorePair({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <span className="text-[#A89E94]">
      {label}{" "}
      <span className="text-[#6E6258]">{value}</span>
      <span className="text-[#D8D0C8]">/{max}</span>
    </span>
  );
}


