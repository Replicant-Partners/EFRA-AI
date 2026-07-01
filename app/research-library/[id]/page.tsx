"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import type { CompanyBoard, GorillaBoard, ImagineBoard, ThesisBoard } from "@/src/shared/types";

interface ResearchRecord {
  id:             string;
  ticker:         string;
  analyst_id:     string;
  gorilla_verdict: string | null;
  gorilla_total:   number | null;
  thesis_quality:  string | null;
  moat_source:     string | null;
  moat_depth:      string | null;
  trust_score:     number | null;
  digital_stage:   string | null;
  growth_driver:   string | null;
  created_at:      string;
  full_state: {
    company?: CompanyBoard;
    gorilla?: GorillaBoard;
    imagine?: ImagineBoard;
    thesis?:  ThesisBoard;
  };
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-[#E4DDD6] pt-6 space-y-3">
      <div className="text-[9px] font-semibold tracking-[0.15em] text-[#C0B8AC] uppercase">{label}</div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex gap-3 text-[11px]">
      <span className="text-[#A89E94] w-36 shrink-0">{label}</span>
      <span className="text-[#1E1A14]">{value}</span>
    </div>
  );
}

export default function ResearchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [record, setRecord]   = useState<ResearchRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/research/${id}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => { setRecord(data as ResearchRecord); setLoading(false); })
      .catch(err => { setError(String(err)); setLoading(false); });
  }, [id]);

  if (loading) return <p className="t-label text-[#A89E94]">Loading…</p>;
  if (error || !record) return <p className="text-xs text-[#C84848]">{error ?? "Not found"}</p>;

  const { company, gorilla, imagine, thesis } = record.full_state;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#C8804A] tracking-widest uppercase">{record.ticker}</h1>
          <p className="t-label mt-1">
            {record.analyst_id} · {new Date(record.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <Link href="/research-library" className="text-xs text-[#A89E94] hover:text-[#C8804A] transition-colors">
          ← Research Library
        </Link>
      </div>

      <hr className="t-rule" />

      {/* COMPANY */}
      {company && (
        <Section label="13 · Company Analysis">
          <Field label="Moat source"      value={company.franchise?.moat_source} />
          <Field label="Moat depth"       value={company.franchise?.moat_depth} />
          <Field label="Moat durability"  value={company.franchise?.moat_durability} />
          <Field label="Value creation"   value={company.franchise?.value_creation_mechanism} />
          <Field label="CEO verdict"      value={company.owner_operator?.ceo_scorecard?.verdict} />
          <Field label="CFO score"        value={company.owner_operator?.cfo_scorecard?.score} />
          <Field label="Trust score"      value={company.owner_operator?.mgmt_trust_score != null ? `${company.owner_operator.mgmt_trust_score}/100` : null} />
          <Field label="Thesis quality"   value={thesis?.thesis_quality} />
          {company.business_memo && (
            <div className="prose-tufte text-[11px] text-[#6E6258] leading-relaxed border-t border-[#EDE7E0] pt-3 mt-2">
              {company.business_memo}
            </div>
          )}
          {company.gorilla_elevator?.elevator_pitch && (
            <div className="text-[11px] text-[#C8804A] font-medium leading-relaxed border-t border-[#EDE7E0] pt-3 mt-2">
              {company.gorilla_elevator.elevator_pitch}
            </div>
          )}
        </Section>
      )}

      {/* GORILLA */}
      {gorilla && (
        <Section label="10 · Gorilla Framework">
          <div className="flex gap-4 text-[11px]">
            <span>
              <span className="text-[#C0B8AC] text-[9px] uppercase tracking-wider mr-1">Verdict</span>
              <span className={`font-semibold ${gorilla.gorilla_verdict === "GORILLA" ? "text-[#C8804A]" : gorilla.gorilla_verdict === "SMALL_ANIMAL" ? "text-[#C89040]" : "text-[#A89E94]"}`}>
                {gorilla.gorilla_verdict}
              </span>
            </span>
            <span>
              <span className="text-[#C0B8AC] text-[9px] uppercase tracking-wider mr-1">Score</span>
              <span className="text-[#C8804A] font-bold">{gorilla.gorilla_total}</span>/100
            </span>
          </div>
          <div className="flex gap-5 text-[11px] mt-2">
            <span>Obvious <span className="text-[#C8804A]">{gorilla.obvious_problem?.score}</span></span>
            <span>Invisible <span className="text-[#C8804A]">{gorilla.invisible_gorilla?.score}</span></span>
            <span>Combinatorial <span className="text-[#C8804A]">{gorilla.combinatorial?.score}</span></span>
            <span>Choke <span className="text-[#C8804A]">{gorilla.choke_point?.score}</span></span>
          </div>
          {gorilla.verdict_rationale && (
            <div className="prose-tufte text-[11px] text-[#6E6258] leading-relaxed border-t border-[#EDE7E0] pt-3 mt-2">
              {gorilla.verdict_rationale}
            </div>
          )}
          {gorilla.gorilla_memo && (
            <div className="prose-tufte text-[11px] text-[#6E6258] leading-relaxed border-t border-[#EDE7E0] pt-3 mt-2">
              {gorilla.gorilla_memo}
            </div>
          )}
        </Section>
      )}

      {/* IMAGINE */}
      {imagine && (
        <Section label="11 · Long-Range Imagination">
          <div className="flex gap-5 text-[11px]">
            <Field label="Digital stage"  value={imagine.digital_stage} />
            <Field label="Growth driver"  value={imagine.growth_driver} />
            <Field label="Confidence"     value={imagine.imagination_confidence != null ? `${(imagine.imagination_confidence * 100).toFixed(0)}%` : null} />
          </div>
          {(imagine.scenarios ?? []).map((s, i) => (
            <div key={i} className="border border-[#EDE7E0] rounded-sm px-3 py-2.5 text-[11px]">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-bold text-[#C8804A]">{s.horizon.toUpperCase()}</span>
                <span className="text-[#A89E94]">{((s.probability ?? 0) * 100).toFixed(0)}% prob</span>
                <span className="text-[#8C7E70] text-[10px]">force: {s.key_force}</span>
              </div>
              <div className="text-[#6E6258] leading-relaxed">{s.world}</div>
            </div>
          ))}
          {(imagine.not_in_the_price ?? []).length > 0 && (
            <div className="border-t border-[#EDE7E0] pt-3 space-y-1">
              <div className="text-[9px] font-semibold tracking-[0.12em] text-[#C0B8AC] uppercase mb-2">Not in the price</div>
              {imagine.not_in_the_price.map((item, i) => (
                <div key={i} className="flex gap-2 text-[11px]">
                  <span className="text-[#C8804A] shrink-0">→</span>
                  <span className="text-[#6E6258]">{item}</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* THESIS */}
      {thesis && (
        <Section label="12 · Investment Thesis">
          <Field label="Quality"        value={thesis.thesis_quality?.replace("_", " ")} />
          <Field label="Moat strength"  value={thesis.business_franchise?.moat_strength} />
          <Field label="Durability"     value={thesis.business_franchise?.durability} />
          <Field label="Capital alloc." value={thesis.management_quality?.capital_allocation_verdict} />
          {thesis.thesis_memo && (
            <div className="prose-tufte text-[11px] text-[#6E6258] leading-relaxed border-t border-[#EDE7E0] pt-3 mt-2">
              {thesis.thesis_memo}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
