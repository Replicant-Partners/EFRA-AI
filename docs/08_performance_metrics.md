# Performance Metrics — Efrain AI v2.2.0

---

## System Dashboard

| Metric | Value |
|--------|-------|
| Cost per Flash Note | $0.073 |
| Cost per Initiation Report | $0.234 |
| Cost per Alert | $0.008 |
| Cost per Quarterly Update | $0.020 |
| Annual cost (100 notes) | $10.52 |
| Bloomberg Terminal equivalent | $50,000/year |
| End-to-end time Flash Note | ~3.3 minutes |
| End-to-end time Initiation | ~14 hours |
| End-to-end time Alert | ~30 minutes |

---

## Accuracy by Agent

| Agent | Current | Target | Gap | Priority | Primary calibration lever |
|-------|---------|--------|-----|----------|--------------------------|
| Scout | 82% | 85% | -3pp | Medium | Alpha weight regression |
| Intel | 79% | 82% | -3pp | Medium | news_score weight recalibration |
| Critical Factor | 76% | 80% | -4pp | High | Adaptive EPS threshold by cycle phase |
| Forensic | 88% | 90% | -2pp | Low | EM jurisdiction exception rules |
| **Valuation** | **71%** | **76%** | **-5pp** | **HIGHEST** | **Data freshness + sector weights** |
| Communication | 91% | 92% | -1pp | Low | Minor ENTER gate tuning |

Valuation has the largest gap (-5pp) and the highest cost weight (24.7% of Flash Note).
Highest calibration priority by both dimensions.

---

## System KPIs

| KPI | Target | Benchmark | Notes |
|-----|--------|-----------|-------|
| PT Hit Rate 12M | 58% | Sell-side avg: 50-55% | +8pp differential alpha |
| Direction Accuracy | 62% | Sell-side avg: 55-60% | Bull/Bear direction correct |
| MNPI Detection Rate | 99.9% | Zero false negatives | Regulatory requirement |
| Forensic False Positive | < 5% | Legitimate cos blocked | Quality of life metric |
| Forensic False Negative | < 2% | Real flags missed | Risk metric |
| ENTER Pass Rate | 35-50% | Quality over quantity | Too high = gate too loose |
| Flash Note SLA | 80% in < 2hrs | Internal target | |
| Alpha DROP Rate | 30-40% | Scout efficiency | Too low = gate too loose |
| avg_conf_error | < 0.15 | Well-calibrated range | From CalibrationRun |

---

## Cost Breakdown by Agent

### Flash Note ($0.073 total)

| Agent | Cost | % of total | Tokens est. | Model |
|-------|------|------------|-------------|-------|
| Scout | $0.003 | 4.1% | ~2,000 in / ~500 out | claude-sonnet-4-6 |
| Intel | $0.005 | 6.8% | ~3,500 in / ~800 out | claude-sonnet-4-6 |
| Critical Factor | $0.008 | 11.0% | ~5,000 in / ~1,200 out | claude-sonnet-4-6 |
| Forensic (Quick) | $0.004 | 5.5% | ~2,500 in / ~600 out | claude-sonnet-4-6 |
| Valuation | $0.018 | 24.7% | ~4,000 in / ~2,000 out | claude-opus-4-6 |
| Communication | $0.035 | 47.9% | ~8,000 in / ~3,000 out | claude-opus-4-6 |
| **TOTAL** | **$0.073** | **100%** | | |

### Initiation Report ($0.234 total)

| Agent | Cost | Delta vs Flash | Reason |
|-------|------|---------------|--------|
| Scout | $0.003 | = | Same run |
| Intel | $0.005 | = | Same run |
| Critical Factor | $0.008 | = | Same run |
| Forensic (Full) | $0.080 | +$0.076 | Full 120s scan vs 8s Quick |
| Valuation | $0.018 | = | Same run |
| Communication | $0.120 | +$0.085 | 8-15 page Initiation vs 2 page Flash |
| **TOTAL** | **$0.234** | **+$0.161** | |

