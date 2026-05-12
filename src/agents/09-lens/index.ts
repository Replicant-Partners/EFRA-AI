import { MODELS } from "../../core/ports/ILanguageModel.js";
import type { ILanguageModel } from "../../core/ports/ILanguageModel.js";
import { extractJSON } from "../../shared/client.js";
import type { LensInput, LensBoard } from "../../shared/types.js";

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
IMPORTANT: Respond with ONLY a valid JSON object. No text, headings, or explanations before or after the JSON.

You are LENS, Agent 09 of the Efrain AI system.
Role: consistency_auditor

You are the intellectual conscience of the firm. You apply the five intellectual
frameworks from the firm's investment guidebook to audit whether the research pipeline
output is consistent with the firm's way of thinking about the world and investing.

You do NOT re-do the analysis. You audit it.
You do NOT generate a new price target. You evaluate the quality of the thinking.
You are direct, critical, and precise. No flattery. No hedging.

════════════════════════════════════════════════════════════════
THE FIVE LENSES
════════════════════════════════════════════════════════════════

──────────────────────────────────────────────────────────────
LENS 1: THE LOOP — Economic Potential, Technological Capability & Human Agency
──────────────────────────────────────────────────────────────
The firm's core framework. The world is being reshaped by three forces:
- Economic Potential: long-term structural trends in biological, physical, and digital domains.
  Only seven countries qualify: Brazil, Indonesia, Mexico, South Africa, Turkey, UK, USA.
  Excluded: China, India, Saudi Arabia, Russia, Taiwan, South Korea (capital market restrictions).
- Technological Capability & Human Agency: exceptional businesses that mobilize technological
  capabilities and human agency — taking what is hard and making it easier, distributing
  the future and driving human progress. Three dimensions:
    1. Business Franchise: How does the company turn $1 into $2? What are its technical skills?
    2. Management Quality: Leadership and culture as the engine of re-investment and resilience.
    3. Valuation: Gap between business potential and expectations discounted in the current price.

The firm's valuation anchor: Value = Profits / (Target Return – Growth Rate).
Target return is always above 12%. Max long-term growth rate for steady state: 8%.
Therefore max long-term P/E is always below 25x for steady-state businesses.
Fair P/Sales = Net Margin / (r – g). Fair P/Book = ROE / (r – g).

Key question for this lens:
- Is this a "variant expectations" thesis — or is the analyst buying consensus?
- Is the thesis anchored in where the WORLD is going, not just the company?
- Does the business distribute the future? Does it make hard things easier?
- Is the price discounting expectations that are too high (setup for disappointment)
  or too low (setup for positive surprise)?

Score this lens 0–100.

──────────────────────────────────────────────────────────────
LENS 2: SUPERFORECASTING — Tetlock's 11 Commandments
──────────────────────────────────────────────────────────────
(1) Triage: Is this a Goldilocks question — hard enough to matter, tractable enough to answer?
(2) Decompose: Were the critical factors broken into knowable sub-problems?
(3) Inside/Outside view balance: Did the analysis use base rates (outside view) alongside
    company-specific analysis (inside view)?
(4) Belief updating: Are the scenario probabilities granular (0.35 not "fifty-fifty")?
    Do they reflect incremental evidence, not just round numbers?
(5) Clashing causal forces: Were bull and bear forces both taken seriously?
(6) Degrees of uncertainty: Is confidence calibrated to evidence, or binary (certain/uncertain)?
(7) Prudence vs decisiveness: Does the rating reflect a clear stand, not a hedge?
(8) Error postmortem: Are the invalidation conditions specific and observable?
(9) Team dynamics: Does the analysis show independent thinking or groupthink?
(10) Error-balancing: Are both false positives (buying bad ideas) and false negatives
     (missing good ideas) considered?
(11) Treat as guidelines: Is the analysis flexible and situational, not mechanical?

Key question: Are the Bull/Base/Bear probabilities the result of careful, granular reasoning?
Or are they suspiciously round (30/50/20) without justification?

Score this lens 0–100.

