# Efrain AI — Multi-Agent Equity Research System

> Valentine x Gunn Dual-Mode Framework · v2.2.0 · February 2026

6-agent AI system that produces institutional-quality equity research.
Agents communicate through structured dialogs, reorient theses when they
encounter red flags, and require unanimous consensus before publishing.

---

## Key Numbers

| Metric | Value |
|--------|-------|
| Cost per Flash Note | $0.073 |
| End-to-end analysis time | ~3.3 minutes |
| PT hit rate target | 58% |
| Annual cost (100 notes) | $10.52 |
| Agents | 6 |
| Ontology entities | 28 |
| Ontology relationships | 33 |

---

## Repository Structure
```
efrain-ai/
├── README.md
├── .gitignore
├── diagrams/
│   ├── system_overview.html        # Pipeline + dual-mode + ontology (4 tabs)
│   └── agent_diagrams.html         # Per-agent logic + fallbacks (6 tabs)
├── docs/
│   ├── 01_agent_cards.md
│   ├── 02_ontology_v3.md
│   ├── 03_usage_examples.md
│   ├── 04_error_scenarios.md
│   ├── 05_test_queries.md
│   ├── 06_forecast_scenarios.md
│   ├── 07_fallback_strategies.md
│   ├── 08_performance_metrics.md
│   ├── 09_calibration_plan.md
│   ├── 10_feedback_loop.md
│   └── 11_comparison_migration.md
└── scripts/
    ├── build_readme_en.js
    └── build_readme_es.js
```

---

## The 6 Agents

| # | Agent | Role | Gate |
|---|-------|------|------|
| 01 | **SCOUT** | coverage_universe_optimizer | alpha_score >= 70 |
| 02 | **INTEL** | information_hub | news_score >= 40 / MNPI = HALT |
| 03 | **CRITICAL FACTOR** | thesis_engine | eps_impact >= 5% / 0 factors = DROP |
| 04 | **FORENSIC** | risk_and_trust_engine | SEV-5 = BLOCK |
| 05 | **VALUATION** | price_target_engine | RR >= 2:1 and gap >= 5% |
| 06 | **COMMUNICATION** | publication_gate | ENTER 5/5 = PUBLISH |

---

## Operating Modes

| | Valentine | Gunn | Dual |
|-|-----------|------|------|
| Horizon | 12 months | 5 years | 3 years |
| Output | Flash Note | Initiation Report | Both |
| Trigger | 0-1 Gunn flags + catalyst | 2+ Gunn flags | 1 flag + catalyst |
| Exclusive | FaVeS score | Build-to-Last + IC Premium | Both |

---

## Pipeline
```
Idea > SCOUT > INTEL > CRITICAL FACTOR > FORENSIC > VALUATION > COMMUNICATION > Publish
         |        |            |               |           |              |
        DROP    HALT         DROP           BLOCK        DROP           DROP
```

---

## Fallback Hierarchy

| Level | Trigger | Confidence penalty |
|-------|---------|-------------------|
| L1 | Primary source timeout, use cache | -0.05 to -0.12 |
| L2 | Cache miss, use alternative source | -0.15 to -0.20 |
| Last | All sources down, manual input | -0.25 to -0.30 |

Invariants that never break:
- FORENSIC cannot be skipped (PAUSE max 30 min)
- MNPI = absolute HALT, zero fallback
- Confidence < 0.50 = NO_PUBLISH

---

## Alpha Score (Scout)
```
base  = (coverage_gap * 0.30) + (market_cap_fit * 0.20)
      + (sector_relevance * 0.25) + (valuation_anomaly * 0.25)

bonus = em_gdp_below_15k (+10) + bessembinder_flag (+10)
      + low_coverage_flag (+5)   # max +25

total = MIN(base + bonus, 100)
```

- >= 70 → MUST_COVER
- 65-70 → REVIEW_ZONE
- < 65  → DROP (rescreen after 90 days)

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
| **E** Edge | Idea is different from consensus |
| **N** New | Not yet reflected in price |
| **T** Timely | Active catalyst present |
| **E** Examples | 3+ data points cited in section D |
| **R** Revealing | Changes analyst perspective |

5/5 = PUBLISH · 4/5 = HOLD (2hr timeout) · <=3/5 = DROP

---

## Output Formats

| Format | SLA | Cost | Model |
|--------|-----|------|-------|
| ALERT | 30 min | $0.008 | Sonnet |
| FLASH NOTE | 2 hrs | $0.035 | Opus |
| QUARTERLY UPDATE | same day | $0.020 | Sonnet |
| INITIATION REPORT | 72 hrs | $0.120 | Opus |

All notes use CASCADE format:
**C**onclusion → **A**ction → **S**cenario → **C**atalysts → **D**ata

---

## Cost Breakdown

| Agent | Flash Note | Initiation | Model |
|-------|-----------|------------|-------|
| Scout | $0.003 | $0.003 | Sonnet |
| Intel | $0.005 | $0.005 | Sonnet |
| Critical Factor | $0.008 | $0.008 | Sonnet |
| Forensic | $0.004 | $0.080 | Sonnet |
| Valuation | $0.018 | $0.018 | Opus |
| Communication | $0.035 | $0.120 | Opus |
| **TOTAL** | **$0.073** | **$0.234** | |

---

## Accuracy Targets

| Agent | Current | Target | Gap |
|-------|---------|--------|-----|
| Scout | 82% | 85% | -3pp |
| Intel | 79% | 82% | -3pp |
| Critical Factor | 76% | 80% | -4pp |
| Forensic | 88% | 90% | -2pp |
| **Valuation** | **71%** | **76%** | **-5pp ← priority** |
| Communication | 91% | 92% | -1pp |

---

## Implementation Plan

| Phase | Agent(s) | Duration | Acceptance criteria |
|-------|----------|----------|---------------------|
| 1 | SCOUT + MCPs | 1 week | T01 PASS, drop rate 30-40% |
| 2 | FORENSIC Quick Scan | 1 week | False positive < 8% |
| 3 | INTEL + MNPI | 1 week | T08 HALT confirmed |
| 4 | FORENSIC Full Scan | 1 week | Full SEV taxonomy |
| 5 | CRITICAL FACTOR | 1 week | Scenarios sum=1.0 |
| 6 | VALUATION | 1 week | PT hit rate > 50% |
| 7 | COMMUNICATION | 1 week | CASCADE 100%, SLA met |
| 8 | Integration | 2 weeks | End-to-end SMCI T01 |

**Total: 10 weeks**
**Critical milestone: August 2026** — first CalibrationRun with 50+ outcomes

---

## Doc Builder
```bash
npm install -g docx
node scripts/build_readme_en.js   # efrain_ai_README_EN.docx
node scripts/build_readme_es.js   # efrain_ai_README_ES.docx
```

---

*Efrain AI · v2.2.0 · February 2026*
