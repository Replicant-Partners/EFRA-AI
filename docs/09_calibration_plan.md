# Calibration Plan — Efrain AI v2.2.0

---

## Data Level Requirements

| Level | Outcomes needed | Calibration type |
|-------|----------------|------------------|
| Nivel 0 | 0 | No calibration — launch with heuristic parameters |
| Nivel 1 | < 10 | Do not calibrate — insufficient signal |
| Nivel 2 | 10-20 | Directional signal only — observe, do not act |
| Nivel 3 | 20-50 | Tentative calibration — A/B test before deploying |
| Nivel 4 | >= 50 | Reliable calibration — deploy with confidence |

**At 100 notes/year:** First Nivel 4 CalibrationRun = August 2026 (~6 months post-launch)
**At 50 notes/year:** First Nivel 4 CalibrationRun = February 2027 (12 months post-launch)

---

## Calibration Priority by Agent

Priority score = accuracy_gap × cost_weight

| Agent | Accuracy gap | Cost weight | Priority score | Rank |
|-------|-------------|-------------|----------------|------|
| Valuation | -5pp | 0.247 | **0.124** | **1** |
| Communication | -1pp | 0.479 | 0.048 | 2 |
| Critical Factor | -4pp | 0.110 | 0.044 | 3 |
| Intel | -3pp | 0.068 | 0.020 | 4 |
| Scout | -3pp | 0.041 | 0.012 | 5 |
| Forensic | -2pp | 0.055 | 0.011 | 6 |

Communication ranks 2nd despite small gap because it dominates cost (47.9%).
Even a -1pp improvement on Communication saves more than -4pp on Critical Factor.

---

## Valuation Agent — Three Distinct Problems

Valuation has the largest gap and requires three separate interventions.
Do not conflate them — each needs its own calibration data.

### Problem 1 · Bloomberg data staleness
- **Symptom:** PT calculated on data that is 24-48h old during fast markets
- **Detection:** CalibrationRun shows systematic PT error clustering on
  high-volatility days vs low-volatility days
- **Fix:** Add data freshness check. If data > 4h old during market hours
  → force refresh before calculating PT
- **Data required:** Nivel 3 (20+ outcomes with timestamp metadata)
- **Implementation:** Add `data_age_hours` field to ValuationModel.
  Flag if > 4h. Refresh MCP call if flagged.

### Problem 2 · Uniform sector weights
- **Symptom:** PE-heavy sectors (Consumer Staples) show lower accuracy
  than DCF-heavy sectors (Fintech pre-revenue)
- **Detection:** CalibrationRun segmented by sector shows differential
  hit rates. If Fintech hit rate > Consumer Staples by > 8pp → weights
  are misaligned
- **Fix:** Sector-specific weight tables calibrated from real outcome data.
  Replace current static table with regression-fitted weights.
- **Data required:** Nivel 4 (50+ outcomes, minimum 5 per sector)
- **Implementation:** Add `sector_weight_version` to ValuationModel.
  v1 = current static, v2 = regression-fitted (post Aug 2026)

### Problem 3 · Subjective IC Premium (Gunn mode)
- **Symptom:** IC Premium varies too widely between analysts on same company.
  Inter-analyst variance > 0.5 for same ticker in same week.
- **Detection:** Query ValuationModel where ic_premium IS NOT NULL,
  group by company_id, measure stddev. Target stddev < 0.2.
- **Fix:** Calibrate IC Premium against actual 5Y return outcomes.
  Narrow range to 0-1.0 until calibrated (currently 0-1.5).
- **Data required:** Nivel 4 + 5Y lookback (not available until 2031)
- **Interim fix:** Cap IC Premium at 1.0. Require justification > 0.8.
  Add `ic_premium_justification TEXT` to ValuationModel.

---

## Scout Calibration

### Problem · Alpha weight regression
- **Symptom:** coverage_gap_score weighted at 30% but may not be
  the strongest predictor of eventual PT hit rate
- **Detection:** Run regression: PT hit rate ~ coverage_gap + market_cap_fit
  + sector_relevance + valuation_anomaly + gunn_bonus
- **Fix:** Replace equal-ish weights (30/20/25/25) with regression coefficients
- **Data required:** Nivel 4 (50+ outcomes with alpha score breakdown)
- **Risk:** Regression on 50 observations is noisy. A/B test for 30 notes
  before full rollout.

### What NOT to change in Scout
- The 70-point threshold (this is a business decision, not statistical)
- The 65-70 REVIEW_ZONE boundaries (human judgment zone by design)
- The 90-day rescreen period (operational constraint)
- The gunn_bonus caps (+10/+10/+5) — change only after 5Y data available

---

## Intel Calibration

### Problem · news_score weight recalibration
- **Symptom:** eps_impact weight (0.30) may be too high vs keyword_match (0.25)
  for short-horizon ideas. Keyword proximity predicts better at < 3 months.
- **Detection:** Segment CalibrationRun by horizon_tag.
  If SHORT ideas have lower hit rate than COMPOUNDER → eps_impact
  weight too dominant for short horizon.
