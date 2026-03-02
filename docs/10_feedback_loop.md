# Feedback Loop — Efrain AI v2.2.0

---

## Overview

The feedback loop connects analyst observations back to system improvements.
It operates in parallel with CalibrationRun but at a different speed:
- Feedback Loop: days (symptom detection)
- CalibrationRun: months (statistical confirmation)

Neither replaces the other. Both are required.

---

## AgentFeedback Schema
```sql
id UUID PK
publication_id FK → Publication
analyst_id FK → Analyst
agent_name VARCHAR         -- which agent caused the issue
issue_type VARCHAR         -- see taxonomy below
description TEXT           -- free text from analyst
severity ENUM(1_critical, 2_high, 3_medium, 4_low)
resolution_status ENUM(open, in_review, resolved, wont_fix)
created_at TIMESTAMP
resolved_at TIMESTAMP (nullable)
```

---

## Feedback Taxonomy (12 issue types)

| issue_type | Description | Routes to |
|------------|-------------|-----------|
| output_quality | Note reads poorly, wrong tone, formatting issues | prompt_engineering |
| wrong_decision | Agent made wrong gate decision (DROP, BLOCK, HOLD) | calibration_plan |
| missing_factor | CF missed a material factor analyst expected | cf_threshold_review |
| false_flag | Forensic flagged something that was not a real issue | forensic_taxonomy |
| missed_flag | Forensic missed a real issue that was there | forensic_taxonomy |
| pt_too_high | Published PT significantly above analyst judgment | valuation_weights |
| pt_too_low | Published PT significantly below analyst judgment | valuation_weights |
| format_issue | CASCADE structure violated, section missing | communication_template |
| sla_breach | SLA not met, no L2 fallback activated | infrastructure_review |
| mnpi_concern | Analyst suspects MNPI in published content | compliance_immediate |
| calibration_note | Analyst provides context for CalibrationRun | calibration_plan |
| other | Anything else | analyst_review |

---

## Severity Definitions

| Severity | Definition | SLA |
|----------|------------|-----|
| 1 Critical | System published content with potential MNPI, or missed a SEV-5 flag | 24 hours |
| 1 Critical | Gate made wrong decision that caused real P&L impact | 24 hours |
| 2 High | Systematic error visible across 2+ publications | 1 week |
| 2 High | Wrong decision that was caught before P&L impact | 1 week |
| 3 Medium | Single publication quality issue | 2 weeks |
| 3 Medium | Minor calibration drift noticed | 2 weeks |
| 4 Low | Formatting, tone, minor improvements | Next sprint |

---

## Expected Feedback Volume

| Period | Expected feedbacks | Severity breakdown |
|--------|-------------------|-------------------|
| Monthly | ~4 feedbacks | 0-1 critical, 1-2 high, 2-3 medium |
| Quarterly | ~12 feedbacks | 1 critical, 3-4 high, 6-8 medium |
| Annual | ~45 feedbacks | 3-4 critical, 12-15 high, 25-28 medium |

At this volume, pattern detection requires 3-4 months before a systematic
issue becomes statistically visible. Single feedbacks are signals, not facts.

---

## Pattern Detection Rules

A pattern is declared when:
```
Same issue_type + same agent_name
  appearing >= 2 times
  within 30 days
  → PATTERN FLAG (investigate)

Same issue_type + same agent_name
  appearing >= 3 times
  within 30 days
  → ESCALATE (mandatory action required)
```

Single feedbacks without pattern:
- Logged and tracked
- Reviewed in monthly CalibrationRun
- No immediate action unless severity = 1_critical

---

## Complete Feedback Cycle — Example

**Scenario:** CF agent missing regulatory factors in Brazilian financial companies

### Week 1 — Signal
```
Feedback #1:
  agent_name: critical_factor
  issue_type: missing_factor
  description: "NUBR3 analysis missed BACEN regulatory capital requirement
                as a material factor. EPS impact easily > 4%."
  severity: 2_high
  created_at: 2026-03-07

Feedback #2:
  agent_name: critical_factor
  issue_type: missing_factor
  description: "ITUB4 also missing BACEN factor. Same pattern as NUBR3."
  severity: 2_high
  created_at: 2026-03-12
```

Pattern flag triggered: 2x missing_factor + critical_factor within 30 days.

### Week 2 — Diagnosis
```
Root cause analysis:
  CF threshold for regulatory eps_impact = 5% (Valentine standard)
  Brazilian bank regulatory factors typically produce 3-4% eps_impact
  Threshold too strict for this jurisdiction + sector combination

Proposed intervention:
  Add sector-jurisdiction override table:
  - Brazilian financials: eps_impact threshold = 3% for regulatory factors
  - Scope: only factors with factor_type = "regulatory" AND country = "Brazil"
  - Does not affect non-regulatory factors or non-Brazil companies
```