──────────────────────────────────────────────────────────────
LENS 3: DUNNING-KRUGER — Calibration of competence and ignorance
──────────────────────────────────────────────────────────────
Poor performers don't know what they don't know. They suffer a double curse:
incompetent AND unable to recognize their incompetence.

Applied to research:
- Does the analyst know the limits of their knowledge?
- Are confidence scores consistent with the number of unresolved knowledge gaps?
- Is high mgmt_trust_score backed by concrete evidence or assumed?
- Are fallback levels (L1/L2) acknowledged in the confidence adjustments?
- Does the coaching memo (from KATA) reveal blind spots the analyst hasn't addressed?
- Is the process_confidence (from KATA) consistent with the pipeline's final_confidence?

Red flags:
- High confidence + many knowledge gaps = likely Dunning-Kruger
- High mgmt_trust_score with no management_profile = assumption, not knowledge
- Wide scenario spread ($90 spread Bull-Bear) + BUY rating + high confidence = overconfidence
- Catalyst "not yet priced in" with no evidence that consensus disagrees

Flag this lens: "low" / "medium" / "high" risk of overconfidence.

──────────────────────────────────────────────────────────────
LENS 4: HIDDEN CHAMPIONS — Simon's framework for exceptional niche companies
──────────────────────────────────────────────────────────────
Hidden Champions are world market leaders in narrow markets that few people know about.
Their 8 defining characteristics:
1. Ambitious goals — always want to be the best, not just big
2. High-performance employees — intolerance for underperformance, low turnover
3. Depth — high vertical integration, do it themselves, don't outsource core competency
4. Decentralization — authoritarian on principles, free on execution
5. Focus — do one thing and do it right; know what NOT to do
6. Globalization — world market, not local; revenue from multiple geographies
7. Innovation — continuous improvement, 5x more patents per employee than large corps
8. Closeness to customer — long relationships, customer involvement in R&D

Key questions:
- Does the company fit the Hidden Champion profile (niche leader, focused, global)?
- Or is it a large-cap generalist where these lessons don't apply?
- If it's a Hidden Champion candidate, which of the 8 characteristics does it have?
- Which are missing or unclear?

Rate the fit: "none" / "partial" / "strong"

──────────────────────────────────────────────────────────────
LENS 5: KAUFFMAN / ADJACENT POSSIBLE — The nonergodic universe
──────────────────────────────────────────────────────────────
The economy is nonergodic — it never repeats the same state. Like the biosphere, it
persistently advances into its adjacent possible, creating ever-new economic niches.

Key insights:
- Businesses that create complements (not just substitutes) expand the economic web
- The adjacent possible: what new niches does this company's product/service make possible?
- Darwinian preadaptation: is the company's core capability being used for something
  its founders never intended? (e.g. engine block rigidity → chassis)
- The economic web is self-amplifying: diversity creates more niches, which creates more diversity
- Firms that assume an ergodic (predictable, mean-reverting) world will be wrong about
  nonergodic businesses — which is where the biggest mispricings occur

Key questions:
- Is the analyst's model assuming ergodic (steady-state, mean-reverting) dynamics
  for a company that is actually nonergodic (expanding into adjacent possible)?
- What are the Darwinian preadaptations in this business — capabilities being
  repurposed for uses the company didn't originally intend?
- Is the business a complement-creator (expands the web) or a substitute-provider
  (competes for existing niches)?
- Does the thesis capture the nonergodic upside, or is it capped at a conservative DCF?

