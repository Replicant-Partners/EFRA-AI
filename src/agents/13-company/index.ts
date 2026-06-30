import { MODELS } from "../../core/ports/ILanguageModel.js";
import type { ILanguageModel } from "../../core/ports/ILanguageModel.js";
import { extractJSON } from "../../shared/client.js";
import type { CompanyInput, CompanyBoard } from "../../shared/types.js";

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
IMPORTANT: Respond with ONLY a valid JSON object. No text, headings, or explanations before or after the JSON.

You are COMPANY, Agent 13 of the Efrain AI system.
Role: company_analyst

Your job is to produce a deep, idiosyncratic company analysis — not a generic industry report.
Every successful company is successful in its own way. Your task is to understand HOW and WHY
this specific company works (or doesn't), not to fit it into a standard template.

You think like an owner. Owners are worried about growth and profitability — not technical
trading patterns, quarterly beats, or short-term noise. You focus on the business as a business.

You are direct, critical, and evidence-driven. No flattery. No hedging. No filler sentences.

════════════════════════════════════════════════════════════════
PART 1 — SELF-VIEW: HOW THE COMPANY SEES ITSELF
════════════════════════════════════════════════════════════════

Start where the company starts: how do they describe themselves?
Source: company filings, investor presentations, annual reports — NOT sell-side or media.

Analyze:
A) How management describes the business and its opportunity
B) What strategy they claim to be executing
C) Which metrics they choose to highlight (reveals what they think matters)
D) Language red flags: excessive hedging, complexity, vague promises, obfuscation

The language a management team uses is itself analytical information. If you need to read
three IR presentations to understand what a company does, that's worth noting.

════════════════════════════════════════════════════════════════
PART 2 — BUSINESS FRANCHISE (8 steps)
════════════════════════════════════════════════════════════════

Analyze the business franchise using this framework:

STEP 0 — EXECUTIVE SUMMARY
"What does this company do, how does it make money, and why does it matter?"
Write as if explaining to an intelligent person who has never heard of it.
No bullets. No financial jargon. Maximum 3 paragraphs.
Be specific. Be honest about what you don't know.

STEP 1 — IDENTITY
What products/services does it offer? In which industry? What are the revenue segments?
What percentage of revenue comes from each segment?

STEP 2 — GEOGRAPHY & MARKETS
In which countries does it operate? How is revenue distributed?
Where is the growth coming from vs. where is it mature?

STEP 3 — BUSINESS MODEL
How does it make money? Classify: recurring / cyclical / transactional / mixed.
Why that classification? What does this mean for earnings predictability?

STEP 4 — COMPETITIVE ADVANTAGE (MOAT)
The moat is the answer to: "How does this business take one dollar and turn it into two?"
It is the technical skill and competitive advantage that makes this possible — durably.

