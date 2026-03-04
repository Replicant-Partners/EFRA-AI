import type { PipelineState, ReportContent, ReportSection, ReportScenario } from "../shared/types.js";

export function buildReportContent(state: PipelineState): ReportContent {
  const now = new Date().toISOString();

  const sections: ReportSection[] = [
    {
      key:     "executive_summary",
      label:   "Executive Summary",
      content: state.intel?.business_context?.executive_summary ?? "",
      source:  "intel.business_context.executive_summary",
    },
    {
      key:     "business_memo",
      label:   "Business Memo",
      content: state.intel?.business_context?.business_memo ?? "",
      source:  "intel.business_context.business_memo",
    },
    {
      key:     "catalyst_assessment",
      label:   "Catalyst Assessment",
      content: state.intel?.business_context?.catalyst_assessment ?? "",
      source:  "intel.business_context.catalyst_assessment",
    },
    {
      key:     "management_summary",
      label:   "Management Profile",
      content: state.forensic?.management_profile?.management_summary ?? "",
      source:  "forensic.management_profile.management_summary",
    },
    {
      key:     "valuation_exec_summary",
      label:   "Valuation Overview",
      content: state.valuation?.valuation_exec_summary ?? "",
      source:  "valuation.valuation_exec_summary",
    },
    {
      key:     "peer_comparison",
      label:   "Peer Comparison",
      content: state.valuation?.peer_comparison ?? "",
      source:  "valuation.peer_comparison",
    },
    {
      key:     "margin_of_safety",
      label:   "Margin of Safety",
      content: state.valuation?.margin_of_safety ?? "",
      source:  "valuation.margin_of_safety",
    },
    {
      key:     "valuation_summary",
      label:   "Valuation Summary",
      content: state.valuation?.valuation_summary ?? "",
      source:  "valuation.valuation_summary",
    },
  ];

  const scenarios: ReportScenario[] = (state.cf?.scenarios ?? []).map((s) => ({
    type:             s.type,
    probability:      s.probability,
    implied_pt:       s.implied_pt,
    price_derivation: s.price_derivation,
    triggers:         s.triggers,
  }));

  return {
    version:            1,
    generated_at:       now,
    sections,
    scenarios,
    cascade_text:       state.communication?.content ?? "",
    cascade_updated_at: now,
  };
}
