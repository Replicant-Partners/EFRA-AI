# Efrain AI — Multi-Agent Equity Research System

> Valentine × Gunn Dual-Mode Framework · v3.0.0 · May 2026

9-agent AI system that produces institutional-quality equity research.
Agents run sequentially, communicate through structured outputs, and apply
the firm's intellectual frameworks before the portfolio manager sees a single number.

Live: **[efra-ai-production.up.railway.app](https://efra-ai-production.up.railway.app)**

---

## What's New in v3.0

- **Agent 07 — KATA**: Toyota Improvement Kata coach. Audits the research *process* — knowledge gaps, untested assumptions, PDCA cycle — before publication.
- **Agent 09 — LENS**: Consistency auditor. Applies the firm's five intellectual frameworks (The Loop, Superforecasting, Dunning-Kruger, Hidden Champions, Kauffman) to the full analysis. Produces a verdict and PM memo.
- **Executive ResultPanel**: Redesigned final summary for portfolio managers — verdict, PT, scenarios, research note, and scorecard.
- **Retry on network error**: Each agent fetch has a 4-minute timeout and automatic retry on transient OpenRouter failures.
- **Structured CASCADE renderer**: Research notes parsed into labeled sections (Conclusion / Action / Scenarios / Catalysts / Data) — no more raw preformatted text.

---

## Key Numbers

| Metric | Value |
|--------|-------|
| Cost per Flash Note | ~$0.09 |
| End-to-end analysis time | ~5–7 minutes |
| PT hit rate target | 58% |
| Agents | 13 (9 pipeline + 4 research) |
| Operating modes | 3 (Valentine · Gunn · Dual) |
| Deployment | Railway (auto-deploy on push) |

---

## The 13 Agents

### Main Pipeline (01-09)

| # | Agent | Role | Gate / Output |
|---|-------|------|---------------|
| 01 | **SCOUT** | Coverage universe optimizer | `alpha_score >= 65` → MUST_COVER / DROP |
| 02 | **INTEL** | Information hub — business analysis + news mosaic | MNPI = HALT |
| 03 | **FORENSIC** | Quick risk pre-screen | SEV-5 = BLOCK |
| 04 | **CRITICAL FACTOR** | Thesis engine — Bull / Base / Bear scenarios | `eps_impact >= 5%` / 0 factors = DROP |
| 05 | **FORENSIC** | Full audit — accruals, governance, management profile | SEV-5 = BLOCK |
| 06 | **VALUATION** | 8-step price target engine | RR >= 2:1 → BUY |
| 07 | **KATA** | Toyota Improvement Kata coach — process audit | Never blocks |
| 08 | **COMMUNICATION** | Publication gate — ENTER check + CASCADE note | ENTER 5/5 = PUBLISH |
| 09 | **LENS** | Consistency auditor — five intellectual frameworks | Never blocks |

---

## Pipeline

```
Idea → SCOUT → INTEL → FORENSIC(pre) → CF → FORENSIC(full) → VALUATION → KATA → COMM → LENS
         |        |           |          |          |              |                   |
        DROP    HALT        BLOCK      DROP       BLOCK          DROP                 ↓
                                                                               PM Verdict
```

KATA and LENS are coaching/auditing steps — they never block publication.

### Research Pipeline (10-13)

| # | Agent | Role | Output |
|---|-------|------|--------|
| 10 | **GORILLA** | Value Gorilla framework — 4 dimensions | GORILLA / SMALL_ANIMAL / PEDESTRIAN |
| 11 | **IMAGINE** | Long-range imagination — 5/10/20Y scenarios | Digital stage + falsifiable predictions |
| 12 | **THESIS** | Investment thesis synthesis | investment_grade / needs_work / incomplete |
| 13 | **COMPANY** | Deep company analysis | Franchise + Management + Financials |

```
COMPANY (13) → GORILLA (10) → IMAGINE (11) → THESIS (12)
     |              |              |              |
  Franchise    4 Dimensions    Scenarios     Final Thesis
  Management   Invisibility    Predictions   3 Pillars
  Financials   Combinatorial   Digital Stage Quality Gate
```

Each agent passes its output to the next, building a comprehensive investment thesis.

---

## Agent 07 — KATA (Toyota Improvement Kata)

Applies the Improvement Kata 4-step pattern to the research process:

1. **Challenge** — what are we ultimately trying to learn about this company?
2. **Current Condition** — what does the pipeline actually know vs. assume?
3. **Target Condition** — what specific knowledge would move research to higher confidence?
4. **PDCA** — one small, fast, observable experiment to close the gap

**The Five Questions** (applied to each obstacle):

| Q | Question |
|---|----------|
| Q1 | What is the target condition? |
| Q2 | What is the actual condition now? |
| Q3 | What obstacles are preventing you? Which one are you addressing? |
| Q4 | What is your next step? |
| Q5 | When can we go and see what we have learned? |

**Output:** `KataBoard` — knowledge gaps, assumption risks, active obstacle, PDCA cycle, Socratic coaching memo, `process_confidence`, `next_review_date`.

---

## Agent 09 — LENS (Consistency Auditor)

Audits the full pipeline output against the firm's five intellectual frameworks:

### Lens 1 — The Loop
The firm's core investment framework. Invests based on where the world is going — not just where a company is today.
- **Economic Potential**: Biological / Physical / Digital domains. Seven qualifying countries: Brazil, Indonesia, Mexico, South Africa, Turkey, UK, USA.
- **Technological Capability & Human Agency**: Three dimensions — Business Franchise, Management Quality, Valuation.
- **Variant expectations**: Is the thesis buying a gap between firm expectations and current price discounting?
- **Valuation anchor**: `Value = Profits / (r − g)` · target return always > 12% · max P/E < 25×

### Lens 2 — Superforecasting (Tetlock)
- Are Bull/Base/Bear probabilities granular (0.35) or round (0.50)?
- Inside view vs. outside view balance?
- Clashing causal forces acknowledged?
- Invalidation conditions specific and observable?

### Lens 3 — Dunning-Kruger
- Does the analyst know what they don't know?
- Is high confidence consistent with evidence quality?
- Cross-references `process_confidence` (KATA) vs `final_confidence` (COMMUNICATION)
- Flags: `low` / `medium` / `high` overconfidence risk

### Lens 4 — Hidden Champions (Simon)
Eight defining characteristics: ambitious goals, high-performance employees, depth, decentralization, focus, globalization, innovation, closeness to customer.
- Fit rating: `none` / `partial` / `strong`

### Lens 5 — Kauffman / Adjacent Possible
- Is the analyst using an ergodic (mean-reverting) model for a nonergodic business?
- What new economic niches does this company make possible?
- Darwinian preadaptations: capabilities repurposed for unintended uses
- Complement-creator vs. substitute-provider

**Output:** `LensBoard` — five lens scores, `overall_verdict` (CONSISTENT / PARTIAL / INCONSISTENT), `key_tensions`, `recommendations`, 200-word `pm_memo`.

---

## Agent 10 — GORILLA (Value Gorilla Framework)

Evaluates whether an investment opportunity meets the firm's highest-conviction profile. All four dimensions must be present for a true Value Gorilla.

| Dimension | Weight | Description |
|-----------|--------|-------------|
| **Obvious Problem** | 25% | Large, structural, widely acknowledged problem |
| **Invisible Gorilla** | 30% | Market can't see the solution (blind spot) |
| **Combinatorial Solution** | 25% | New combination of existing technologies |
| **Choke Point** | 20% | Strategic position in value chain |

**Verdict:** `GORILLA` (≥75) / `SMALL_ANIMAL` (50-74) / `PEDESTRIAN` (<50)

---

## Agent 11 — IMAGINE (Focus & Imagination)

Projects the future of a business at 5, 10, and 20 years and walks it back analytically to today.

**Digital Transformation Stages:**
1. **MODEL** — Digital version exists, decisions still physical
2. **SHADOW** — Live synchronization, physical-first decisions
3. **TWIN** — Digital is authoritative, physical coordinated by digital
4. **SOURCE** — Digital IS the source, physical is output

**Growth Driver Classification:** `innovation` / `demographic` / `both` / `neither`

**Output:** `ImagineBoard` — digital stage, growth driver, 3 scenarios (5Y/10Y/20Y), falsifiable predictions, what's not on the page, what's not in the price.

---

## Agent 12 — THESIS (Investment Thesis Synthesis)

Synthesizes all prior research into a formal investment thesis covering the three pillars.

**Three Pillars:**
1. **Business Franchise** — moat strength, value creation mechanism, durability
2. **Management Quality** — capital allocation verdict, leadership assessment
3. **Valuation** — 3-stage framework (consensus → normalization → terminal)

**Quality Gate:** `investment_grade` / `needs_work` / `incomplete`

---

## Agent 13 — COMPANY (Deep Company Analysis)

Produces a deep, idiosyncratic company analysis. Thinks like an owner — focused on growth and profitability, not trading patterns.

**8-Part Framework:**
1. **Self-View** — how the company describes itself
2. **Business Franchise** — identity, geography, moat, competitive position
3. **Management Skill** — CEO scorecard (long-term) + CFO scorecard (working capital)
4. **Financial Profile** — signposts + 3-stage valuation
5. **Invisible Layer** — what's not on the page, what's not in the price
6. **Turd Blossom** — is market pricing it like a turd? Early shoots of improvement?
7. **Value Gorilla Elevator Pitch** — economic opportunity + exploitation + why market doubts
8. **Investment Thesis Statement** — durable, timeless, covering all three pillars

**Output:** `CompanyBoard` — comprehensive company analysis with all 8 sections.

---

## Operating Modes

| | Valentine | Gunn | Dual |
|-|-----------|------|------|
| Horizon | 12 months | 5 years | 3 years |
| Output | Flash Note | Initiation Report | Both |
| EPS threshold | > 5% | > 4% | Both |
| Exclusive | FaVeS score | Build-to-Last + IC Premium | Both |

---

## Fallback Hierarchy

| Level | Trigger | Confidence penalty |
|-------|---------|-------------------|
| L1 | Primary source timeout, use cache | −0.05 to −0.12 |
| L2 | Cache miss, use alternative source | −0.15 to −0.20 |
| Last | All sources down, manual input | −0.25 to −0.30 |

Invariants that never break:
- FORENSIC cannot be skipped
- MNPI = absolute HALT, zero fallback
- Confidence < 0.50 = NO\_PUBLISH

---

## Alpha Score (Scout)

```
base  = (coverage_gap × 0.30) + (market_cap_fit × 0.20)
      + (sector_relevance × 0.25) + (valuation_anomaly × 0.25)

bonus = em_gdp_below_15k (+10) + bessembinder_flag (+10)
      + low_coverage_flag (+5)   # max +25

total = MIN(base + bonus, 100)
```

- ≥ 65 → MUST\_COVER
- 45–64 → REVIEW\_ZONE
- < 45 → DROP (rescreen after 90 days)

---

## Forensic Severity

| SEV | Example | EPS haircut | DR add | Result |
|-----|---------|------------|--------|--------|
| 5 | Fraud / Restatement | 30% | 300bps | BLOCK |
| 4 | Going concern | 20% | 200bps | CONDITIONAL |
| 3 | Governance / COB | 10% | 150bps | CONDITIONAL |
| 2 | DSO expansion | 5% | 75bps | CLEAR+adj |
| 1 | Minor | 0% | 25bps | CLEAR+adj |

---

## ENTER Gate (Communication)

| Criterion | Test |
|-----------|------|
| **E** Edge | Differential alpha vs consensus |
| **N** New | Not yet reflected in price |
| **T** Timely | Active catalyst within horizon |
| **E** Examples | 3+ data points cited |
| **R** Revealing | Changes analyst perspective |

5/5 = PUBLISH · 4/5 = ALERT · ≤ 3/5 = DROP

---

## Output Formats

| Format | Model |
|--------|-------|
| ALERT | Sonnet |
| FLASH NOTE | Sonnet |
| QUARTERLY UPDATE | Sonnet |
| INITIATION REPORT | Sonnet |

All notes use CASCADE format:
**C**onclusion → **A**ction → **S**cenarios → **C**atalysts → **D**ata

---

## Model Allocation

| Agent | Model | Reason |
|-------|-------|--------|
| Scout | Sonnet | Fast filter, high frequency |
| Intel | Sonnet | Business analysis + news |
| Forensic (pre + full) | Sonnet | Risk scan |
| Critical Factor | Sonnet | Scenario generation |
| Valuation | Opus | Highest precision for PT |
| Kata | Sonnet | Process coaching |
| Communication | Sonnet + streaming | Report drafting |
| Lens | Sonnet | Framework audit |
| Catalog | Haiku | Classification, max cost-efficiency |

---

## Architecture

Hexagonal (Ports & Adapters). The analytical core never touches a vendor SDK.

```
src/
  core/ports/
    ILanguageModel.ts        ← the contract
  adapters/llm/
    OpenRouterAdapter.ts     ← production (OpenRouter → Anthropic Claude)
    MockLLMAdapter.ts        ← testing (zero API cost)
  agents/
    01-scout/
    02-intel/
    03-critical-factor/
    04-forensic/
    05-valuation/
    06-communication/
    07-catalog/
    08-kata/
    09-lens/
  shared/
    pipeline.ts              ← sequential orchestrator with early-exit gates
    types.ts                 ← all TypeScript interfaces
  configurator.ts            ← composition root
app/
  api/agent/route.ts         ← SSE streaming API route (Next.js)
  docs/page.tsx              ← Pipeline Guide
  library/                   ← saved analyses
  screener/                  ← excellence screener
components/
  AgentStep.tsx              ← per-agent structured UI renderer
  ResultPanel.tsx            ← executive summary for portfolio manager
prisma/                      ← database schema + migrations
```

To swap LLM providers: implement `ILanguageModel`, update `buildLLM()` in `configurator.ts`. The 9 agents are unchanged.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL via Prisma |
| LLM Gateway | OpenRouter → Anthropic Claude |
| Deployment | Railway (auto-deploy on git push) |
| Styling | Tailwind CSS · JetBrains Mono · Playfair Display |

---

## Environment Variables

```bash
OPENROUTER_API_KEY=   # required — Claude via OpenRouter
DATABASE_URL=         # required — PostgreSQL connection string
```

---

*Efrain AI · v3.0.0 · May 2026*