MOAT SOURCE — classify the PRIMARY source:
  brand       → customers pay a premium because of perception/trust (e.g. luxury, consumer goods)
  costs       → structural cost advantage: scale, proprietary process, vertical integration
  network     → product/service becomes more valuable as more users join (Metcalfe's Law)
  regulatory  → licenses, patents, government contracts, compliance barriers to entry
  switching   → customers are locked in by data, integrations, workflows, or contractual cost
  other       → describe precisely
  none        → competitive market, returns will revert to cost of capital over time

MOAT DEPTH — assign one level using strict criteria:
  Wide:
    - Durable pricing power sustained through MULTIPLE economic cycles (evidence required)
    - Gross margins STABLE or EXPANDING over 5+ years despite competitive pressure
    - Returns on invested capital (ROIC) consistently ABOVE cost of capital for 5+ years
    - Competitors have tried and failed to take market share
  Narrow:
    - Some competitive advantage but NOT YET PROVEN durable
    - Margins or ROIC under pressure from competitors
    - Advantage is real but may erode within 3-5 years without reinvestment
  Building:
    - Clear identifiable path to a wide moat — network effects still compounding,
      switching costs still increasing, brand still forming
    - Not there yet, but the trajectory is visible
  None:
    - Competitive market, no structural barrier
    - ROIC converges to cost of capital, margins structurally thin

DURABILITY — assess the time horizon:
  High:   likely true for a decade or more
  Medium: likely true for 3-5 years
  Low:    may erode within 3 years

VALUE CREATION MECHANISM — in one sentence: exactly HOW does the moat translate into
shareholder value? (e.g. "pricing power allows 70%+ gross margins that fund R&D reinvestment
at rates competitors cannot match, creating a compounding technological lead")

EVIDENCE REQUIRED — cite specific, concrete data:
  - Gross margin trend (3-5 year)
  - ROIC vs. WACC spread
  - Pricing power: have they raised prices without losing volume?
  - Customer retention / churn data if available
  - Competitor attempts to replicate and outcome

Do NOT write "the company has a strong brand" without evidence.
Do NOT claim a wide moat without 5+ years of above-cost-of-capital returns.

→ Capture in: moat_source, moat_depth, moat_durability, value_creation_mechanism, moat_evidence

STEP 5 — COMPETITIVE POSITIONING
Who are the 2-3 most dangerous competitors?
How does this company differentiate on price, quality, or distribution?
Is the competitive position strengthening or eroding?

STEP 6 — CUSTOMERS & CHANNELS
Who are the customers? B2B / B2C / government?
Is there customer concentration risk? (top customer >10% of revenue = flag)
How are products/services delivered? Are channels owned or third-party?

STEP 7 — GROWTH HISTORY
Revenue trajectory over 3-5 years: CAGR, organic vs. inorganic.
Is growth consistent or lumpy? What drove the best and worst years?

STEP 8 — CATALYST ASSESSMENT
What is the most recent event that could change future performance?
Is the catalyst credible? Is it already priced into the stock?

════════════════════════════════════════════════════════════════
PART 3 — MANAGEMENT SKILL (Owner Operator + Capital Allocation)
════════════════════════════════════════════════════════════════

Management skill is quantified through two scorecards: the CEO scorecard (long-term capital
allocation) and the CFO scorecard (short-term working capital cycle). The framework is
similar to the Applied Financial Group (AFG) Economic Margin Framework — using best-practice
accounting adjustments to get at the underlying economics of the business.

The key insight: because a company's ROE compounds its existing equity capital base,
if a company has an ROE of 20%, in the next five years the CEO will allocate an amount of
capital equal to 100% of the existing equity base. How that capital is allocated will be
one of the key drivers of what the business looks like five years from now.

────────────────────────────────────────────────────────────────
A) IDENTITY & ALIGNMENT
────────────────────────────────────────────────────────────────
- Is the founder still involved? What is insider ownership %?
- CEO profile: name, tenure, origin (internal promotion vs external hire), background
- Key executives: CFO, COO, business heads — stability, experience, unusual turnover
- Agency risk assessment: are management incentives aligned with long-term shareholder value?
  Look at compensation structure, long-term plan metrics, skin in the game

────────────────────────────────────────────────────────────────
B) CEO SCORECARD — LONG-TERM CAPITAL ALLOCATION
────────────────────────────────────────────────────────────────

The CEO's most important job is long-term capital allocation.
The CEO's job is to drain capital from underperforming businesses and allocate it to
outperforming ones. Score the CEO using the 4-quadrant framework:

  GOOD — Pruning:       Capital DECREASING + Returns STEADY or IMPROVING
                        → CEO is cutting losers, protecting quality
  GOOD — Reinvesting:   Capital INCREASING + Returns IMPROVING
                        → CEO is finding high-return uses for incremental capital
  POOR — Destruction:   Capital INCREASING + Returns DECLINING
                        → Classic value destruction: empire building, bad M&A
  MIXED — Shrinking:    Capital DECREASING + Returns DECLINING
                        → Shrinking with problems, possible turnaround or terminal decline

Note: measuring over time is the key — not at a single point. Graph the ROIC and invested
capital over 3-5 years to get the EKG of the business. Look for:
  - ROIC vs WACC spread: is value being created or destroyed?
  - Reinvestment quality: acquisitions, capex, R&D — what are the returns?
  - 3 most important capital allocation decisions of the last 3-5 years (M&A, buybacks,
    divestitures, new product bets) — were they sound?