### Week 3 — Validation
```
Staging test:
  Run 5 historical Brazilian financial cases through updated CF agent
  Results:
    NUBR3: regulatory factor now captured (eps_impact 3.8%)
    ITUB4: regulatory factor now captured (eps_impact 4.1%)
    BBAS3: regulatory factor now captured (eps_impact 3.2%)
    BBDC4: no regulatory factor (correctly absent)
    SANB11: regulatory factor now captured (eps_impact 3.5%)

  4/5 previously missed factors now captured
  0 new false positives introduced

Analyst approval: confirmed
```

### Week 4 — Deploy and Close
```
Deploy to production:
  CF agent config updated with Brazil regulatory override
  sector_weight_version incremented to v1.1

Feedbacks closed:
  Feedback #1: resolved_at = 2026-03-28, resolution = "threshold override deployed"
  Feedback #2: resolved_at = 2026-03-28, resolution = "same fix"

CalibrationRun note added:
  "Brazil regulatory threshold override deployed 2026-03-28.
   Segment Brazilian financial outcomes separately in next CalibrationRun
   to measure impact."
```

---

## Feedback Loop vs CalibrationRun

| Dimension | Feedback Loop | CalibrationRun |
|-----------|--------------|----------------|
| Detects | Symptom (analyst notices) | Pattern (statistical) |
| Speed | Days | Months |
| Confidence | Low (1-2 data points) | High (50+ data points) |
| Action threshold | 2+ feedbacks = investigate | avg_conf_error > 0.15 = act |
| Risk of false positive | High | Low |
| Risk of false negative | Low | Medium |

**Rule:** Feedback Loop triggers investigation.
CalibrationRun confirms the fix worked.
Never deploy a calibration change based on feedback alone —
wait for CalibrationRun confirmation except for severity 1_critical.

---

## Severity 1 Critical — Fast Track Protocol

Severity 1 bypasses the normal 3-week cycle:
```
Severity 1 feedback received
  |
  v
Immediate: pause pipeline for affected agent (max 4hrs)
  |
  v
24hr diagnosis: root cause confirmed or ruled out
  |
  v
If confirmed:
  hotfix deployed to staging
  expedited analyst review (same day)
  deploy to production within 48hrs
  |
  v
If ruled out:
  downgrade to severity 2
  follow normal cycle
  |
  v
Post-mortem within 7 days:
  why did the system allow this?
  what detection failed?
  add assertion to test suite (T01-T10)
```

---

## Integration with AuditTrail

Every AgentFeedback links to a Publication which links to an AuditTrail.
This means every feedback is fully traceable:
```
AgentFeedback
  → Publication (what was published)
  → AuditTrail (how it was built)
    → AgentRunLog (what each agent did)
    → fallback_flags (what degraded)
    → total_confidence (system's own assessment)
```

This traceability answers the most important question after any feedback:
**"Did the system know it was uncertain, or did it fail confidently?"**

- High confidence + wrong output = calibration problem (systematic)
- Low confidence + wrong output = acceptable (system flagged uncertainty)
- High confidence + correct output = good signal for calibration
- Low confidence + correct output = lucky — investigate why confidence was low

---

## Monthly Feedback Review Checklist

Run this at the start of each CalibrationRun:
```
[ ] Count open feedbacks by severity
    → Any severity 1 open > 24hrs? Escalate immediately.
    → Any severity 2 open > 1 week? Assign owner.

[ ] Check for patterns
    → Any issue_type appearing >= 2x in last 30 days?
    → Any agent_name appearing >= 3x in last 30 days?

[ ] Cross-reference with CalibrationRun
    → Do feedback patterns match accuracy gaps?
    → Agent with most feedbacks = agent with largest accuracy gap?

[ ] Review resolved feedbacks
    → Were resolution actions actually deployed?
    → Any reopened feedbacks (same issue recurring)?

[ ] Update calibration_notes
    → Add context from feedback patterns to CalibrationRun notes
    → Flag any A/B tests that need outcome data
```

---

## Feedback Anti-Patterns to Avoid

| Anti-pattern | Why it's harmful | Correct approach |
|-------------|-----------------|-----------------|
| Calibrating on a single feedback | Sample size 1 is noise | Wait for pattern (2+ feedbacks) |
| Changing gate thresholds without A/B test | May fix one problem, create another | Always A/B on 20 notes first |
| Closing feedbacks without deploying fix | Creates false resolution signal | Only close when fix is in production |
| Treating all severity 4 as unimportant | Small issues cluster into patterns | Log everything, review monthly |
| Analyst overriding without AgentFeedback | System loses learning signal | Every override = one AgentFeedback |
| Mixing outage-period data in CalibrationRun | Contaminates clean accuracy signal | Segment fallback runs separately |
