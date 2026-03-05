import type { PipelineState, ReportContent, ReportSection, ReportScenario } from "../shared/types.js";

function buildForensicContent(state: PipelineState): string {
  const f = state.forensic;
  if (!f) return "";

  // Full scan: use the written management summary
  if (f.management_profile?.management_summary) {
    return f.management_profile.management_summary;
  }

  // Pre-screen or missing management profile: build from quantitative data
  const lines: string[] = [];

  lines.push(
    `Risk Score: ${f.risk_score}/100 · Management Trust: ${f.mgmt_trust_score}/100 · Recommendation: ${f.recommendation}`
  );

  if (f.eps_haircut_total > 0 || f.dr_add_bps_total > 0) {
    lines.push(`EPS Haircut: ${f.eps_haircut_total.toFixed(1)}% · DR Add: ${f.dr_add_bps_total} bps`);
  }

  if (f.flags && f.flags.length > 0) {
    lines.push("");
    lines.push("Yellow Flags:");
    f.flags.forEach((flag) => {
      lines.push(
        `[S${flag.severity}] ${flag.description} (EPS haircut: ${flag.eps_haircut_pct}%, DR add: ${flag.dr_add_bps} bps)`
      );
    });
  }

  // Add individual management profile fields if partially available
  const mp = f.management_profile;
  if (mp) {
    if (mp.founder_profile) { lines.push(""); lines.push("Founder: " + mp.founder_profile); }
    if (mp.ceo_profile)     { lines.push("CEO: "     + mp.ceo_profile); }
    if (mp.team_stability)  { lines.push("Team: "    + mp.team_stability); }
    if (mp.incentive_alignment) { lines.push("Incentives: " + mp.incentive_alignment); }
    if (mp.key_decisions)   { lines.push("Key Decisions: " + mp.key_decisions); }
  }

  return lines.join("\n");
}

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
      content: buildForensicContent(state),
      source:  "forensic.management_profile.management_summary",
    },
    {
      key:     "valuation_exec_summary",
      label:   "Market Context",
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
      label:   "Valuation Conclusion",
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