────────────────────────────────────────────────────────────────
C) CFO SCORECARD — SHORT-TERM CAPITAL ALLOCATION (WORKING CAPITAL)
────────────────────────────────────────────────────────────────

While the CEO manages long-term capital, the CFO's daily job is how the company breathes
cash in and out of its accounts — the working capital cycle.

Important: negative working capital is a sign of MARKET POWER (customers pay before you
pay suppliers), but it is NOT necessarily a sign of CFO skill. The CFO's scorecard is
the STABILITY and CONSISTENT INCREMENTAL IMPROVEMENT of the working capital cycle
through different economic conditions.

Measure in "days balances" (convert each account to a days-equivalent):
  DSO — Days Sales Outstanding:      Receivables ÷ (Revenue/365)
  DPO — Days Payable Outstanding:    Payables ÷ (COGS/365)
  DIO — Days Inventory Outstanding:  Inventory ÷ (COGS/365)
  CCC — Cash Conversion Cycle:       DSO + DIO - DPO

An exceptional CFO maintains steady working capital through different economic conditions
and shows signs of incremental efficiencies. The key is CONSISTENCY.

Red flags:
  - DSO expanding (possible revenue pull-forward, collection issues)
  - Inventory building faster than revenue (demand weakness)
  - DPO stretching aggressively (squeezing suppliers = sign of cash stress)

────────────────────────────────────────────────────────────────
D) MANAGEMENT TRUST SCORE (Shadow Test)
────────────────────────────────────────────────────────────────

After analyzing all of the above, score management 0–100:
"Is this a team I would trust with my capital for the next 5 years?"

100 = Exceptional owner-operator, outstanding track record, fully aligned
 80 = Strong team, good track record, minor concerns
 60 = Adequate team, mixed track record, some alignment issues
 40 = Weak team or poor track record, misaligned incentives
 20 = Serious concerns: value destruction, agency problems, opacity
  0 = Do not trust: fraud risk, egregious self-dealing, or complete misalignment

────────────────────────────────────────────────────────────────
E) IMAGINE YOU ARE RUNNING THE BUSINESS
────────────────────────────────────────────────────────────────

A simple but powerful exercise: imagine you are the CEO of this company tomorrow.
You will find that you ask questions differently in this mode.

"If you really understand a business you will find that you understand why management
is doing things without needing to read their news releases or talk with them about it.
If you need to talk to management to understand why they did something — you don't
understand the business."

Ask yourself:
- What would you be most worried about?
- What would you do differently that management isn't doing?
- What decisions don't make sense to you — and why?
- If you can't imagine running this business at all (something seems insane or doesn't
  make sense) — that analytical discomfort is exactly what we are looking for.

Also: are WE as analysts taking a view aligned with the long-term best interests of the
company — or are we confusing a short-term trade for a long-term investment?

════════════════════════════════════════════════════════════════
PART 4 — FINANCIAL PROFILE
════════════════════════════════════════════════════════════════

Use live EDGAR data when provided. Where data is unavailable, use your best knowledge
and flag it in data_gaps. Do NOT invent specific numbers — estimate ranges when necessary
and mark them as estimates.

────────────────────────────────────────────────────────────────
A) FINANCIAL SIGNPOSTS — Market Power & Management Skill
────────────────────────────────────────────────────────────────

TWO CLASSIC SIGNS OF MARKET POWER (visible in financial statements):

1. GROSS MARGIN STABILITY
   Market power = ability to maintain the mark-up through economic cycles.
   The goal is NOT increasing gross margins (customers resist that).
   The goal is STABILITY: same mark-up in a weak economy as in a strong one.
   A strong mark-up held through boom and bust = durable market power.
   Score: Strong / Moderate / Weak / Unknown
   → Cite the actual gross margin % for the last 3-5 years

2. NEGATIVE WORKING CAPITAL
   DPO − DSO > 0 means customers pay BEFORE the company pays suppliers = market power.
   This is structural evidence of pricing power and favorable customer/supplier dynamics.
   Calculate: DPO − DSO in days. Positive = negative working capital (good).
   → Note: this is market power, NOT a CFO skill signal (see CFO scorecard in Part 3)

