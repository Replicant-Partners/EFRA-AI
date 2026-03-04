"use client";

import type { PipelineState } from "@/src/shared/types";

interface Props {
  state: PipelineState;
}

// ─── Shared primitives ─────────────────────────────────────────────────────

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-[9px] font-semibold tracking-[0.14em] text-[#C0B8AC] uppercase">
        {label}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-[11px] leading-relaxed">
      <span className="text-[#A89E94] w-36 flex-shrink-0">{label}</span>
      <span className="text-[#1E1A14]">{value}</span>
    </div>
  );
}

function Prose({ text }: { text: string }) {
  if (!text) return <span className="text-[#C0B8AC] italic text-[11px]">—</span>;
  return <p className="text-[11px] text-[#1E1A14] leading-relaxed whitespace-pre-line">{text}</p>;
}

function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-[#EDE7E0] rounded-full overflow-hidden">
        <div className="h-full bg-[#C8804A]" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-[#C8804A] font-semibold w-8 text-right">{value}</span>
    </div>
  );
}

// ─── Agent panels ───────────────────────────────────────────────────────────

function ScoutPanel({ scout }: { scout: NonNullable<PipelineState["scout"]> }) {
  const s = scout.alpha_score;
  const r = scout.score_reasoning;
  const decisionColor =
    scout.decision === "MUST_COVER"  ? "text-[#C8804A]" :
    scout.decision === "DROP"        ? "text-[#C84848]" :
    "text-[#C89040]";

  return (
    <Block label="01 · Scout — Alpha Score">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-[#C8804A]">{s.total}</span>
            <span className="text-[10px] text-[#A89E94]">/ 100</span>
            <span className={`text-[10px] font-semibold uppercase tracking-widest ml-auto ${decisionColor}`}>
              {scout.decision.replace(/_/g, " ")}
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex gap-2 text-[10px] text-[#A89E94]">
              <span className="w-36">Coverage Gap</span>
              <ScoreBar value={s.coverage_gap_score} max={25} />
            </div>
            <div className="flex gap-2 text-[10px] text-[#A89E94]">
              <span className="w-36">Market Cap Fit</span>
              <ScoreBar value={s.market_cap_fit} max={20} />
            </div>
            <div className="flex gap-2 text-[10px] text-[#A89E94]">
              <span className="w-36">Sector Relevance</span>
              <ScoreBar value={s.sector_relevance} max={25} />
            </div>
            <div className="flex gap-2 text-[10px] text-[#A89E94]">
              <span className="w-36">Valuation Anomaly</span>
              <ScoreBar value={s.valuation_anomaly} max={30} />
            </div>
            {s.gunn_bonus > 0 && (
              <div className="flex gap-2 text-[10px] text-[#A89E94]">
                <span className="w-36">Gunn Bonus</span>
                <ScoreBar value={s.gunn_bonus} max={25} />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Row label="Horizon" value={scout.horizon_tag} />
          <Row label="Mode" value={scout.downstream_mode} />
          <Row label="Confidence" value={`${(scout.confidence * 100).toFixed(0)}%`} />
          {scout.conf_adjustment !== 0 && (
            <Row label="Conf. Adjustment" value={`${(scout.conf_adjustment * 100).toFixed(0)}%`} />
          )}
        </div>

        {scout.decision_rationale && (
          <div className="space-y-1">
            <span className="text-[10px] text-[#A89E94]">Decision Rationale</span>
            <Prose text={scout.decision_rationale} />
          </div>
        )}

        {(r.coverage_gap_rationale || r.valuation_anomaly_rationale) && (
          <div className="space-y-2 border-t border-[#EDE7E0] pt-3">
            <span className="text-[10px] text-[#A89E94] uppercase tracking-wider">Score Reasoning</span>
            {r.coverage_gap_rationale && <Row label="Coverage Gap" value={r.coverage_gap_rationale} />}
            {r.market_cap_fit_rationale && <Row label="Market Cap" value={r.market_cap_fit_rationale} />}
            {r.sector_relevance_rationale && <Row label="Sector" value={r.sector_relevance_rationale} />}
            {r.valuation_anomaly_rationale && <Row label="Valuation" value={r.valuation_anomaly_rationale} />}
            {r.gunn_bonus_rationale && <Row label="Gunn Bonus" value={r.gunn_bonus_rationale} />}
          </div>
        )}
      </div>
    </Block>
  );
}

function IntelPanel({ intel }: { intel: NonNullable<PipelineState["intel"]> }) {
  const bc = intel.business_context;
  return (
    <Block label="02 · Intel — Business Context">
      <div className="space-y-4">
        <div className="space-y-1">
          <Row label="Moat Type"    value={bc.moat_type || "—"} />
          <Row label="Mgmt Comm"    value={`${intel.mgmt_comm_score} / 100`} />
          <Row label="Mosaic Clear" value={intel.mosaic_clear ? "Yes" : "No"} />
          <Row label="News Surfaced" value={`${intel.surfaced_count} (${intel.suppressed_count} suppressed)`} />
        </div>

        {bc.moat_evidence && (
          <div className="space-y-1">
            <span className="text-[10px] text-[#A89E94]">Moat Evidence</span>
            <Prose text={bc.moat_evidence} />
          </div>
        )}

        {bc.growth_trend && (
          <div className="space-y-1">
            <span className="text-[10px] text-[#A89E94]">Growth Trend</span>
            <Prose text={bc.growth_trend} />
          </div>
        )}

        {intel.analyst_briefing && (
          <div className="space-y-1">
            <span className="text-[10px] text-[#A89E94]">Analyst Briefing</span>
            <Prose text={intel.analyst_briefing} />
          </div>
        )}

        {intel.hypotheses.length > 0 && (
          <div className="space-y-2 border-t border-[#EDE7E0] pt-3">
            <span className="text-[10px] text-[#A89E94] uppercase tracking-wider">
              Hypotheses ({intel.hypotheses.length})
            </span>
            {intel.hypotheses.map((h) => (
              <div key={h.id} className="flex gap-2 text-[11px]">
                <span className={`flex-shrink-0 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  h.lifecycle === "VALIDATED"   ? "bg-[#F0EAE4] text-[#C8804A]" :
                  h.lifecycle === "UNRESOLVABLE" ? "bg-[#F5E8E8] text-[#C84848]" :
                  "bg-[#F5F1EB] text-[#A89E94]"
                }`}>
                  {h.lifecycle.replace(/_/g, " ")}
                </span>
                <span className="text-[#1E1A14]">{h.statement}</span>
              </div>
            ))}
          </div>
        )}

        {intel.news_items.length > 0 && (
          <div className="space-y-2 border-t border-[#EDE7E0] pt-3">
            <span className="text-[10px] text-[#A89E94] uppercase tracking-wider">
              News Items ({intel.news_items.length})
            </span>
            {intel.news_items.map((n) => (
              <div key={n.id} className="space-y-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] font-medium text-[#1E1A14] leading-snug flex-1">
                    {n.headline}
                  </span>
                  <span className="text-[9px] text-[#C8804A] font-semibold flex-shrink-0">{n.score}</span>
                </div>
                <div className="flex gap-2 text-[10px] text-[#A89E94]">
                  <span>{n.source}</span>
                  <span>·</span>
                  <span>Tier {n.source_tier}</span>
                  <span>·</span>
                  <span>{n.published_at?.slice(0, 10)}</span>
                </div>
                {n.summary && <p className="text-[10px] text-[#6E6258] leading-snug">{n.summary}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </Block>
  );
}

function CFPanel({ cf }: { cf: NonNullable<PipelineState["cf"]> }) {
  return (
    <Block label="03 · Critical Factors">
      <div className="space-y-4">
        <Row label="Expected Value PT" value={`$${cf.expected_value_pt.toFixed(2)}`} />

        {cf.build_to_last_score && (
          <div className="space-y-1">
            <span className="text-[10px] text-[#A89E94]">Build-to-Last Score</span>
            <div className="space-y-1">
              <Row label="Management" value={cf.build_to_last_score.management} />
              <Row label="TAM" value={cf.build_to_last_score.tam} />
              <Row label="Moat" value={cf.build_to_last_score.moat} />
              <Row label="Total" value={<span className="font-semibold text-[#C8804A]">{cf.build_to_last_score.total}</span>} />
            </div>
          </div>
        )}

        {cf.factors.length > 0 && (
          <div className="space-y-2 border-t border-[#EDE7E0] pt-3">
            <span className="text-[10px] text-[#A89E94] uppercase tracking-wider">
              Key Factors ({cf.factors.length})
            </span>
            {cf.factors.map((f) => (
              <div key={f.id} className="space-y-0.5">
                <p className="text-[11px] text-[#1E1A14] leading-snug">{f.description}</p>
                <span className="text-[10px] text-[#A89E94]">EPS impact: {f.eps_impact_pct > 0 ? "+" : ""}{f.eps_impact_pct}%</span>
              </div>
            ))}
          </div>
        )}

        {cf.hypotheses.length > 0 && (
          <div className="space-y-2 border-t border-[#EDE7E0] pt-3">
            <span className="text-[10px] text-[#A89E94] uppercase tracking-wider">
              CF Hypotheses ({cf.hypotheses.length})
            </span>
            {cf.hypotheses.map((h) => (
              <div key={h.id} className="flex gap-2 text-[11px]">
                <span className="text-[10px] text-[#A89E94] flex-shrink-0">
                  {h.lifecycle.replace(/_/g, " ")}
                </span>
                <span className="text-[#1E1A14]">{h.statement}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Block>
  );
}

function ForensicPanel({ forensic }: { forensic: NonNullable<PipelineState["forensic"]> }) {
  const recColor =
    forensic.recommendation === "BLOCK"       ? "text-[#C84848]" :
    forensic.recommendation === "CONDITIONAL" ? "text-[#C89040]" :
    "text-[#C8804A]";

  const riskLevel =
    forensic.risk_score >= 70 ? "HIGH" :
    forensic.risk_score >= 40 ? "MEDIUM" : "LOW";

  const riskColor =
    riskLevel === "HIGH"   ? "text-[#C84848]" :
    riskLevel === "MEDIUM" ? "text-[#C89040]" :
    "text-[#C8804A]";

  return (
    <Block label="04 · Forensic — Risk Profile">
      <div className="space-y-4">
        <div className="flex gap-6">
          <div className="space-y-0.5">
            <div className={`text-xl font-bold ${riskColor}`}>{forensic.risk_score}</div>
            <div className="text-[9px] text-[#A89E94] uppercase tracking-wider">Risk Score</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xl font-bold text-[#1E1A14]">{forensic.mgmt_trust_score}</div>
            <div className="text-[9px] text-[#A89E94] uppercase tracking-wider">Mgmt Trust</div>
          </div>
          <div className="space-y-0.5 ml-auto text-right">
            <div className={`text-sm font-semibold uppercase ${recColor}`}>{forensic.recommendation}</div>
            <div className="text-[9px] text-[#A89E94] uppercase tracking-wider">Recommendation</div>
          </div>
        </div>

        <div className="space-y-1">
          <Row label="EPS Haircut" value={`${forensic.eps_haircut_total.toFixed(1)}%`} />
          <Row label="DR Add"      value={`${forensic.dr_add_bps_total} bps`} />
        </div>

        {forensic.flags.length > 0 && (
          <div className="space-y-2 border-t border-[#EDE7E0] pt-3">
            <span className="text-[10px] text-[#A89E94] uppercase tracking-wider">
              Yellow Flags ({forensic.flags.length})
            </span>
            {forensic.flags.map((flag, i) => (
              <div key={i} className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold w-4 ${
                    flag.severity >= 4 ? "text-[#C84848]" :
                    flag.severity >= 3 ? "text-[#C89040]" :
                    "text-[#A89E94]"
                  }`}>S{flag.severity}</span>
                  <p className="text-[11px] text-[#1E1A14] leading-snug flex-1">{flag.description}</p>
                </div>
                <div className="text-[10px] text-[#A89E94] ml-6">
                  EPS haircut: {flag.eps_haircut_pct}% · DR add: {flag.dr_add_bps} bps
                </div>
              </div>
            ))}
          </div>
        )}

        {forensic.management_profile && (
          <div className="space-y-2 border-t border-[#EDE7E0] pt-3">
            <span className="text-[10px] text-[#A89E94] uppercase tracking-wider">Management Deep Dive</span>
            {forensic.management_profile.founder_profile && (
              <div className="space-y-0.5">
                <span className="text-[10px] text-[#A89E94]">Founder Profile</span>
                <Prose text={forensic.management_profile.founder_profile} />
              </div>
            )}
            {forensic.management_profile.ceo_profile && (
              <div className="space-y-0.5">
                <span className="text-[10px] text-[#A89E94]">CEO Profile</span>
                <Prose text={forensic.management_profile.ceo_profile} />
              </div>
            )}
            {forensic.management_profile.team_stability && (
              <div className="space-y-0.5">
                <span className="text-[10px] text-[#A89E94]">Team Stability</span>
                <Prose text={forensic.management_profile.team_stability} />
              </div>
            )}
            {forensic.management_profile.incentive_alignment && (
              <div className="space-y-0.5">
                <span className="text-[10px] text-[#A89E94]">Incentive Alignment</span>
                <Prose text={forensic.management_profile.incentive_alignment} />
              </div>
            )}
            {forensic.management_profile.key_decisions && (
              <div className="space-y-0.5">
                <span className="text-[10px] text-[#A89E94]">Key Decisions</span>
                <Prose text={forensic.management_profile.key_decisions} />
              </div>
            )}
          </div>
        )}
      </div>
    </Block>
  );
}

function ValuationPanel({ valuation }: { valuation: NonNullable<PipelineState["valuation"]> }) {
  const ratingColor =
    valuation.rating === "BUY"          ? "text-[#C8804A]" :
    valuation.rating === "UNDERPERFORM" ? "text-[#C84848]" :
    "text-[#C89040]";

  return (
    <Block label="05 · Valuation — Model">
      <div className="space-y-4">
        <div className="flex gap-6 flex-wrap">
          <div className="space-y-0.5">
            <div className={`text-2xl font-bold ${ratingColor}`}>{valuation.rating}</div>
            <div className="text-[9px] text-[#A89E94] uppercase tracking-wider">Rating</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-bold text-[#C8804A]">${valuation.pt_12m}</div>
            <div className="text-[9px] text-[#A89E94] uppercase tracking-wider">PT 12M</div>
          </div>
          {valuation.pt_5y != null && (
            <div className="space-y-0.5">
              <div className="text-2xl font-bold text-[#1E1A14]">${valuation.pt_5y}</div>
              <div className="text-[9px] text-[#A89E94] uppercase tracking-wider">PT 5Y</div>
            </div>
          )}
          <div className="space-y-0.5">
            <div className="text-xl font-bold text-[#1E1A14]">{valuation.rr_ratio.toFixed(1)}x</div>
            <div className="text-[9px] text-[#A89E94] uppercase tracking-wider">R/R Ratio</div>
          </div>
        </div>

        <div className="space-y-1 border-t border-[#EDE7E0] pt-3">
          <span className="text-[10px] text-[#A89E94] uppercase tracking-wider">FaVeS Score</span>
          <div className="space-y-1 mt-1">
            <Row label="Frequency (F)" value={valuation.faves_score.frequency} />
            <Row label="Visibility (V)" value={valuation.faves_score.visibility} />
            <Row label="Significance (S)" value={valuation.faves_score.significance} />
            <Row label="Total" value={<span className="font-semibold text-[#C8804A]">{valuation.faves_score.total} / 9</span>} />
          </div>
        </div>

        {valuation.ic_premium != null && (
          <Row label="IC Premium" value={`${(valuation.ic_premium * 100).toFixed(0)}%`} />
        )}
        <Row label="Conf. Adjustment" value={`${(valuation.conf_adj * 100).toFixed(0)}%`} />

        {valuation.current_multiples && (
          <div className="space-y-1 border-t border-[#EDE7E0] pt-3">
            <span className="text-[10px] text-[#A89E94]">Current Multiples</span>
            <Prose text={valuation.current_multiples} />
          </div>
        )}

        {valuation.market_assumptions && (
          <div className="space-y-1">
            <span className="text-[10px] text-[#A89E94]">Market Assumptions</span>
            <Prose text={valuation.market_assumptions} />
          </div>
        )}
      </div>
    </Block>
  );
}

function CommPanel({ comm }: { comm: NonNullable<PipelineState["communication"]> }) {
  const gate = comm.enter_gate;
  const CheckIcon = ({ ok }: { ok: boolean }) => (
    <span className={`text-[10px] font-bold ${ok ? "text-[#C8804A]" : "text-[#C84848]"}`}>
      {ok ? "✓" : "✗"}
    </span>
  );

  return (
    <Block label="06 · Communication — ENTER Gate">
      <div className="space-y-4">
        <div className="flex gap-4 items-baseline">
          <span className="text-2xl font-bold text-[#C8804A]">{gate.effective_score}</span>
          <span className="text-[10px] text-[#A89E94]">/ 5 effective score</span>
          <span className="text-[10px] text-[#A89E94] ml-auto uppercase tracking-wider">{comm.output_type}</span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[11px]">
            <CheckIcon ok={gate.edge} />
            <span className="text-[#1E1A14]">Edge — proprietary insight</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <CheckIcon ok={gate.new_catalyst} />
            <span className="text-[#1E1A14]">New Catalyst — not priced in</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <CheckIcon ok={gate.timely} />
            <span className="text-[#1E1A14]">Timely — within decision window</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <CheckIcon ok={gate.examples} />
            <span className="text-[#1E1A14]">Examples — concrete evidence</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <CheckIcon ok={gate.revealing} />
            <span className="text-[#1E1A14]">Revealing — changes the thesis</span>
          </div>
        </div>

        {comm.audit_trail && (
          <div className="space-y-1 border-t border-[#EDE7E0] pt-3">
            <span className="text-[10px] text-[#A89E94] uppercase tracking-wider">Audit Trail</span>
            <Row label="Agents Run" value={comm.audit_trail.agents_run.join(" → ")} />
            <Row label="Final Confidence" value={`${(comm.audit_trail.final_confidence * 100).toFixed(0)}%`} />
            {comm.audit_trail.confidence_adjustments.length > 0 && (
              <div className="space-y-0.5 mt-1">
                <span className="text-[10px] text-[#A89E94]">Confidence Adjustments</span>
                {comm.audit_trail.confidence_adjustments.map((adj, i) => (
                  <div key={i} className="text-[10px] text-[#6E6258] ml-2">
                    {adj.agent} ({adj.code}): {adj.adj > 0 ? "+" : ""}{(adj.adj * 100).toFixed(0)}%
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Block>
  );
}

// ─── Main export ────────────────────────────────────────────────────────────

export default function PipelineData({ state }: Props) {
  return (
    <div className="space-y-8">
      {state.scout      && <><ScoutPanel    scout={state.scout}         /><hr className="border-[#EDE7E0]" /></>}
      {state.intel      && <><IntelPanel    intel={state.intel}         /><hr className="border-[#EDE7E0]" /></>}
      {state.cf         && <><CFPanel       cf={state.cf}               /><hr className="border-[#EDE7E0]" /></>}
      {state.forensic   && <><ForensicPanel forensic={state.forensic}   /><hr className="border-[#EDE7E0]" /></>}
      {state.valuation  && <><ValuationPanel valuation={state.valuation}/><hr className="border-[#EDE7E0]" /></>}
      {state.communication && <CommPanel comm={state.communication} />}
    </div>
  );
}