- **Fix:** Mode-specific news_score weights:
  - Valentine: keyword_match 0.35, eps_impact 0.25, source_quality 0.25, timeliness 0.15
  - Gunn: keyword_match 0.20, eps_impact 0.40, source_quality 0.25, timeliness 0.15
- **Data required:** Nivel 3 (20+ outcomes, 10 per mode minimum)

---

## Critical Factor Calibration

### Problem · Adaptive EPS threshold by market phase
- **Symptom:** 5% EPS threshold was calibrated in a normal volatility environment.
  In high-volatility periods, more ideas drop at CF unnecessarily.
- **Detection:** Compare DROP rate at CF across VIX quintiles.
  If DROP rate > 50% when VIX > 30 → threshold too strict for volatile markets.
- **Fix:** Add VIX-based threshold adjustment:
  - VIX < 20: threshold = 5% (Valentine), 4% (Gunn)
  - VIX 20-30: threshold = 4% (Valentine), 3.5% (Gunn)
  - VIX > 30: threshold = 3% (Valentine), 2.5% (Gunn)
- **Data required:** Nivel 3 + VIX data in AgentRunLog

---

## Forensic Calibration

### Problem · EM jurisdiction exceptions
- **Symptom:** Forensic false positive rate > 5% for EM companies
  because 10-K delay flags (sev3) are common and expected in some jurisdictions
- **Detection:** Segment false positives by country.
  If Brazil / Mexico / Indonesia show > 10% false positive → jurisdiction rules needed.
- **Fix:** Add jurisdiction exception table:
  - Brazil: 10-K delay < 60 days = sev1 (not sev3)
  - Mexico: COB separation not required if family-controlled
  - Indonesia: Governance standard = local BAPEPAM, not SEC
- **Data required:** Nivel 2 (10+ EM company outcomes per jurisdiction)

---

## Communication Calibration

### Problem · ENTER Gate minor tuning
- **Symptom:** Edge criterion (E) fails most often but published notes
  with Edge=false have similar actual hit rates to Edge=true
- **Detection:** Compare PT hit rate for publications where Edge barely
  passed (score 7-8) vs barely failed (score 5-6). If < 3pp difference
  → Edge criterion threshold too strict.
- **Fix:** Lower Edge minimum score from 7 to 6 within the criterion.
  Do not remove the criterion — adjust the internal threshold.
- **Data required:** Nivel 3 (need Edge score metadata in EnterGateResult)
- **Implementation:** Add `edge_score INT` to EnterGateResult table.
  Currently only edge_pass BOOLEAN is stored.

---

## What NOT to Calibrate

Some parameters are set by design and must not be changed by CalibrationRun:

| Parameter | Reason |
|-----------|--------|
| ENTER Gate 5 criteria structure | Editorial standard, not statistical |
| MNPI detection threshold (0.85) | Regulatory requirement, zero tolerance |
| RR >= 2:1 gate | Risk management floor, not a forecast |
| FORENSIC cannot be skipped | Compliance invariant |
| Confidence floor 0.50 | Risk management floor |
| 30 min Forensic PAUSE maximum | SLA constraint |
| 90 day rescreen period | Operational constraint |

---

## CalibrationRun Protocol
```
Monthly CalibrationRun (runs automatically on 1st of each month):

Step 1: Aggregate
  SELECT * FROM prediction_outcomes
  WHERE horizon_date <= TODAY()
  AND evaluated_at IS NULL

Step 2: Evaluate
  FOR each outcome:
    price_at_horizon = fetch_price(ticker, horizon_date)
    hit_rate_achieved = ABS(price_at_horizon - pt_published) / pt_published < 0.10
    direction_correct = sign(price_at_horizon - entry_price) = sign(pt_published - entry_price)
    pct_error = (price_at_horizon - pt_published) / pt_published
    UPDATE prediction_outcomes SET evaluated fields

Step 3: Aggregate by agent
  FOR each agent:
    hit_rate = AVG(hit_rate_achieved)
    direction_accuracy = AVG(direction_correct)
    avg_conf_error = AVG(ABS(confidence - hit_rate_achieved))

Step 4: Flag
  IF avg_conf_error > 0.15 → flag agent for prompt review
  IF hit_rate < 0.50 → flag agent for threshold review
  IF outcomes_count < 10 → skip (insufficient data)

Step 5: Report
  INSERT INTO calibration_runs (all metrics, calibration_action, notes)
  Notify analyst with CalibrationReport

Step 6: Analyst approves interventions
  A/B test on next 20 notes before full rollout
  Deploy only after A/B confirms improvement
```

---

## Calibration Timeline

| Date | Event | Data level | Expected action |
|------|-------|------------|-----------------|
| Feb 2026 | Launch | Nivel 0 | Heuristic parameters |
| Apr 2026 | 20 notes | Nivel 2 | Observe only, no changes |
| Aug 2026 | 50 notes | Nivel 4 | First real CalibrationRun |
| Nov 2026 | Valuation recalibration | Nivel 4+ | Sector weight v2 deployment |
| Feb 2027 | Full annual cycle | Nivel 4++ | All agents recalibrated |
| 2031 | IC Premium | Long-term | Real 5Y outcome data |

**Rule:** Never deploy a calibration change based on < 20 outcomes.
Intuition is not calibration. CalibrationRun is calibration.