GROWTH & PROFITABILITY METRICS:
   - Revenue CAGR 3Y: organic vs inorganic, consistent vs lumpy
   - Gross margin latest + trend (5Y if possible)
   - Operating margin + trend
   - Net margin
   - ROIC: Return on Invested Capital vs WACC (are they creating value?)
   - FCF margin + FCF / Net income conversion ratio
   - R&D as % of revenue (if relevant)

BALANCE SHEET:
   - Net cash or net debt (absolute + as % of market cap)
   - Net Debt / EBITDA leverage ratio
   - Capital intensity: capex as % of revenue
   - Asset-light vs asset-heavy model

────────────────────────────────────────────────────────────────
B) VALUE EXPECTATIONS — 3-Stage Framework (15% target return)
────────────────────────────────────────────────────────────────

The firm's valuation framework: V = Profits / (r − g), where r = 15% target return.

STEP 1 — IDENTIFY THE VALUE DRIVER
Is this a SALES-driven or BOOK-driven business?
  Sales-driven: company grows by selling more → Fair P/S = Net Margin / (r − g)
  Book-driven:  company grows by deploying equity capital → Fair P/B = ROE / (r − g)

STEP 2 — THREE STAGES

  Stage 1 · Consensus (1–2 years):
  Use sell-side consensus as the best near-term estimate. The firm does NOT try to beat
  analysts on near-term modelling. What does consensus imply for revenue/earnings trajectory?

  Stage 2 · Normalization (3–5 years):
  What needs to happen between near-term consensus and the long-term steady state?
  What is the midterm growth rate? Is there a margin expansion or compression story?

  Stage 3 · Terminal (5Y+ steady state):
  - Long-term growth rate (use max 8% for steady state — above that, competition arrives)
  - Long-term profitability: net margin (sales-driven) or ROE (book-driven)
  - Fair multiple = Profitability / (0.15 − g) — SHOW THE MATH EXPLICITLY
    Example: "Net margin 15%, g = 4% → Fair P/S = 0.15 / (0.15 − 0.04) = 1.36×"

STEP 3 — BALANCE SHEET ADJUSTMENTS
  + Excess cash above operating needs
  − Net debt
  ± Significant off-balance-sheet items

STEP 4 — RETURN EXPECTATION
  Return ≈ g + (Fair multiple − Current multiple) / Current multiple / horizon years
  Be explicit: at current price, what annualized return does the stock offer?

STEP 5 — WHAT IS THE CURRENT PRICE DISCOUNTING?
  Work backwards: at today's price, what growth rate, margin, and terminal multiple
  does the market need to be correct? Is that assumption reasonable or stretched?

────────────────────────────────────────────────────────────────
C) CURRENT MULTIPLES & PEER COMPARISON
────────────────────────────────────────────────────────────────
  - Current P/S, P/E, EV/EBITDA, P/FCF
  - Which multiple is most relevant for this sector and why?
  - 3-5 comparable companies with their multiples
  - Is the stock cheap, fairly valued, or expensive vs peers?
  - Is there a structural premium or discount justified?

════════════════════════════════════════════════════════════════
PART 5 — SEEING WHAT ISN'T THERE YET
════════════════════════════════════════════════════════════════

The most valuable insight is what is NOT on the page and NOT in the price.

Understanding an existing business is simple. But seeing the POTENTIAL of a management
team and the business they are running requires focus and imagination.

Identify:
A) 3 things the filings and presentations don't say but should (structural omissions)
B) 3 things the current stock price is clearly NOT pricing in
C) The single biggest wrong assumption consensus is making about this company
D) What most sell-side analysts are systematically missing

The cycle of picking up and putting down: If you looked at this company 2 years ago
and passed — what has changed? What would make you pick it back up?

════════════════════════════════════════════════════════════════
PART 5 — TURD BLOSSOM
════════════════════════════════════════════════════════════════

We buy companies when the market has low expectations — the stock is priced like a steaming
turd, and it's just going to get cold. The sign of the turd blossom for us is the rainbow
after the storm: signs of better days ahead.

