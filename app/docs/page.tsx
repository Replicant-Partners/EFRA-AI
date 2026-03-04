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
          ["#communication",  "07 · Communication"],
          ["#modes",          "Modes: Valentine · Gunn · Dual"],
          ["#concepts",       "Key Concepts"],
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
          Efrain AI is a 7-agent pipeline that takes a stock idea (ticker + catalyst) and
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
            ["07", "COMMUNICATION",  "ENTER gate check. Drafts and publishes the research note."],
          ].map(([num, name, desc]) => (
            <div key={num} className="flex gap-3 text-[11px]">
              <span className="text-[#C0B8AC] font-mono w-5 flex-shrink-0">{num}</span>
              <span className="text-[#C8804A] font-semibold w-32 flex-shrink-0 tracking-wider">{name}</span>
              <span className="text-[#8C7E70]">{desc}</span>
            </div>
          ))}
        </div>

        <Note>
          If the Scout decides DROP, the pipeline stops. If Forensic Pre-screen returns BLOCK,
          the valuation agent forces UNDERPERFORM. If the ENTER gate scores below 3/5,
          publication is dropped.
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
            <span className="text-[#6E6258]">marca</span> (brand),{" "}
            <span className="text-[#6E6258]">costos</span> (cost advantage),{" "}
            <span className="text-[#6E6258]">red</span> (network effects),{" "}
            <span className="text-[#6E6258]">regulación</span> (regulatory barriers),{" "}
            <span className="text-[#6E6258]">otra</span> (other).
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
      <Section id="communication">
        <AgentHeader num="Agent 07" name="Communication" role="Publication Gate — ENTER check and note drafting" />

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

      {/* ── Footer ── */}
      <div className="pt-6 text-center">
        <Link href="/" className="text-xs text-[#A89E94] hover:text-[#C8804A] transition-colors">
          ← Back to pipeline
        </Link>
      </div>

    </div>
  );
}
