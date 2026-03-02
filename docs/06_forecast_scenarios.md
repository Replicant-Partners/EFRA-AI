# Forecast Scenarios — Efrain AI v2.2.0

Five scenarios with uncertainty quantification.

---

## F01 · Base Case — System Launch (Feb 2026)

**Scenario:** System launches with heuristic parameters, 100 notes/year target

| Metric | Forecast | Confidence interval |
|--------|----------|---------------------|
| PT Hit Rate 12M | 52% | 44-60% |
| Flash Note SLA compliance | 73% | 65-80% |
| ENTER Pass Rate | 40% | 32-48% |
| Annual system cost | $10.52 | $8-$14 |
| MNPI false negative rate | 0.1% | 0-0.5% |

**Key assumption:** Parameters are heuristic (pre-calibration). Expect systematic
bias in Valuation until first CalibrationRun in August 2026.

**Biggest uncertainty:** Valuation accuracy — no real outcome data yet.
avg_conf_error expected: 0.14 (acceptable, pre-calibration range)

---

## F02 · Optimistic Case — Early Outperformance

**Scenario:** System beats sell-side average from month 1

| Metric | Forecast | Condition |
|--------|----------|-----------|
| PT Hit Rate 12M | 61% | Alpha quality > expected |
| Direction Accuracy | 67% | Gunn compounders outperform |
| Flash Note SLA | 85% | No major MCP outages |
| Annual cost | $9.80 | Lower DROP rate = fewer Scout runs |

**Probability: 20%**

**Key drivers:**
- Strong catalyst environment in tech + EM in H1 2026
- Gunn compounder cycle active (LATAM + SE Asia)
- Bloomberg and CapIQ uptime > 99.5%

**What to watch:** If PT hit rate > 58% in first 20 notes, recalibrate
upward. Do not over-fit to early outperformance — sample size too small.

---

## F03 · Pessimistic Case — Calibration Delayed

**Scenario:** Insufficient outcomes by Aug 2026, calibration milestone delayed

| Metric | Forecast | Impact |
|--------|----------|--------|
| PT Hit Rate 12M | 47% | Below sell-side average |
| CalibrationRun date | Feb 2027 | 6 month delay |
| Valuation accuracy | 68% | -3pp vs base case |
| ENTER Pass Rate | 32% | Tighter gate = fewer publications |

**Probability: 25%**

**Key drivers:**
- Low note volume (< 50 notes by Aug 2026)
- High DROP rate at Scout or CF reduces outcome pool
- MCP outages increase fallback frequency, lowering confidence

**Mitigation:**
- Increase target to 150 notes/year to accelerate CalibrationRun
- Lower REVIEW_ZONE threshold temporarily to 63 (not below 60)
- Run retrospective Shadow Tests on historical publications

---

## F04 · Stress Case — Multiple MCP Outages

**Scenario:** Bloomberg + CapIQ experience concurrent outages > 3x in a month

| Metric | Impact |
|--------|--------|
| Valuation accuracy | -8pp (sector averages used) |
| Flash Note SLA compliance | -15pp (Last fallback adds ~45 min) |
| avg_conf_error | +0.09 (systematic underconfidence) |
| Annual cost | +$2.10 (extra analyst time for manual inputs) |

**Probability: 15%**

**Response protocol:**
1. Activate internal sector average table immediately
2. Analyst manually provides consensus for all active ideas
3. Flag all publications from outage period in AuditTrail
4. Run CalibrationRun segment on outage-period publications separately
5. Do not mix outage-period outcomes with clean-run outcomes in calibration

**Key insight:** Outage-period publications will show systematically lower
confidence. Exclude from CalibrationRun to avoid contaminating agent weights.

---

## F05 · Meta-Forecast — System Accuracy on Its Own Performance

**Scenario:** How accurate is Efrain AI at predicting its own metrics?

This is the most intellectually honest scenario in the document.
The system applies its own methodology to evaluate itself.

| Prediction | Forecasted value | Confidence | Rationale |
|------------|-----------------|------------|-----------|
| PT hit rate at 12M | 58% | 0.62 | Pre-calibration estimate, wide interval |
| Valuation will have largest accuracy gap | TRUE | 0.81 | Consistent with method complexity |
| MNPI detected correctly in all cases | TRUE | 0.94 | Binary, deterministic protocol |
| First CalibrationRun Aug 2026 | TRUE | 0.71 | Depends on note volume |
| Communication will have smallest gap | TRUE | 0.77 | Opus + structured ENTER gate |
| Base hit rate > sell-side avg | FALSE | 0.55 | Pre-calibration likely below 58% |

**Base hit rate forecast for the forecasts themselves: 58%**

The system predicts it will be right on 58% of its own predictions.
avg_conf_error on meta-forecasts: 0.12 (acceptable, pre-calibration)

**What this means practically:**
- Do not treat forecasts as targets — treat them as priors
- Update priors aggressively when first 20 outcomes arrive
- The CalibrationRun in Aug 2026 will show how wrong these forecasts were
- Being wrong by < 8pp on any metric = well-calibrated for pre-launch estimates
- Being wrong by > 15pp on any metric = recalibrate immediately, do not wait for Aug