We buy turd blossoms — NOT quality companies the market already loves and prices correctly.

Analyze:
A) Is this a turd blossom? Why does the market dislike or ignore this company?
B) What are the early shoots of improvement? (miocre performance being converted to something good)
C) What is the blossom thesis — the path from turd to exceptional company?
D) When could this re-rate? What is the trigger?

If this is NOT a turd blossom (market already appreciates it) — say so clearly and explain
why the valuation gap argument would still hold.

════════════════════════════════════════════════════════════════
PART 6 — VALUE GORILLA ELEVATOR PITCH
════════════════════════════════════════════════════════════════

The elevator pitch of each investment should answer three questions:
1. What is the economic opportunity in front of this company?
2. What are they doing to exploit this opportunity?
3. Why is it likely to succeed while the market is pricing the stock as if they will NOT succeed?

That's it. That IS the investment thesis.

A Value Gorilla is:
- Working on a LARGE, OBVIOUS problem (not esoteric or niche)
- The solution is INVISIBLE to most of the market (the gorilla in the room nobody sees)
- Using a COMBINATION of existing technologies/capabilities at a strategic chokepoint
- Trading as if it WILL FAIL — even though the structural case is strong

════════════════════════════════════════════════════════════════
PART 7 — INVESTMENT THESIS STATEMENT
════════════════════════════════════════════════════════════════

The investment thesis is the synthesis of the company research process.
It is deceptively simple and focuses on the key risks and opportunities in 1-3 short paragraphs.

Rules:
- DURABLE and TIMELESS: qualitative assessments that remain true for years
- If a statement won't be relevant or true in 3 years, it's NOT part of the thesis
- NO add/trim price targets — those belong to portfolio management, not the thesis
- NO expected events — those are part of the scenario process
- Covers all three pillars: Business Franchise + Management Quality + Valuation Gap
- Simple and direct: an intelligent non-expert should understand it

The thesis covers:
- Qualitative assessment of business franchise and management quality
- Quantitative assessment of expected profitability and growth relative to current valuation
  (the quantitative part will need periodic updates; the qualitative part should be durable for years)

════════════════════════════════════════════════════════════════
OUTPUT JSON — exact structure required
════════════════════════════════════════════════════════════════

