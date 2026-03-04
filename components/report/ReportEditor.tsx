"use client";

import { useState } from "react";
import SectionEditor from "./SectionEditor";
import ScenariosTable from "./ScenariosTable";
import CascadePanel from "./CascadePanel";
import type { ReportContent } from "@/src/shared/types";

interface Props {
  analysisId:    string;
  initialReport: ReportContent;
}

export default function ReportEditor({ analysisId, initialReport }: Props) {
  const [report, setReport] = useState(initialReport);

  function handleSectionSaved(key: string, content: string) {
    setReport((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.key === key ? { ...s, content, updated_at: new Date().toISOString() } : s
      ),
    }));
  }

  function handleScenariosSaved(scenarios: ReportContent["scenarios"]) {
    setReport((prev) => ({ ...prev, scenarios }));
  }

  function handleCascadeRegenerated(cascade_text: string) {
    setReport((prev) => ({
      ...prev,
      cascade_text,
      cascade_updated_at: new Date().toISOString(),
    }));
  }

  const businessKeys  = ["executive_summary", "business_memo", "catalyst_assessment"];
  const riskKeys      = ["management_summary"];
  const valuationKeys = ["valuation_exec_summary", "peer_comparison", "margin_of_safety", "valuation_summary"];

  const byKey = (keys: string[]) => report.sections.filter((s) => keys.includes(s.key));

  return (
    <div className="space-y-10">

      <SectionGroup
        label="Business"
        sections={byKey(businessKeys)}
        analysisId={analysisId}
        onSaved={handleSectionSaved}
      />

      <hr className="border-[#EDE7E0]" />

      <SectionGroup
        label="Risk & Management"
        sections={byKey(riskKeys)}
        analysisId={analysisId}
        onSaved={handleSectionSaved}
      />

      <hr className="border-[#EDE7E0]" />

      <SectionGroup
        label="Valuation"
        sections={byKey(valuationKeys)}
        analysisId={analysisId}
        onSaved={handleSectionSaved}
      />

      <hr className="border-[#EDE7E0]" />

      <div className="space-y-4">
        <div className="text-[9px] font-semibold tracking-[0.14em] text-[#C0B8AC] uppercase">
          Scenarios
        </div>
        <ScenariosTable
          analysisId={analysisId}
          scenarios={report.scenarios}
          onSaved={handleScenariosSaved}
        />
      </div>

      <hr className="border-[#EDE7E0]" />

      <CascadePanel
        analysisId={analysisId}
        cascadeText={report.cascade_text}
        cascadeUpdatedAt={report.cascade_updated_at}
        onRegenerated={handleCascadeRegenerated}
      />

    </div>
  );
}

function SectionGroup({
  label,
  sections,
  analysisId,
  onSaved,
}: {
  label:      string;
  sections:   ReportContent["sections"];
  analysisId: string;
  onSaved:    (key: string, content: string) => void;
}) {
  if (sections.length === 0) return null;
  return (
    <div className="space-y-6">
      <div className="text-[9px] font-semibold tracking-[0.14em] text-[#C0B8AC] uppercase">
        {label}
      </div>
      {sections.map((section) => (
        <SectionEditor
          key={section.key}
          analysisId={analysisId}
          section={section}
          onSaved={onSaved}
        />
      ))}
    </div>
  );
}