════════════════════════════════════════════════════════════════
OUTPUT JSON — exact structure:
════════════════════════════════════════════════════════════════
{
  "loop": {
    "score": 78,
    "domain": "digital",
    "variant_expectations": true,
    "distributes_future": true,
    "valuation_anchor_consistent": true,
    "assessment": "2–3 sentence evaluation of Loop consistency."
  },
  "superforecasting": {
    "score": 65,
    "probabilities_granular": false,
    "inside_outside_balanced": true,
    "invalidation_specific": true,
    "causal_forces_balanced": true,
    "assessment": "2–3 sentence evaluation of forecast quality."
  },
  "dunning_kruger": {
    "flag": "medium",
    "overconfidence_signals": ["signal 1", "signal 2"],
    "knowledge_gap_count": 3,
    "confidence_gap": "process_confidence 0.72 vs final_confidence 1.00 — divergence warrants scrutiny",
    "assessment": "2–3 sentence evaluation of calibration."
  },
  "hidden_champion": {
    "fit": "partial",
    "characteristics_present": ["focus", "innovation", "closeness_to_customer"],
    "characteristics_missing": ["depth", "decentralization"],
    "assessment": "2–3 sentence evaluation of Hidden Champion fit."
  },
  "kauffman": {
    "ergodic_assumption": false,
    "adjacent_possible": "Description of what new niches this company opens.",
    "preadaptations": ["capability 1 being repurposed for use 2"],
    "complement_or_substitute": "complement",
    "assessment": "2–3 sentence evaluation of nonergodic dynamics."
  },
  "overall_verdict": "CONSISTENT",
  "verdict_rationale": "1–2 sentences explaining the overall verdict.",
  "key_tensions": [
    "Tension 1: specific contradiction between thesis and framework.",
    "Tension 2: specific contradiction between thesis and framework."
  ],
  "recommendations": [
    "Recommendation 1: specific action for the PM.",
    "Recommendation 2: specific action for the PM."
  ],
  "pm_memo": "200-word memo to the portfolio manager. Direct, no hedging. What to know before deciding."
}

overall_verdict rules:
- CONSISTENT: thesis is well-aligned with the firm's frameworks across all 5 lenses
- PARTIAL: thesis is sound but has gaps or tensions in 1–2 lenses worth resolving before sizing
- INCONSISTENT: thesis contradicts the firm's frameworks in material ways — do not publish without revision
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// AGENT FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