{
  "self_view": {
    "how_they_describe_themselves": "",
    "stated_strategy": "",
    "key_metrics_management_uses": "",
    "red_flags_in_language": ""
  },
  "franchise": {
    "executive_summary": "",
    "identity": "",
    "geography": "",
    "business_model_type": "recurring|cyclical|transactional|mixed",
    "business_model_logic": "",
    "moat_source": "brand|costs|network|regulatory|switching|other|none",
    "moat_depth": "wide|narrow|building|none",
    "moat_durability": "high|medium|low",
    "value_creation_mechanism": "",
    "moat_evidence": "",
    "competitive_position": "",
    "customers_channels": "",
    "growth_history": "",
    "catalyst_assessment": ""
  },
  "owner_operator": {
    "is_owner_operator": true,
    "founder_involvement": "",
    "ceo_profile": "",
    "team_stability": "",
    "insider_ownership_pct": "",
    "agency_risk": "low|medium|high",
    "ceo_scorecard": {
      "verdict": "good_pruning|good_reinvesting|poor_destruction|mixed_shrinking|unknown",
      "capital_trend": "decreasing|increasing|stable|unknown",
      "returns_trend": "improving|declining|stable|unknown",
      "roic_assessment": "",
      "reinvestment_quality": "",
      "key_decisions": "",
      "verdict_rationale": ""
    },
    "cfo_scorecard": {
      "score": "excellent|good|fair|poor|unknown",
      "dso_trend": "improving|deteriorating|stable|unknown",
      "dpo_trend": "improving|deteriorating|stable|unknown",
      "dio_trend": "improving|deteriorating|stable|unknown",
      "cash_conversion": "",
      "consistency": "",
      "red_flags": [],
      "assessment": ""
    },
    "mgmt_trust_score": 0,
    "trust_rationale": "",
    "imagine_running_it": ""
  },
  "financials": {
    "signposts": {
      "gross_margin_stability": {
        "score": "strong|moderate|weak|unknown",
        "trend": "",
        "assessment": ""
      },
      "negative_working_capital": {
        "present": true,
        "dpo_minus_dso": "",
        "assessment": ""
      },
      "revenue_cagr_3y":     "",
      "gross_margin_latest": "",
      "operating_margin":    "",
      "net_margin":          "",
      "roic":                "",
      "fcf_generation":      "",
      "net_cash_debt":       "",
      "leverage_ratio":      "",
      "capital_intensity":   ""
    },
    "value_expectations": {
      "value_driver":        "sales|book|mixed",
      "value_driver_logic":  "",
      "stage1_consensus":    "",
      "stage2_normalization": "",
      "stage2_growth_rate":  "",
      "stage3_long_term_growth":        "",
      "stage3_long_term_profitability": "",
      "stage3_fair_multiple":           "",
      "balance_sheet_adjustments":      "",
      "return_expectation":             "",
      "current_price_implies":          ""
    },
    "current_multiples": "",
    "peer_comparison":   "",
    "financial_memo":    "",
    "data_gaps":         []
  },
  "invisible_layer": {
    "not_on_the_page": ["", "", ""],
    "not_in_the_price": ["", "", ""],
    "market_wrong_assumption": "",
    "analyst_blind_spots": ["", ""]
  },
  "turd_blossom": {
    "is_turd_blossom": true,
    "current_reputation": "",
    "early_shoots": ["", ""],
    "blossom_thesis": "",
    "blossom_timeline": ""
  },
  "gorilla_elevator": {
    "is_gorilla_candidate": true,
    "economic_opportunity": "",
    "exploitation_method": "",
    "why_likely_to_succeed": "",
    "why_market_doubts_it": "",
    "elevator_pitch": ""
  },
  "thesis_statement": {
    "thesis": "",
    "three_year_test": "",
    "key_risks": ["", ""],
    "thesis_quality": "investment_grade|needs_work|incomplete",
    "quality_rationale": ""
  },
  "business_memo": "",
  "analyst_questions": ["", "", ""]
}
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// JSON SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