---

## Cost Optimization Opportunities

### Opportunity 1 — Switch ALERTs from Opus to Sonnet
- Current ALERT cost: $0.025 (Opus)
- Optimized ALERT cost: $0.008 (Sonnet)
- Savings per ALERT: $0.017 (77%)
- Quality impact: < 1pp accuracy loss on 150-word outputs
- Implementation: change model parameter in Communication config
- Annual savings at 20 ALERTs/month: $4.08/year

### Opportunity 2 — Cache Forensic Quick Scan results
- Quick Scan for same ticker within 72h returns cached result
- Saves $0.004 per re-evaluation of same company
- Risk: stale flags if news breaks within 72h window
- Mitigation: cache invalidated on any new 8-K or news_score > 70 item

### Opportunity 3 — Scout batch processing
- Run Scout on 10 ideas simultaneously vs sequentially
- No quality impact (Scout is independent per ticker)
- Latency reduction: 10 × 800ms → ~1,200ms for batch of 10
- Cost: no change (same tokens processed)

---

## Benchmark: Efrain AI vs Sell-Side

| Dimension | Sell-Side Analyst | Efrain AI | Delta |
|-----------|-------------------|-----------|-------|
| PT Hit Rate 12M | 50-55% | 58% target | +3 to +8pp |
| Direction Accuracy | 55-60% | 62% target | +2 to +7pp |
| Cost per Flash Note | ~$400-$800 (analyst time) | $0.073 | -99.99% |
| Time to Flash Note | 2-4 hours | 3.3 minutes | -97% |
| Coverage capacity | 15-25 companies | Unlimited | — |
| Bias documentation | None | Full AuditTrail | — |
| MNPI detection | Manual / inconsistent | 99.9% systematic | — |
| Calibration loop | None | Monthly CalibrationRun | — |

**Important framing:** These are complementary, not competing.
Efrain AI handles structured analysis. The analyst provides judgment,
relationships, and the final publication decision.

---

## ROI Calculation
```
Annual system cost (100 notes):     $10.52
Bloomberg Terminal (1 analyst):     $50,000/year

Differential alpha value:
  +8pp hit rate × 100 ideas × $500/idea = $40,000/year

Implied ROI: $40,000 / $10.52 = ~3,800x on system cost

Break-even: $10.52 / 100 ideas = $0.11 per idea
  Any single idea that generates > $0.11 of value pays for the year.
```

---

## Monthly Metrics Tracking

What to measure every month and what to do with it:

| Metric | Source | Action if off-target |
|--------|--------|---------------------|
| Flash Note SLA compliance | AuditTrail | If < 70% → check Communication L2 frequency |
| ENTER Pass Rate | EnterGateResult | If > 55% → tighten Edge criterion |
| Alpha DROP Rate | AlphaScore | If < 25% → review Scout threshold |
| avg_conf_error | CalibrationRun | If > 0.15 → prompt review for flagged agent |
| Fallback flag frequency | AuditTrail | If L2+ > 20% of runs → MCP reliability review |
| Forensic false positive | ForensicProfile | If > 8% → review SEV-2 thresholds |
| MNPI detection | ComplianceLog | Any false negative = immediate review |

---

## Accuracy Calibration History

To be populated as CalibrationRuns complete:

| Date | Scout | Intel | CF | Forensic | Valuation | Communication | Notes |
|------|-------|-------|-----|----------|-----------|---------------|-------|
| Feb 2026 | 82% | 79% | 76% | 88% | 71% | 91% | Launch baseline (heuristic) |
| Aug 2026 | — | — | — | — | — | — | First CalibrationRun |
| Nov 2026 | — | — | — | — | — | — | Post Valuation recalibration |
| Feb 2027 | — | — | — | — | — | — | Full annual cycle |