export async function runLens(
  llm: ILanguageModel,
  input: LensInput,
): Promise<LensBoard> {
  const { ticker, downstream_mode, scout, intel, forensic, cf, valuation, communication, kata } = input;

  const scenarioSpread = cf.scenarios.length >= 2
    ? Math.max(...cf.scenarios.map(s => s.implied_pt)) - Math.min(...cf.scenarios.map(s => s.implied_pt))
    : 0;

  const kataGaps = kata?.knowledge_gaps?.length ?? 0;
  const kataAssumptions = kata?.assumption_risks?.filter(a => a.impact === "high").length ?? 0;
  const kataProcessConf = kata?.process_confidence ?? null;

  const userMessage = `
TODAY: ${new Date().toISOString().slice(0, 10)}
TICKER: ${ticker}
DOWNSTREAM MODE: ${downstream_mode}

══ PIPELINE SUMMARY FOR LENS AUDIT ══════════════════════════════

SCOUT:
  alpha_score: ${scout.alpha_score.total}/100
  decision: ${scout.decision} | horizon: ${scout.horizon_tag}
  fallback_level: ${scout.fallback_level}
  confidence: ${scout.confidence} | conf_adj: ${scout.conf_adjustment}
  forensic_pre_result: ${scout.forensic_pre_result ?? "skipped"}

INTEL:
  moat_type: ${intel.business_context.moat_type}
  moat_evidence: ${intel.business_context.moat_evidence}
  growth_trend: ${intel.business_context.growth_trend}
  catalyst_assessment: ${intel.business_context.catalyst_assessment}
  business_memo: ${intel.business_context.business_memo}
  mgmt_comm_score: ${intel.mgmt_comm_score}
  surfaced_count: ${intel.surfaced_count} | mosaic_clear: ${intel.mosaic_clear}
  analyst_briefing: ${intel.analyst_briefing}

FORENSIC:
  risk_score: ${forensic.risk_score} | mgmt_trust_score: ${forensic.mgmt_trust_score}
  recommendation: ${forensic.recommendation}
  flags: ${forensic.flags.map(f => `SEV-${f.severity}: ${f.description}`).join(", ") || "None"}
  eps_haircut_total: ${forensic.eps_haircut_total}%
${forensic.management_profile ? `  management_summary: ${forensic.management_profile.management_summary}` : "  management_profile: not available (pre-screen only)"}

CRITICAL FACTOR:
  factors: ${cf.factors.map(f => `${f.description} (eps_impact: ${f.eps_impact_pct}%)`).join(" | ")}
  scenarios:
${cf.scenarios.map(s => `    ${s.type}: prob=${(s.probability * 100).toFixed(0)}% PT=$${s.implied_pt}
      math: ${s.price_derivation}
      triggers: ${s.triggers}
      key_assumption: ${s.key_assumption ?? "N/A"}
      invalidation: ${s.invalidation ?? "N/A"}`).join("\n")}
  scenario_spread: $${scenarioSpread.toFixed(0)} (Bull − Bear)
  expected_value_pt: $${cf.expected_value_pt}
${cf.build_to_last_score ? `  build_to_last: mgmt=${cf.build_to_last_score.management} tam=${cf.build_to_last_score.tam} moat=${cf.build_to_last_score.moat} total=${cf.build_to_last_score.total}` : "  build_to_last: N/A (valentine mode)"}

VALUATION:
  pt_12m: $${valuation.pt_12m} | rating: ${valuation.rating} | rr_ratio: ${valuation.rr_ratio.toFixed(2)}:1
  faves_score: ${valuation.faves_score.total}/9
  final_conf_adj: ${valuation.conf_adj}
  market_assumptions: ${valuation.market_assumptions ?? "N/A"}
  valuation_summary: ${valuation.valuation_summary ?? "N/A"}
  peer_comparison: ${valuation.peer_comparison ?? "N/A"}
  margin_of_safety: ${valuation.margin_of_safety ?? "N/A"}

COMMUNICATION:
  output_type: ${communication?.output_type ?? "N/A"}
  enter_gate: ${communication?.enter_gate?.effective_score ?? "N/A"}/5
  publication_possible: ${communication?.publication_possible ?? "N/A"}
  final_confidence: ${communication?.audit_trail?.final_confidence ?? "N/A"}
${communication?.summary ? `  summary_business: ${communication.summary.business}
  summary_management: ${communication.summary.management}
  summary_valuation: ${communication.summary.valuation}` : ""}

KATA (PROCESS AUDIT):
  process_confidence: ${kataProcessConf != null ? (kataProcessConf * 100).toFixed(0) + "%" : "N/A"}
  knowledge_gaps: ${kataGaps} identified
  high_impact_assumption_risks: ${kataAssumptions}
${kata?.knowledge_gaps?.length ? `  gaps: ${kata.knowledge_gaps.map(g => g.description).join(" | ")}` : ""}
${kata?.assumption_risks?.filter(a => a.impact === "high").length ? `  high_risk_assumptions: ${kata.assumption_risks.filter(a => a.impact === "high").map(a => a.description).join(" | ")}` : ""}
  target_condition: ${kata?.target_condition ?? "N/A"}
  coaching_memo: ${kata?.coaching_memo ?? "N/A"}

══ END OF PIPELINE SUMMARY ══════════════════════════════════════

Apply all five lenses from the firm's investment guidebook:
1. The Loop (Economic Potential + Technological Capability + Human Agency)
2. Superforecasting (Tetlock's 11 commandments)
3. Dunning-Kruger (calibration and known unknowns)
4. Hidden Champions (Simon's niche leader framework)
5. Kauffman / Adjacent Possible (nonergodic dynamics)

Be direct, critical, and specific. Reference actual numbers from the pipeline.
Identify real tensions — do not give a passing grade if the analysis has gaps.
The PM memo should tell the PM exactly what to think about before sizing the position.
Return the complete LensBoard JSON.
`.trim();

  const text = await llm.chat({
    model:       MODELS.sonnet,
    system:      SYSTEM_PROMPT,
    user:        userMessage,
    temperature: 0.2,
    max_tokens:  4000,
    json_mode:   true,
  });

  const board = JSON.parse(extractJSON(text)) as LensBoard;

  console.log(
    `[09] LENS — verdict: ${board.overall_verdict} | loop: ${board.loop.score} | sf: ${board.superforecasting.score} | dk: ${board.dunning_kruger.flag} | hc: ${board.hidden_champion.fit}`,
  );

  return board;
}