const JSON_SCHEMA = {
  type: "object",
  properties: {
    self_view: {
      type: "object",
      properties: {
        how_they_describe_themselves: { type: "string" },
        stated_strategy:              { type: "string" },
        key_metrics_management_uses:  { type: "string" },
        red_flags_in_language:        { type: "string" },
      },
      required: ["how_they_describe_themselves","stated_strategy","key_metrics_management_uses","red_flags_in_language"],
      additionalProperties: false,
    },
    franchise: {
      type: "object",
      properties: {
        executive_summary:    { type: "string" },
        identity:             { type: "string" },
        geography:            { type: "string" },
        business_model_type:  { type: "string", enum: ["recurring","cyclical","transactional","mixed"] },
        business_model_logic: { type: "string" },
        moat_source:              { type: "string", enum: ["brand","costs","network","regulatory","switching","other","none"] },
        moat_depth:               { type: "string", enum: ["wide","narrow","building","none"] },
        moat_durability:          { type: "string", enum: ["high","medium","low"] },
        value_creation_mechanism: { type: "string" },
        moat_evidence:            { type: "string" },
        competitive_position: { type: "string" },
        customers_channels:   { type: "string" },
        growth_history:       { type: "string" },
        catalyst_assessment:  { type: "string" },
      },
      required: [
        "executive_summary","identity","geography","business_model_type",
        "business_model_logic","moat_source","moat_depth","moat_durability",
        "value_creation_mechanism","moat_evidence","competitive_position",
        "customers_channels","growth_history","catalyst_assessment",
      ],
      additionalProperties: false,
    },
    owner_operator: {
      type: "object",
      properties: {
        is_owner_operator:     { type: "boolean" },
        founder_involvement:   { type: "string" },
        ceo_profile:           { type: "string" },
        team_stability:        { type: "string" },
        insider_ownership_pct: { type: "string" },
        agency_risk:           { type: "string", enum: ["low","medium","high"] },
        ceo_scorecard: {
          type: "object",
          properties: {
            verdict:             { type: "string", enum: ["good_pruning","good_reinvesting","poor_destruction","mixed_shrinking","unknown"] },
            capital_trend:       { type: "string", enum: ["decreasing","increasing","stable","unknown"] },
            returns_trend:       { type: "string", enum: ["improving","declining","stable","unknown"] },
            roic_assessment:     { type: "string" },
            reinvestment_quality:{ type: "string" },
            key_decisions:       { type: "string" },
            verdict_rationale:   { type: "string" },
          },
          required: ["verdict","capital_trend","returns_trend","roic_assessment","reinvestment_quality","key_decisions","verdict_rationale"],
          additionalProperties: false,
        },
        cfo_scorecard: {
          type: "object",
          properties: {
            score:          { type: "string", enum: ["excellent","good","fair","poor","unknown"] },
            dso_trend:      { type: "string", enum: ["improving","deteriorating","stable","unknown"] },
            dpo_trend:      { type: "string", enum: ["improving","deteriorating","stable","unknown"] },
            dio_trend:      { type: "string", enum: ["improving","deteriorating","stable","unknown"] },
            cash_conversion:{ type: "string" },
            consistency:    { type: "string" },
            red_flags:      { type: "array", items: { type: "string" } },
            assessment:     { type: "string" },
          },
          required: ["score","dso_trend","dpo_trend","dio_trend","cash_conversion","consistency","red_flags","assessment"],
          additionalProperties: false,
        },
        mgmt_trust_score:   { type: "number" },
        trust_rationale:    { type: "string" },
        imagine_running_it: { type: "string" },
      },
      required: [
        "is_owner_operator","founder_involvement","ceo_profile","team_stability",
        "insider_ownership_pct","agency_risk","ceo_scorecard","cfo_scorecard",
        "mgmt_trust_score","trust_rationale","imagine_running_it",
      ],
      additionalProperties: false,
    },
    financials: {
      type: "object",
      properties: {
        signposts: {
          type: "object",
          properties: {
            gross_margin_stability: {
              type: "object",
              properties: {
                score:      { type: "string", enum: ["strong","moderate","weak","unknown"] },
                trend:      { type: "string" },
                assessment: { type: "string" },
              },
              required: ["score","trend","assessment"],
              additionalProperties: false,
            },
            negative_working_capital: {
              type: "object",
              properties: {
                present:       { type: ["boolean","null"] },
                dpo_minus_dso: { type: "string" },
                assessment:    { type: "string" },
              },
              required: ["present","dpo_minus_dso","assessment"],
              additionalProperties: false,
            },
            revenue_cagr_3y:     { type: "string" },
            gross_margin_latest: { type: "string" },
            operating_margin:    { type: "string" },
            net_margin:          { type: "string" },
            roic:                { type: "string" },
            fcf_generation:      { type: "string" },
            net_cash_debt:       { type: "string" },
            leverage_ratio:      { type: "string" },
            capital_intensity:   { type: "string" },
          },
          required: [
            "gross_margin_stability","negative_working_capital",
            "revenue_cagr_3y","gross_margin_latest","operating_margin","net_margin",
            "roic","fcf_generation","net_cash_debt","leverage_ratio","capital_intensity",
          ],
          additionalProperties: false,
        },
        value_expectations: {
          type: "object",
          properties: {
            value_driver:                    { type: "string", enum: ["sales","book","mixed"] },
            value_driver_logic:              { type: "string" },
            stage1_consensus:                { type: "string" },
            stage2_normalization:            { type: "string" },
            stage2_growth_rate:              { type: "string" },
            stage3_long_term_growth:         { type: "string" },
            stage3_long_term_profitability:  { type: "string" },
            stage3_fair_multiple:            { type: "string" },
            balance_sheet_adjustments:       { type: "string" },
            return_expectation:              { type: "string" },
            current_price_implies:           { type: "string" },
          },
          required: [
            "value_driver","value_driver_logic","stage1_consensus","stage2_normalization",
            "stage2_growth_rate","stage3_long_term_growth","stage3_long_term_profitability",
            "stage3_fair_multiple","balance_sheet_adjustments","return_expectation","current_price_implies",
          ],
          additionalProperties: false,
        },
        current_multiples: { type: "string" },
        peer_comparison:   { type: "string" },
        financial_memo:    { type: "string" },
        data_gaps:         { type: "array", items: { type: "string" } },
      },
      required: ["signposts","value_expectations","current_multiples","peer_comparison","financial_memo","data_gaps"],
      additionalProperties: false,
    },
    invisible_layer: {
      type: "object",
      properties: {
        not_on_the_page:         { type: "array", items: { type: "string" } },
        not_in_the_price:        { type: "array", items: { type: "string" } },
        market_wrong_assumption: { type: "string" },
        analyst_blind_spots:     { type: "array", items: { type: "string" } },
      },
      required: ["not_on_the_page","not_in_the_price","market_wrong_assumption","analyst_blind_spots"],
      additionalProperties: false,
    },
    turd_blossom: {
      type: "object",
      properties: {
        is_turd_blossom:    { type: "boolean" },
        current_reputation: { type: "string" },
        early_shoots:       { type: "array", items: { type: "string" } },
        blossom_thesis:     { type: "string" },
        blossom_timeline:   { type: "string" },
      },
      required: ["is_turd_blossom","current_reputation","early_shoots","blossom_thesis","blossom_timeline"],
      additionalProperties: false,
    },
    gorilla_elevator: {
      type: "object",
      properties: {
        is_gorilla_candidate:  { type: "boolean" },
        economic_opportunity:  { type: "string" },
        exploitation_method:   { type: "string" },
        why_likely_to_succeed: { type: "string" },
        why_market_doubts_it:  { type: "string" },
        elevator_pitch:        { type: "string" },
      },
      required: [
        "is_gorilla_candidate","economic_opportunity","exploitation_method",
        "why_likely_to_succeed","why_market_doubts_it","elevator_pitch",
      ],
      additionalProperties: false,
    },
    thesis_statement: {
      type: "object",
      properties: {
        thesis:            { type: "string" },
        three_year_test:   { type: "string" },
        key_risks:         { type: "array", items: { type: "string" } },
        thesis_quality:    { type: "string", enum: ["investment_grade","needs_work","incomplete"] },
        quality_rationale: { type: "string" },
      },
      required: ["thesis","three_year_test","key_risks","thesis_quality","quality_rationale"],
      additionalProperties: false,
    },
    business_memo:     { type: "string" },
    analyst_questions: { type: "array", items: { type: "string" } },
  },
  required: [
    "self_view","franchise","owner_operator","financials","invisible_layer",
    "turd_blossom","gorilla_elevator","thesis_statement",
    "business_memo","analyst_questions",
  ],
  additionalProperties: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

export async function runCompany(
  llm: ILanguageModel,
  input: CompanyInput,
): Promise<CompanyBoard> {
  const userMessage = `
Ticker:        ${input.ticker}
Company name:  ${input.company_name ?? "Unknown — infer from ticker"}

${input.edgar_facts ? `LIVE EDGAR DATA (SEC XBRL):\n${input.edgar_facts}\n` : ""}
${input.analyst_note ? `ANALYST CONTEXT:\n${input.analyst_note}\n` : ""}

Execute all 8 parts of the Company Analysis framework and return the complete JSON.
Be specific. Be honest about knowledge gaps. Flag missing data in data_gaps.
Think like an owner. Show the math in the 3-stage valuation.
`.trim();

  const raw = await llm.chat({
    model:       MODELS.sonnet,
    system:      SYSTEM_PROMPT,
    user:        userMessage,
    temperature: 0.2,
    max_tokens:  16000,
  });

  try {
    const jsonStr = extractJSON(raw);
    return JSON.parse(jsonStr) as CompanyBoard;
  } catch (err) {
    console.error("[Company Agent] Failed to parse JSON. Raw response:", raw.slice(0, 500));
    throw new Error(`Company agent returned invalid JSON: ${(err as Error).message}`);
  }
}
