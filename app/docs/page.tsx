import Link from "next/link";

// ─── Reusable layout primitives ────────────────────────────────────────────

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="pt-10 first:pt-0">
      {children}
      <hr className="mt-10 border-[#EDE7E0]" />
    </section>
  );
}

function AgentHeader({ num, name, role }: { num: string; name: string; role: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-baseline gap-3">
        <span className="text-[10px] font-semibold tracking-[0.18em] text-[#C0B8AC] uppercase">{num}</span>
        <h2 className="text-base font-bold tracking-widest text-[#C8804A] uppercase">{name}</h2>
      </div>
      <p className="mt-1 text-[11px] text-[#A89E94] tracking-wide">{role}</p>
    </div>
  );
}

function Field({ name, type, children }: { name: string; type?: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2 border-b border-[#F0EBE4]">
      <div className="w-44 flex-shrink-0">
        <span className="font-mono text-[11px] text-[#6E6258]">{name}</span>
        {type && <span className="ml-1.5 text-[9px] text-[#C0B8AC] tracking-wider">{type}</span>}
      </div>
      <div className="text-[11px] text-[#8C7E70] leading-relaxed">{children}</div>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="text-[9px] font-semibold tracking-[0.14em] text-[#C0B8AC] uppercase mb-2">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 pl-3 border-l-2 border-[#D8D0C8] text-[11px] text-[#A89E94] leading-relaxed italic">
      {children}
    </div>
  );
}

function Tag({ color, children }: { color: "orange" | "green" | "red" | "amber" | "gray"; children: React.ReactNode }) {
  const cls =
    color === "orange" ? "text-[#C8804A] bg-[#C8804A]/8" :
    color === "green"  ? "text-[#7A9E6A] bg-[#7A9E6A]/8" :
    color === "red"    ? "text-[#C84848] bg-[#C84848]/8" :
    color === "amber"  ? "text-[#C89040] bg-[#C89040]/8" :
                         "text-[#8C7E70] bg-[#8C7E70]/8";
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold mr-1 ${cls}`}>
      {children}
    </span>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function DocsPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">

      {/* ── Top nav ── */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <div className="text-[10px] tracking-[0.18em] text-[#C0B8AC] uppercase mb-0.5">Efrain AI</div>
          <h1 className="text-lg font-bold text-[#1E1A14] tracking-widest uppercase">Pipeline Guide</h1>
        </div>
        <Link href="/" className="text-xs text-[#A89E94] hover:text-[#C8804A] transition-colors">
          ← Back
        </Link>
      </div>

      {/* ── Quick nav ── */}
      <div className="mb-10 p-4 bg-[#F5F0EB] rounded text-[11px] space-y-1">
        <div className="text-[9px] font-semibold tracking-[0.14em] text-[#C0B8AC] uppercase mb-2">Contents</div>
        {[
          ["#overview",       "Pipeline Overview"],
          ["#scout",          "01 · Scout"],
          ["#intel",          "02 · Intel"],
          ["#forensic-pre",   "03 · Forensic — Pre-screen"],
          ["#cf",             "04 · Critical Factor"],
          ["#forensic-full",  "05 · Forensic — Full Scan"],
          ["#valuation",      "06 · Valuation"],
          ["#kata",           "07 · Kata"],
          ["#communication",  "08 · Communication"],
          ["#lens",           "09 · Lens"],
          ["#modes",          "Modes: Valentine · Gunn · Dual"],
          ["#concepts",       "Key Concepts"],
          ["#architecture",   "Architecture: Ports & Adapters"],
        ].map(([href, label]) => (
          <div key={href}>
            <a href={href} className="text-[#8C7E70] hover:text-[#C8804A] transition-colors">{label}</a>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section id="overview">
        <h2 className="text-base font-bold tracking-widest text-[#1E1A14] uppercase mb-4">Pipeline Overview</h2>
        <p className="prose-tufte">
          Efrain AI is a 9-agent pipeline that takes a stock idea (ticker + catalyst) and
          produces a research note with a price target, rating, and publication decision.
          Each agent runs sequentially — the output of one feeds the next.
        </p>

        <div className="mt-6 space-y-2">
          {[
            ["01", "SCOUT",          "Is this idea worth covering? Scores alpha and decides to continue or drop."],
            ["02", "INTEL",          "Understands the business and gathers news. Checks for MNPI compliance."],
            ["03", "FORENSIC",       "Quick risk scan: 10-K filings, going concern, SEC investigations."],
            ["04", "CRITICAL FACTOR","Identifies the 2–4 things that matter most. Builds Bull/Base/Bear scenarios."],
            ["05", "FORENSIC",       "Full audit: accruals, insider transactions, governance, management quality."],
            ["06", "VALUATION",      "8-step price target analysis. Applies forensic adjustments."],
            ["07", "KATA",           "Toyota Improvement Kata coach. Audits the research process before publication."],
            ["08", "COMMUNICATION",  "ENTER gate check. Drafts and publishes the research note."],
            ["09", "LENS",           "Consistency auditor. Applies the firm's five intellectual frameworks to the analysis."],
          ].map(([num, name, desc]) => (
            <div key={num} className="flex gap-3 text-[11px]">
              <span className="text-[#C0B8AC] font-mono w-5 flex-shrink-0">{num}</span>
              <span className="text-[#C8804A] font-semibold w-32 flex-shrink-0 tracking-wider">{name}</span>
              <span className="text-[#8C7E70]">{desc}</span>
            </div>
          ))}
        </div>

        <Note>
          If Scout decides DROP, the pipeline stops immediately. If Forensic Pre-screen returns
          BLOCK, the pipeline drops the idea. If the ENTER gate scores below 3/5, publication
          is dropped. Kata and Lens never block — they are coaching and auditing steps, not gates.
        </Note>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section id="scout">
        <AgentHeader num="Agent 01" name="Scout" role="Coverage Universe Optimizer — the first and cheapest filter" />

        <p className="prose-tufte">
          Scout decides whether an idea is worth the cost of running the full 6-agent pipeline.
          It scores the alpha potential across 4 dimensions and assigns a downstream mode and horizon.
        </p>

        <Block label="Alpha Score — 4 dimensions (max 100)">
          <Field name="coverage_gap_score" type="0–25">
            How underserved is analyst coverage? More gap = more alpha opportunity.
          </Field>
          <Field name="market_cap_fit" type="0–20">
            Does the market cap fit Efrain's sweet spot? Mid-cap emerging markets score highest.
          </Field>
          <Field name="sector_relevance" type="0–25">
            Is the sector currently in focus? Cyclical timing and macro tailwinds matter.
          </Field>
          <Field name="valuation_anomaly" type="0–30">
            Is there a visible mispricing signal? Discount to intrinsic value, peers, or history.
          </Field>
          <Field name="gunn_bonus" type="0–25">
            Extra points in Gunn mode: EM GDP exposure (+10), Bessembinder candidate (+10),
            low-coverage bonus (+5).
          </Field>
        </Block>

        <Block label="Decision">
          <Field name="MUST_COVER"><Tag color="orange">MUST_COVER</Tag> Score ≥ 65. Pipeline continues.</Field>
          <Field name="REVIEW_ZONE"><Tag color="amber">REVIEW_ZONE</Tag> Score 45–64. Analyst reviews before continuing.</Field>
          <Field name="DROP"><Tag color="red">DROP</Tag> Score &lt; 45. Pipeline stops. Optionally rescreens after a date.</Field>
        </Block>

        <Block label="Horizon Tags">
          <Field name="SHORT">Event expected within 3–6 months. Valentine-type catalyst.</Field>
          <Field name="MEDIUM">Event expected 6–18 months out.</Field>
          <Field name="COMPOUNDER">Long-duration thesis. Gunn-type compounding story.</Field>
        </Block>

        <Note>
          The alpha score is the model's best estimate given publicly available information.
          It is directional, not precise — a score of 72 vs 68 is not meaningful.
          The decision threshold matters, not the exact score.
        </Note>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section id="intel">
        <AgentHeader num="Agent 02" name="Intel" role="Information Hub — business analysis + news mosaic" />

        <p className="prose-tufte">
          Intel has two jobs: understand the business deeply, and surface relevant news.
          It also performs a compliance check to make sure no Material Non-Public Information
          (MNPI) is in the mosaic before the pipeline continues.
        </p>

        <Block label="Business Context">
          <Field name="business_memo">
            200-word investment memo paragraph. Plain language — what the company does,
            how it makes money, and why it matters to an investor.
          </Field>
          <Field name="moat_type">
            Competitive advantage type:{" "}
            <span className="text-[#6E6258]">brand</span>,{" "}
            <span className="text-[#6E6258]">costs</span>,{" "}
            <span className="text-[#6E6258]">network</span>,{" "}
            <span className="text-[#6E6258]">regulation</span>,{" "}
            <span className="text-[#6E6258]">other</span>.
            A moat protects the company's margins from competition.
          </Field>
          <Field name="moat_evidence">Concrete evidence for the moat (e.g. gross margin vs peers, retention rates).</Field>
          <Field name="growth_trend">Is revenue growth accelerating, decelerating, or consistent? One sentence.</Field>
          <Field name="catalyst_assessment">Is the submitted catalyst real and not yet priced in?</Field>
          <Field name="analyst_briefing">3–4 sentences the analyst must know before reading the rest of the analysis.</Field>
        </Block>

        <Block label="News Mosaic">
          <Field name="news_items">
            Up to 10 news items surfaced from three sources:{" "}
            <Tag color="gray">API</Tag> public news,{" "}
            <Tag color="amber">SEC</Tag> EDGAR filings,{" "}
            <Tag color="green">CRM</Tag> internal contacts.
            Each item has a relevance score and a one-sentence summary of why it matters for the thesis.
          </Field>
          <Field name="surfaced_count">Items passed the relevance threshold.</Field>
          <Field name="suppressed_count">Items filtered out as noise or duplicate.</Field>
          <Field name="mgmt_comm_score" type="0–100">
            Quality of management communication. High score = clear, consistent, credible.
            Low score = vague, changing narrative, or contradictory statements.
          </Field>
        </Block>

        <Block label="Mosaic Compliance">
          <Field name="mosaic_clear">
            <Tag color="orange">clear</Tag> All sources are public — pipeline continues.{" "}
            <Tag color="red">halt</Tag> A signal resembles MNPI — pipeline stops immediately.
            Publication is blocked regardless of any other score.
          </Field>
        </Block>

        <Note>
          Mosaic theory: it is legal to combine many pieces of public information to form a thesis,
          even if each piece alone is insignificant. What is illegal is using a single piece of
          material non-public information. The halt flag is conservative by design — false positives
          are preferable to compliance violations.
        </Note>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section id="forensic-pre">
        <AgentHeader num="Agent 03" name="Forensic — Pre-screen" role="Quick risk filter before heavy analysis begins" />

        <p className="prose-tufte">
          A fast, cheap scan to catch obvious red flags before committing to the full pipeline.
          If this returns BLOCK, the pipeline drops the idea immediately.
        </p>

        <Block label="What it checks (Quick Scan)">
          <Field name="10-K delay">Has the annual filing been delayed? A red flag for internal control issues.</Field>
          <Field name="Going concern">Does the auditor's report include going concern language?</Field>
          <Field name="SEC investigation">Any recent SEC enforcement actions or Wells notices?</Field>
        </Block>

        <Block label="Outputs">
          <Field name="risk_score" type="0–100">Composite risk score. Above 75 triggers CONDITIONAL or BLOCK.</Field>
          <Field name="mgmt_trust_score" type="0–100">Initial management credibility score based on public signals.</Field>
          <Field name="flags">List of identified issues, each with a severity level (SEV 1–5).</Field>
          <Field name="eps_haircut_total">Cumulative EPS reduction to apply in valuation (e.g. 0.05 = cut EPS by 5%).</Field>
          <Field name="dr_add_bps_total">Basis points to add to the WACC discount rate (e.g. 75 = +0.75%).</Field>
          <Field name="recommendation">
            <Tag color="green">CLEAR</Tag> No material issues.{" "}
            <Tag color="amber">CONDITIONAL</Tag> Issues present but not disqualifying.{" "}
            <Tag color="red">BLOCK</Tag> Fraud signal detected — pipeline stops, rating forced to UNDERPERFORM.
          </Field>
        </Block>

        <Block label="Severity Levels">
          {[
            ["SEV-5", "red",    "Fraud signal",     "−30% EPS haircut, +300bps WACC → BLOCK"],
            ["SEV-4", "red",    "Going concern",    "−20% EPS haircut, +200bps WACC → CONDITIONAL"],
            ["SEV-3", "amber",  "Governance issue", "−10% EPS haircut, +150bps WACC → CONDITIONAL"],
            ["SEV-2", "amber",  "DSO expansion",    "−5% EPS haircut, +75bps WACC → CLEAR"],
            ["SEV-1", "gray",   "Minor flag",       "No haircut, +25bps WACC → CLEAR"],
          ].map(([sev, color, name, impact]) => (
            <div key={sev} className="flex gap-3 py-1.5 border-b border-[#F0EBE4] text-[11px]">
              <Tag color={color as "red" | "amber" | "gray"}>{sev}</Tag>
              <span className="text-[#6E6258] w-32">{name}</span>
              <span className="text-[#A89E94]">{impact}</span>
            </div>
          ))}
        </Block>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section id="cf">
        <AgentHeader num="Agent 04" name="Critical Factor" role="Thesis Engine — what matters most and what could go wrong" />

        <p className="prose-tufte">
          Critical Factor is the heart of the analytical process. It strips the thesis
          down to 2–4 factors that will determine whether the investment succeeds, then
          builds three probability-weighted price scenarios around them.
        </p>

        <Block label="Critical Factors">
          <Field name="description">What the factor is — concrete and observable (e.g. "GPU shipment cadence vs hyperscaler capex").</Field>
          <Field name="eps_impact_pct">
            How much this factor could move EPS. Minimum threshold: &gt;5% for Valentine mode,
            &gt;4% for Gunn mode. If no factors exceed 3%, the output is empty and expected_value_pt = 0.
          </Field>
        </Block>

        <Block label="Scenarios">
          <Field name="Bull / Base / Bear">Three scenarios that must cover the realistic outcome space. Probabilities must sum to exactly 1.0.</Field>
          <Field name="implied_pt">Price target for this scenario.</Field>
          <Field name="price_derivation">
            The exact math: e.g. <span className="font-mono text-[#6E6258]">EPS $2.50 × P/E 74x = $185</span>.
            Makes the target auditable and reproducible.
          </Field>
          <Field name="triggers">
            Real-world conditions that must occur for this scenario to materialize
            (e.g. "No China export restrictions + hyperscaler capex +20% YoY").
            These are the things to monitor after publication.
          </Field>
          <Field name="expected_value_pt">
            Probability-weighted average: <span className="font-mono text-[#6E6258]">30%×$185 + 50%×$148 + 20%×$95 = $148</span>.
            This becomes the anchor for the valuation agent.
          </Field>
        </Block>

        <Block label="Gunn Mode: Build-to-Last Score">
          <Field name="management" type="0–33">Quality and alignment of the management team.</Field>
          <Field name="tam" type="0–33">Total addressable market — size and growth potential.</Field>
          <Field name="moat" type="0–34">Durability of the competitive advantage over 5–20 years.</Field>
          <Field name="total" type="0–100">Sum of the three. Used by Valuation to calculate IC Premium.</Field>
        </Block>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section id="forensic-full">
        <AgentHeader num="Agent 05" name="Forensic — Full Scan" role="Deep forensic audit + 5-step management analysis" />

        <p className="prose-tufte">
          The full forensic scan runs a comprehensive accounting and governance review,
          plus a structured 5-step assessment of the management team. This is the most
          expensive agent in the pipeline — it runs only after the thesis has been validated.
        </p>

        <Block label="What it checks (Full Scan)">
          <Field name="Accrual ratio">Non-cash earnings vs cash earnings. High accruals can signal earnings manipulation.</Field>
          <Field name="DSO trend">Days Sales Outstanding — expanding DSO can mean revenue pull-forward or collection problems.</Field>
          <Field name="Auditor quality">Big-4 vs non-Big-4, auditor changes, qualified opinions.</Field>
          <Field name="Insider transactions">Unusual buying or selling in the last 30 days.</Field>
          <Field name="Governance">Board independence, related-party transactions, dilution history.</Field>
          <Field name="Shadow Test (3Y)">Did management deliver on what they promised 3 years ago?</Field>
        </Block>

        <Block label="Management Profile — 5 Steps">
          <Field name="founder_profile">Who founded the company? Are they still involved? What % do they own?</Field>
          <Field name="ceo_profile">Current CEO tenure, background, whether promoted internally or hired externally.</Field>
          <Field name="team_stability">Key executives (CFO, COO, heads of business), experience, and unusual turnover.</Field>
          <Field name="incentive_alignment">Compensation structure — do management's incentives align with minority shareholders?</Field>
          <Field name="key_decisions">3–5 major strategic decisions of the last 3–5 years. Were they correct?</Field>
          <Field name="management_summary">200-word memo: would you trust this team with long-term capital?</Field>
        </Block>

        <Note>
          The forensic adjustments (EPS haircut and WACC add) flow directly into the Valuation agent.
          A BLOCK recommendation forces the rating to UNDERPERFORM, regardless of the price target math.
        </Note>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section id="valuation">
        <AgentHeader num="Agent 06" name="Valuation" role="8-step price target engine with sector-weighted multiples" />

        <p className="prose-tufte">
          Valuation synthesizes everything upstream into a price target, rating, and
          risk/reward ratio. It runs an 8-step analysis from first principles, reusing
          the Critical Factor scenarios rather than recomputing them.
        </p>

        <Block label="8-Step Analysis">
          {[
            ["Step 0", "Valuation Exec Summary",   "How does the market value this company today? Is the current multiple justified?"],
            ["Step 1", "Price & Base Metrics",      "Current price, market cap, enterprise value, shares outstanding."],
            ["Step 2", "Current Multiples",         "P/S, P/E, EV/EBITDA, P/FCF — which is most relevant for this sector and why?"],
            ["Step 3", "Market Assumptions",        "Working backwards: what growth/margin does the current price imply for bull, base, and bear?"],
            ["Step 4", "Peer Comparison",           "3–5 comparable companies with multiples. Is this stock cheap, fair, or expensive vs peers?"],
            ["Steps 5–7", "Bull / Base / Bear",     "Reuses scenarios from Critical Factor. Forensic adjustments applied."],
            ["Step 8", "Margin of Safety",          "Upside to PT, downside to Bear, R/R ratio, re-rating catalyst, and timing."],
            ["Final",  "Valuation Summary",         "200-word memo: price, intrinsic value range, and a clear judgment on attractiveness."],
          ].map(([step, name, desc]) => (
            <div key={step} className="flex gap-3 py-2 border-b border-[#F0EBE4] text-[11px]">
              <span className="text-[#C0B8AC] font-mono w-16 flex-shrink-0">{step}</span>
              <span className="text-[#6E6258] font-semibold w-44 flex-shrink-0">{name}</span>
              <span className="text-[#A89E94]">{desc}</span>
            </div>
          ))}
        </Block>

        <Block label="Sector Weights (PE / EV-EBITDA / DCF)">
          {[
            ["Tech hardware",        "25% / 40% / 35%"],
            ["Fintech pre-revenue",  "15% / 25% / 60%"],
            ["Consumer staples",     "45% / 35% / 20%"],
            ["Gunn compounder EM",   "20% / 30% / 50%"],
            ["Default (Valentine)",  "40% / 35% / 25%"],
          ].map(([sector, weights]) => (
            <div key={sector} className="flex gap-3 py-1.5 border-b border-[#F0EBE4] text-[11px]">
              <span className="text-[#6E6258] w-44">{sector}</span>
              <span className="font-mono text-[#A89E94]">{weights}</span>
            </div>
          ))}
        </Block>

        <Block label="Key Outputs">
          <Field name="pt_12m">12-month price target. Probability-weighted from Bull/Base/Bear scenarios.</Field>
          <Field name="pt_5y">5-year price target. Gunn mode only.</Field>
          <Field name="rating">
            <Tag color="orange">BUY</Tag> R/R ≥ 2:1 and upside ≥ 5%.{" "}
            <Tag color="amber">HOLD</Tag> R/R between 1 and 2.{" "}
            <Tag color="red">UNDERPERFORM</Tag> R/R &lt; 1, or forensic BLOCK, or gap &lt; 5%.
          </Field>
          <Field name="rr_ratio">
            Risk/Reward ratio. Calculated as upside-to-PT divided by downside-to-Bear.
            A 2:1 ratio means for every $1 of risk, there is $2 of potential reward.
          </Field>
          <Field name="faves_score" type="1–9">
            FaVeS — three components that measure catalyst quality:
            F Frequency (2–4 catalysts/year = 3 pts),
            V Visibility (pre-announced = 3 pts),
            S Significance (EPS impact &gt;5% = 3 pts).
          </Field>
          <Field name="ic_premium" type="0–1.5">
            Gunn mode only. Extra confidence premium based on management quality,
            TAM size, and moat durability from the Build-to-Last score.
          </Field>
          <Field name="conf_adj">
            Cumulative confidence adjustment from all agents. Negative values reduce
            final confidence (e.g. −0.05 from data fallback, −0.08 from wide scenario divergence).
          </Field>
        </Block>

        <Note>
          Forensic adjustments are applied before the price target: EPS is multiplied by
          (1 − eps_haircut_total) and the discount rate used in DCF is increased by dr_add_bps_total.
          If scenarios diverge by more than 30%, the conservative bound is used and conf_adj −= 0.08.
        </Note>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section id="kata">
        <AgentHeader num="Agent 07" name="Kata" role="Improvement Coach — audits the research process using the Toyota Improvement Kata" />

        <p className="prose-tufte">
          Kata does not judge whether the investment thesis is correct — the other agents already
          did that. Its job is to coach the <em>process</em> by which the thesis was built.
          It applies the Toyota Improvement Kata: a 4-step scientific thinking pattern used at
          Toyota to move an organization from its current state toward a target state through
          small, observable experiments.
        </p>

        <p className="prose-tufte mt-3">
          Kata runs after Valuation and before Communication, so the analyst can see gaps in
          the research process before deciding to publish. It never blocks publication —
          it surfaces information the analyst may want to act on.
        </p>

        <Block label="The Toyota Improvement Kata — 4 Steps">
          {[
            ["1 · Challenge",         "What is the overall direction? What are we ultimately trying to achieve with this research?"],
            ["2 · Current Condition", "What does the pipeline actually know right now, vs. what is it assuming? Where were fallbacks used?"],
            ["3 · Target Condition",  "What specific knowledge or validated hypothesis would move research to a higher confidence state?"],
            ["4 · PDCA Toward Target","Design the next small, fast experiment: Plan → Do → Check → Act."],
          ].map(([step, desc]) => (
            <div key={step} className="flex gap-3 py-2 border-b border-[#F0EBE4] text-[11px]">
              <span className="text-[#C8804A] font-semibold w-36 flex-shrink-0">{step}</span>
              <span className="text-[#A89E94] leading-relaxed">{desc}</span>
            </div>
          ))}
        </Block>

        <Block label="The Five Questions">
          <p className="text-[11px] text-[#8C7E70] leading-relaxed mb-3">
            Applied to each obstacle the agent identifies. They build on each other — the better
            you define the target condition, the more clearly you can see the obstacles.
          </p>
          {[
            ["Q1", "What is the target condition?"],
            ["Q2", "What is the actual condition now?"],
            ["Q3", "What obstacles are preventing you from reaching the target condition? Which one are you addressing?"],
            ["Q4", "What is your next step? (Start of next PDCA cycle)"],
            ["Q5", "When can we go and see what we have learned from that step?"],
          ].map(([q, text]) => (
            <div key={q} className="flex gap-3 py-1.5 border-b border-[#F0EBE4] text-[11px]">
              <span className="font-mono text-[#C8804A] w-6 flex-shrink-0">{q}</span>
              <span className="text-[#6E6258]">{text}</span>
            </div>
          ))}
        </Block>

        <Block label="What Kata Analyzes">
          <Field name="knowledge_gaps">
            Things the pipeline does not actually know — it assumed them. Each gap is tagged to
            the agent that produced (or failed to validate) the information.
          </Field>
          <Field name="assumption_risks">
            Untested assumptions embedded in the thesis. Rated{" "}
            <Tag color="red">high</Tag>{" "}
            <Tag color="amber">medium</Tag>{" "}
            <Tag color="gray">low</Tag>{" "}
            by potential impact on the investment decision.
          </Field>
          <Field name="obstacles">
            2–4 concrete things blocking better research quality. Exactly one is marked as
            the active obstacle — the one to address first in the next PDCA cycle.
          </Field>
          <Field name="pdca_cycle">
            The next experiment:{" "}
            <span className="text-[#6E6258]">Plan</span> (what to do and what to learn),{" "}
            <span className="text-[#6E6258]">Do</span> (the specific action — call IR, check EDGAR footnotes, run a sensitivity),{" "}
            <span className="text-[#6E6258]">Check</span> (what signal confirms or denies the hypothesis),{" "}
            <span className="text-[#6E6258]">Act</span> (how to adjust research if confirmed or denied).
          </Field>
          <Field name="process_confidence" type="0.0–1.0">
            How complete and well-validated the research process is — independent of whether
            the thesis is correct. Low process_confidence does not mean the thesis is wrong;
            it means the thesis rests on assumptions that have not been tested.
          </Field>
          <Field name="coaching_memo">
            A short memo written in Socratic mentor voice. Asks questions rather than giving
            answers — designed to keep the analyst thinking independently. Maximum 200 words.
          </Field>
          <Field name="next_review_date">
            The date by which the analyst should review the result of the active PDCA step.
            Derived from the checkpoint_date of the active obstacle.
          </Field>
        </Block>

        <Block label="Core Principles Applied">
          {[
            ["Focus on process, not blame",    "Problems are system problems. The pipeline is never blamed for gaps — the system is examined."],
            ["You are the benchmark",          "Do not ask how Toyota does it. Ask: where are we now, where do we want to be, what is in the way?"],
            ["Adaptive persistence",           "Move toward a vision along an unpredictable path. The next target condition is defined based on what was learned."],
            ["Small experiments over big plans","One obstacle, one PDCA cycle, one checkpoint. No large research projects."],
            ["Learn most from failures",        "The mentor expects small mistakes. That is when learning happens."],
          ].map(([principle, desc]) => (
            <div key={principle} className="flex gap-3 py-2 border-b border-[#F0EBE4] text-[11px]">
              <span className="text-[#6E6258] font-semibold w-48 flex-shrink-0 leading-snug">{principle}</span>
              <span className="text-[#A89E94] leading-relaxed">{desc}</span>
            </div>
          ))}
        </Block>

        <Note>
          Kata is the only agent that cannot drop or block the pipeline. Its role is coaching,
          not gating. If Kata fails for any reason (network error, timeout), the pipeline
          continues to Communication without interruption.
        </Note>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section id="communication">
        <AgentHeader num="Agent 08" name="Communication" role="Publication Gate — ENTER check and note drafting" />

        <p className="prose-tufte">
          The final gate before publication. Communication evaluates whether the analysis
          is ready to share with investors, drafts the research note, and records
          a full audit trail of confidence adjustments.
        </p>

        <Block label="ENTER Gate — 5 criteria (0–5 score)">
          <Field name="E — Edge">Does this analysis provide an informational or analytical edge vs consensus?</Field>
          <Field name="N — New">Is the catalyst new? Not already covered by existing research?</Field>
          <Field name="T — Timely">Is the timing right? A great idea 18 months early is not publishable today.</Field>
          <Field name="E — Examples">Are the claims supported by concrete data points and examples?</Field>
          <Field name="R — Revealing">Does the note reveal something non-obvious that changes how an investor should think?</Field>
        </Block>

        <Block label="Publication Thresholds">
          <Field name="Score ≥ 5">
            <Tag color="orange">FLASH_NOTE</Tag> Short catalyst-driven note (1–2 pages).{" "}
            <Tag color="orange">INITIATION</Tag> Full coverage initiation.
          </Field>
          <Field name="Score 3–4">
            <Tag color="amber">ALERT</Tag> Brief alert note.{" "}
            <Tag color="amber">QUARTERLY</Tag> Earnings update.
          </Field>
          <Field name="Score &lt; 3"><Tag color="red">DROP</Tag> Below publication threshold. No note issued.</Field>
          <Field name="mosaic halt"><Tag color="red">COMPLIANCE HALT</Tag> Overrides all scores. Note blocked regardless of ENTER score.</Field>
        </Block>

        <Block label="Audit Trail">
          <Field name="confidence_adjustments">Every confidence change from every agent, logged with the reason code.</Field>
          <Field name="final_confidence">
            Starting confidence minus all adjustments. Displayed as a percentage — reflects how much
            the system trusts its own output given the data quality encountered.
          </Field>
          <Field name="fallback_flags">Any agents that had to fall back to cached or manual data (reduces confidence).</Field>
        </Block>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section id="lens">
        <AgentHeader num="Agent 09" name="Lens" role="Consistency Auditor — applies the firm's five intellectual frameworks to the full analysis" />

        <p className="prose-tufte">
          Lens is the final agent. It does not re-do the analysis or generate a new price target.
          It audits whether the thinking behind the analysis is consistent with how the firm
          believes the world works and how investments should be evaluated. It is the intellectual
          conscience of the pipeline — direct, critical, and specific.
        </p>

        <p className="prose-tufte mt-3">
          Lens receives the complete output of all prior agents — including the process gaps
          identified by Kata — and applies five lenses from the firm's investment guidebook.
          The output is a verdict for the portfolio manager, not another layer of analysis.
        </p>

        <Block label="The Five Lenses">
          {[
            ["01 · The Loop",          "Economic Potential + Technological Capability + Human Agency. The firm's core framework."],
            ["02 · Superforecasting",  "Tetlock's 11 commandments for making calibrated, granular probability estimates."],
            ["03 · Dunning-Kruger",    "Calibration of competence and ignorance — does the analyst know what they don't know?"],
            ["04 · Hidden Champions",  "Simon's framework for exceptional niche companies — 8 defining characteristics."],
            ["05 · Kauffman",          "The nonergodic universe — adjacent possible, Darwinian preadaptations, economic web dynamics."],
          ].map(([lens, desc]) => (
            <div key={lens} className="flex gap-3 py-2 border-b border-[#F0EBE4] text-[11px]">
              <span className="text-[#C8804A] font-semibold w-44 flex-shrink-0 leading-snug">{lens}</span>
              <span className="text-[#A89E94] leading-relaxed">{desc}</span>
            </div>
          ))}
        </Block>

        <Block label="Lens 1 — The Loop">
          <p className="text-[11px] text-[#8C7E70] leading-relaxed mb-3">
            The firm invests based on where the world is going, not just where a company is today.
            Long-term trends are broken into three domains — biological, physical, and digital —
            and the portfolio is diversified across these forces of change.
          </p>
          <Field name="variant_expectations">
            Is the thesis buying a gap between the firm's expectations and what is discounted in the
            current price? Or is it a consensus thesis where everyone already agrees?
            Profits come from rising expectations — buying consensus is buying what is already priced in.
          </Field>
          <Field name="distributes_future">
            Does the business take something hard and make it easier? Does it distribute the future
            and drive human progress? Businesses that do this create durable economic value.
          </Field>
          <Field name="valuation_anchor_consistent">
            The firm's valuation anchor: <span className="font-mono text-[#6E6258]">Value = Profits / (r − g)</span>.
            Target return always above 12%. Max long-term growth rate for steady-state: 8%.
            Max long-term P/E: below 25×. Fair P/Sales = Net Margin / (r − g).
          </Field>
          <Field name="domain">
            Which of the three domains drives the thesis: biological (biotech, health),
            physical (advanced materials, manufacturing), or digital (distributed compute, networks)?
          </Field>
          <Field name="score" type="0–100">Loop consistency score.</Field>
        </Block>

        <Block label="Lens 2 — Superforecasting">
          <p className="text-[11px] text-[#8C7E70] leading-relaxed mb-3">
            Drawn from Tetlock's research on forecasting accuracy. The best forecasters are
            disciplined, granular, and update their beliefs incrementally based on evidence.
          </p>
          <Field name="probabilities_granular">
            Are the Bull/Base/Bear probabilities the result of careful reasoning —
            e.g. 0.35/0.45/0.20 — or are they suspiciously round — e.g. 0.30/0.50/0.20?
            Round numbers without justification are a sign of vague thinking.
          </Field>
          <Field name="inside_outside_balanced">
            Did the analysis balance company-specific reasoning (inside view) with
            base rates from comparable situations (outside view)?
          </Field>
          <Field name="causal_forces_balanced">
            Were the forces that could make the bull case wrong taken as seriously as
            the forces that support it? Clashing causal forces produce synthesis, not bias.
          </Field>
          <Field name="invalidation_specific">
            Are the invalidation conditions concrete and observable — e.g. "gross margin
            falls below 60% for two consecutive quarters" — or vague — e.g. "if conditions worsen"?
          </Field>
          <Field name="score" type="0–100">Superforecasting quality score.</Field>
        </Block>

        <Block label="Lens 3 — Dunning-Kruger">
          <p className="text-[11px] text-[#8C7E70] leading-relaxed mb-3">
            Poor performers don't know what they don't know. Applied to research: the analyst
            may be most confident precisely where their knowledge is weakest. This lens
            cross-references the pipeline's confidence scores against the process gaps
            identified by Kata.
          </p>
          <Field name="flag">
            <Tag color="green">low</Tag> Confidence is consistent with evidence quality.{" "}
            <Tag color="amber">medium</Tag> Some tension between confidence and gaps.{" "}
            <Tag color="red">high</Tag> High confidence with many unresolved gaps — likely overconfidence.
          </Field>
          <Field name="overconfidence_signals">
            Specific signals detected: e.g. high final_confidence with multiple L1/L2 fallbacks,
            high mgmt_trust_score without a full management profile, wide scenario spread with BUY rating.
          </Field>
          <Field name="confidence_gap">
            Compares process_confidence (from Kata) with final_confidence (from Communication).
            Large divergence — high final_confidence, low process_confidence — warrants scrutiny.
          </Field>
        </Block>

        <Block label="Lens 4 — Hidden Champions">
          <p className="text-[11px] text-[#8C7E70] leading-relaxed mb-3">
            Simon's research on world market leaders in narrow, little-known markets. These
            companies share 8 defining characteristics that make them exceptionally durable.
            The lens evaluates whether the company fits this profile.
          </p>
          <Field name="fit">
            <Tag color="green">strong</Tag> Most of the 8 characteristics are present.{" "}
            <Tag color="amber">partial</Tag> Some characteristics present, others unclear or absent.{" "}
            <Tag color="gray">none</Tag> Large-cap generalist or does not fit the profile.
          </Field>
          <Field name="characteristics_present">
            Which of the 8 are confirmed: ambitious goals, high-performance employees, depth,
            decentralization, focus, globalization, innovation, closeness to customer.
          </Field>
          <Field name="characteristics_missing">
            Which are absent or unclear — and whether the gap is material to the thesis.
          </Field>
        </Block>

        <Block label="Lens 5 — Kauffman / Adjacent Possible">
          <p className="text-[11px] text-[#8C7E70] leading-relaxed mb-3">
            The economy is nonergodic — it never repeats the same state, and persistently
            advances into its adjacent possible, creating ever-new economic niches.
            Standard DCF models assume ergodic (mean-reverting) dynamics. This lens asks
            whether the analyst is using the right model for this type of business.
          </p>
          <Field name="ergodic_assumption">
            Is the valuation model treating a nonergodic business — one that is expanding
            into new niches — as if it were a steady-state machine? If yes, the model
            likely underestimates the long-term upside.
          </Field>
          <Field name="adjacent_possible">
            What new economic niches does this company's product or capability make possible?
            What can exist because this company exists?
          </Field>
          <Field name="preadaptations">
            Darwinian preadaptations: capabilities in the business that were built for one
            purpose but are being repurposed for a more valuable use. A source of
            unmodeled upside that standard analysis misses.
          </Field>
          <Field name="complement_or_substitute">
            Does the company create complements — expanding the economic web by making
            other goods and services more valuable — or substitutes, competing for
            existing niches? Complement-creators drive more durable growth.
          </Field>
        </Block>

        <Block label="Output">
          <Field name="overall_verdict">
            <Tag color="green">CONSISTENT</Tag> Thesis is well-aligned across all five lenses.{" "}
            <Tag color="amber">PARTIAL</Tag> Sound thesis with gaps in 1–2 lenses worth resolving before sizing.{" "}
            <Tag color="red">INCONSISTENT</Tag> Thesis contradicts the firm's frameworks — revise before publishing.
          </Field>
          <Field name="key_tensions">2–3 specific contradictions between the thesis and the frameworks, with references to actual numbers.</Field>
          <Field name="recommendations">2–3 concrete actions for the portfolio manager before making a sizing decision.</Field>
          <Field name="pm_memo">
            200-word memo to the portfolio manager. Direct, no hedging.
            Written as a peer speaking to a peer — not a summary, but a judgment.
          </Field>
        </Block>

        <Note>
          Lens never blocks the pipeline. A verdict of INCONSISTENT means the analyst should
          revise the thesis before publishing — but it does not force a DROP. The portfolio
          manager reads the Lens output and decides. Like Kata, if Lens fails for any reason,
          the pipeline completes without it.
        </Note>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section id="modes">
        <h2 className="text-base font-bold tracking-widest text-[#1E1A14] uppercase mb-4">Modes</h2>

        <p className="prose-tufte">
          Efrain AI supports two investment philosophies, selectable at the start of each analysis.
          The mode changes thresholds, time horizons, and which outputs are produced.
        </p>

        <div className="mt-6 space-y-6">
          <div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-[#C8804A] font-semibold tracking-wider text-[12px]">VALENTINE</span>
              <span className="text-[10px] text-[#C0B8AC]">12-month · event-driven</span>
            </div>
            <p className="text-[11px] text-[#8C7E70] leading-relaxed">
              Short-to-medium horizon. Requires a concrete near-term catalyst (earnings beat, product launch,
              regulatory approval, M&A). The analysis focuses on whether that catalyst will materialize and
              how much it is already priced in. EPS impact threshold: &gt;5%.
            </p>
          </div>

          <div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-[#C8804A] font-semibold tracking-wider text-[12px]">GUNN</span>
              <span className="text-[10px] text-[#C0B8AC]">3–20 year · compounder</span>
            </div>
            <p className="text-[11px] text-[#8C7E70] leading-relaxed">
              Long-duration thesis. The company must be able to compound capital at above-average rates
              for many years. Adds Build-to-Last scoring (management + TAM + moat), a 5-year price target,
              and IC Premium in valuation. EPS impact threshold: &gt;4%.
              Named after William Peter Hamilton Gunn's compounding philosophy.
            </p>
          </div>

          <div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-[#C8804A] font-semibold tracking-wider text-[12px]">DUAL</span>
              <span className="text-[10px] text-[#C0B8AC]">both perspectives</span>
            </div>
            <p className="text-[11px] text-[#8C7E70] leading-relaxed">
              Runs both Valentine and Gunn analyses. Used when the analyst believes the idea
              has both a near-term catalyst and long-term compounding potential. Produces the
              most comprehensive output but also takes the longest to run.
            </p>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section id="concepts">
        <h2 className="text-base font-bold tracking-widest text-[#1E1A14] uppercase mb-4">Key Concepts</h2>

        <div className="space-y-0">
          <Field name="Alpha Score">
            A composite 0–100 score measuring how much investment opportunity a ticker presents.
            Not a prediction of returns — a prioritization signal.
          </Field>
          <Field name="Mosaic Theory">
            The legal practice of combining many pieces of public information to form an investment
            thesis. Each piece is individually non-material; the picture they form is an analyst's edge.
          </Field>
          <Field name="MNPI">
            Material Non-Public Information. Trading on MNPI is illegal. The pipeline halts
            automatically if a compliance signal is detected.
          </Field>
          <Field name="Moat">
            A company's sustainable competitive advantage — what protects its margins from competitors
            over time. Named after the water moat around a medieval castle.
          </Field>
          <Field name="EPS Haircut">
            A forensic adjustment that reduces reported EPS before valuation. Applied when accounting
            quality issues suggest earnings are overstated.
          </Field>
          <Field name="WACC">
            Weighted Average Cost of Capital — the discount rate used in DCF valuation. Higher WACC =
            lower present value. Forensic adds basis points when risk is detected.
          </Field>
          <Field name="DCF">
            Discounted Cash Flow — a valuation method that estimates a stock's intrinsic value by
            discounting projected future free cash flows back to today.
          </Field>
          <Field name="EV/EBITDA">
            Enterprise Value divided by EBITDA. A capital-structure-neutral multiple commonly used
            for comparing companies with different debt levels.
          </Field>
          <Field name="RR Ratio">
            Risk/Reward ratio. Upside to price target divided by downside to Bear scenario.
            Minimum 2:1 required for a BUY rating.
          </Field>
          <Field name="FaVeS">
            Catalyst quality score (1–9): Frequency (how often), Visibility (how predictable),
            Significance (EPS impact size). Higher score = more actionable catalyst.
          </Field>
          <Field name="IC Premium">
            Gunn mode only. Extra valuation premium awarded to companies with exceptional management,
            large TAM, and durable moat. Range 0–1.5×.
          </Field>
          <Field name="Shadow Test">
            A backward-looking check: did management actually deliver what they promised 3 years ago?
            A key input to the mgmt_trust_score.
          </Field>
          <Field name="Bessembinder Candidate">
            A stock with potential to be among the rare companies that generate extraordinary
            long-term wealth (top 4% of all stocks account for all net market gains, per Hendrik
            Bessembinder's research). Earns a +10 bonus in Scout scoring.
          </Field>
          <Field name="conf_adj">
            Cumulative confidence penalty. Every data quality issue, fallback, or scenario divergence
            reduces this number. Final confidence = base confidence + sum of all adjustments.
          </Field>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section id="architecture">
        <h2 className="text-base font-bold tracking-widest text-[#1E1A14] uppercase mb-4">Architecture: Ports &amp; Adapters</h2>

        <p className="prose-tufte">
          Efrain AI uses a Hexagonal Architecture (Ports &amp; Adapters) to decouple the
          analysis pipeline from any specific AI model or provider. Think of it as a
          roundabout: the analytical core sits at the center and never touches the road —
          adapters (the cars) connect to it from outside through standardized entry points (the roads).
        </p>

        <Block label="The Port — ILanguageModel">
          <p className="text-[11px] text-[#8C7E70] leading-relaxed mb-3">
            A TypeScript interface defined in{" "}
            <span className="font-mono text-[#6E6258]">src/core/ports/ILanguageModel.ts</span>.
            Every agent calls only this interface — never a vendor SDK directly.
          </p>
          <Field name="chat(params)">
            Sends a single-turn prompt and returns the full response as a string.
            Used by agents that need a complete, non-streaming answer.
          </Field>
          <Field name="chatStream(params)">
            Returns an async generator that yields text chunks as they arrive.
            Used by the Communication agent for long-form report drafting.
          </Field>
          <Field name="MODELS constant">
            Canonical model IDs exported from the port:{" "}
            <span className="font-mono text-[#6E6258]">haiku</span>,{" "}
            <span className="font-mono text-[#6E6258]">sonnet</span>,{" "}
            <span className="font-mono text-[#6E6258]">opus</span>.
            All agents reference <span className="font-mono text-[#6E6258]">MODELS.haiku</span> etc.
            — switching a model means editing one file.
          </Field>
        </Block>

        <Block label="The Adapters">
          <Field name="OpenRouterAdapter">
            Production adapter in{" "}
            <span className="font-mono text-[#6E6258]">src/adapters/llm/OpenRouterAdapter.ts</span>.
            Calls OpenRouter's API (OpenAI-compatible) using the official OpenAI SDK.
            Handles streaming, temperature, max tokens, and JSON mode.
            Requires <span className="font-mono text-[#6E6258]">OPENROUTER_API_KEY</span> in the environment.
          </Field>
          <Field name="MockLLMAdapter">
            Test adapter in{" "}
            <span className="font-mono text-[#6E6258]">src/adapters/llm/MockLLMAdapter.ts</span>.
            Returns pre-canned JSON fixtures — zero API calls, zero cost.
            Pass a <span className="font-mono text-[#6E6258]">Record&lt;string, string&gt;</span> of
            system-prompt-keyed responses to control what each agent receives.
          </Field>
        </Block>

        <Block label="The Configurator">
          <p className="text-[11px] text-[#8C7E70] leading-relaxed mb-3">
            <span className="font-mono text-[#6E6258]">src/configurator.ts</span> is the
            composition root — the only place that decides which adapter to wire in.
          </p>
          <Field name="buildLLM()">
            Returns <span className="font-mono text-[#6E6258]">OpenRouterAdapter</span> when{" "}
            <span className="font-mono text-[#6E6258]">NODE_ENV !== "test"</span>,
            and <span className="font-mono text-[#6E6258]">MockLLMAdapter</span> otherwise.
            Called once per request at the API route level; the resulting{" "}
            <span className="font-mono text-[#6E6258]">llm</span> object is passed down to every agent.
          </Field>
        </Block>

        <Block label="Directory Layout">
          <div className="font-mono text-[11px] text-[#6E6258] leading-relaxed bg-[#F5F0EB] rounded px-4 py-3">
            <div className="text-[#C0B8AC]">src/</div>
            <div className="pl-4 text-[#C0B8AC]">core/</div>
            <div className="pl-8 text-[#C0B8AC]">ports/</div>
            <div className="pl-12">ILanguageModel.ts <span className="text-[#A89E94]">← the contract</span></div>
            <div className="pl-4 text-[#C0B8AC]">adapters/</div>
            <div className="pl-8 text-[#C0B8AC]">llm/</div>
            <div className="pl-12">OpenRouterAdapter.ts <span className="text-[#A89E94]">← production</span></div>
            <div className="pl-12">MockLLMAdapter.ts <span className="text-[#A89E94]">← testing</span></div>
            <div className="pl-4">configurator.ts <span className="text-[#A89E94]">← composition root</span></div>
          </div>
        </Block>

        <Note>
          To swap from OpenRouter to a direct Anthropic SDK, Bedrock, or a local model,
          you only write a new adapter that implements <span className="font-mono">ILanguageModel</span> and
          update <span className="font-mono">buildLLM()</span>. The 9 agents and the pipeline are unchanged.
        </Note>
      </Section>

      {/* ── Footer ── */}
      <div className="pt-6 text-center">
        <Link href="/" className="text-xs text-[#A89E94] hover:text-[#C8804A] transition-colors">
          ← Back to pipeline
        </Link>
      </div>

    </div>
  );
}
