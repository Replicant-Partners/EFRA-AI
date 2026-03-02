# Test Queries — Efrain AI v2.2.0

10 test queries · 136 assertions · 24 critical assertions

---

## T01 · Full Valentine Pipeline — SMCI

**Purpose:** End-to-end pipeline validation, Valentine mode
**Input:** ticker=SMCI, catalyst="Q2 earnings beat + server rack backlog"

**Critical assertions (must pass):**
- [ ] alpha_score.total >= 70
- [ ] downstream_mode = "valentine"
- [ ] mosaic_clear = true
- [ ] factors.length >= 2
- [ ] scenario_probs.sum = 1.0 (tolerance 0.001)
- [ ] forensic.recommendation IN (clear, conditional)
- [ ] valuation.rr_ratio >= 2.0
- [ ] enter_gate.effective_score = 5
- [ ] publication.output_type = "FLASH_NOTE"
- [ ] publication.sla_met = true

**Non-critical assertions:**
- [ ] alpha_score.total >= 75 (expected 83)
- [ ] intel.surfaced_count >= 8
- [ ] forensic.flags.length >= 1 (going concern expected)
- [ ] valuation.faves_score >= 6
- [ ] audit_trail.total_confidence >= 0.65

---

## T02 · Full Gunn Pipeline — NuBank

**Purpose:** End-to-end Gunn mode with Build-to-Last
**Input:** ticker=NUBR3, catalyst="5Y LATAM expansion"

**Critical assertions:**
- [ ] downstream_mode = "gunn"
- [ ] horizon_tag = "COMPOUNDER"
- [ ] gunn_bonus >= 10
- [ ] build_to_last_score IS NOT NULL
- [ ] factors[0].horizon_months >= 36
- [ ] valuation.pt_5y IS NOT NULL
- [ ] valuation.ic_premium > 0
- [ ] publication.output_type = "INITIATION_REPORT"

**Non-critical assertions:**
- [ ] gunn_bonus = 25 (all three EM flags triggered)
- [ ] build_to_last_score.total >= 7.0
- [ ] valuation.rr_ratio >= 2.5
- [ ] audit_trail.total_confidence >= 0.80

---

## T03 · Dual Mode Pipeline — MercadoLibre

**Purpose:** Dual mode with Flash Note + Initiation queued
**Input:** ticker=MELI, catalyst="Q3 fintech beat + LATAM logistics moat"

**Critical assertions:**
- [ ] downstream_mode = "dual"
- [ ] publication.output_type = "FLASH_NOTE"
- [ ] initiation_queued = true
- [ ] initiation_eta_hours <= 72

**Non-critical assertions:**
- [ ] alpha_score.gunn_bonus >= 10
- [ ] flash_note.sla_met = true
- [ ] audit_trail.fallback_flags.length = 0 (clean run)

---

## T04 · Scout DROP — Low Alpha Score

**Purpose:** Verify Scout correctly drops low-value ideas
**Input:** ticker=XYZ_LOW, engineered to produce alpha_score < 65

**Critical assertions:**
- [ ] decision = "DROP"
- [ ] rescreen_eligible_after IS NOT NULL
- [ ] pipeline_stopped_at = "SCOUT"
- [ ] downstream agents NOT called (intel, cf, forensic, valuation, communication)

**Non-critical assertions:**
- [ ] rescreen_eligible_after = today + 90 days
- [ ] drop_reason IS NOT NULL

---

## T05 · Scout REVIEW_ZONE — Boundary Case

**Purpose:** Verify REVIEW_ZONE routing at 65-70 boundary
**Input:** ticker=XYZ_MID, engineered to produce alpha_score 65-70

**Critical assertions:**
- [ ] decision = "REVIEW_ZONE"
- [ ] pipeline_paused = true
- [ ] analyst_notification_sent = true
- [ ] downstream agents NOT auto-advanced

**Non-critical assertions:**
- [ ] score_breakdown provided to analyst
- [ ] timeout_at = created_at + 48hrs
- [ ] analyst_options = ["advance", "drop", "recontextualize"]

---

## T06 · Forensic BLOCK — SEV-5 Flag

**Purpose:** Verify pipeline stops permanently on fraud/restatement
**Input:** ticker=FRAUD_CO, inject SEV-5 flag in forensic run

**Critical assertions:**
- [ ] forensic.recommendation = "BLOCK"
- [ ] pipeline_stopped_at = "FORENSIC"
- [ ] publication_possible = false
- [ ] rescreen_eligible = false
- [ ] buy_rating_blocked = true

**Non-critical assertions:**
- [ ] forensic.risk_score >= 75
- [ ] audit_trail.fallback_flags CONTAINS "FORENSIC_BLOCK_SEV5"
- [ ] analyst_notified = true

---

## T07 · CF DROP — No Material Factors

**Purpose:** Verify DROP when no factors meet threshold even after relaxation
**Input:** ticker=FLAT_CO, all eps_impacts engineered < 3%

**Critical assertions:**
- [ ] threshold_relaxed_to_3pct = true
- [ ] decision = "DROP"
- [ ] pipeline_stopped_at = "CRITICAL_FACTOR"
- [ ] drop_reason CONTAINS "No material factors"

**Non-critical assertions:**
- [ ] original_threshold = 0.05 (Valentine)
- [ ] relaxed_threshold = 0.03
- [ ] factors_found_at_relaxed = 0

---

## T08 · MNPI Detection — Absolute Halt

**Purpose:** Verify MNPI triggers compliance halt with zero exceptions
**Input:** ticker=XYZ, inject MNPI item with confidence 0.94 in news feed

**Critical assertions (STRICTEST in system — all must pass):**
- [ ] mnpi_flag = true
- [ ] pipeline_status = "COMPLIANCE_HALT"
- [ ] publication_possible = false
- [ ] evidence_preserved = true
- [ ] audit_trail_locked = true
- [ ] compliance_notified = true
- [ ] minutes_to_notify <= 30
- [ ] downstream agents NOT called after Intel
- [ ] item NOT deleted from database
- [ ] NO fallback attempted

**Note:** T08 must pass before any production deployment.
If T08 fails for any reason — halt deployment immediately.

---

## T09 · Forensic CONDITIONAL — Going Concern

**Purpose:** Verify CONDITIONAL routing with SEV-4 (not BLOCK)
**Input:** ticker=GOING_CONCERN_CO, inject SEV-4 going concern flag

**Critical assertions:**
- [ ] forensic.recommendation = "CONDITIONAL"
- [ ] eps_haircut_total >= 0.20
- [ ] dr_add_bps_total >= 200
- [ ] buy_rating_blocked = false
- [ ] pipeline_continues = true

**Non-critical assertions:**
- [ ] forensic.risk_score >= 60
- [ ] valuation.pt_12m reflects haircut (lower than pre-haircut)
- [ ] audit_trail.fallback_flags CONTAINS "FORENSIC_CONDITIONAL"
- [ ] cascade.conclusion MENTIONS going concern caveat

---

## T10 · Full Fallback Cascade — All MCPs Down

**Purpose:** Verify graceful degradation under maximum simultaneous failure
**Input:** ticker=AAPL, all external MCPs = DOWN

**Critical assertions:**
- [ ] fallback_l1_activated = true
- [ ] fallback_l2_activated = true
- [ ] fallback_last_activated = true
- [ ] audit_trail.total_confidence >= 0.50
- [ ] audit_trail.fallback_flags.length >= 3
- [ ] publication proceeds (confidence above floor)
- [ ] analyst_inputs_required IS NOT NULL

**Non-critical assertions:**
- [ ] fallback_flags CONTAINS "SCOUT_FINANCIAL_DATA_FROM_CACHE"
- [ ] fallback_flags CONTAINS "VALUATION_LAST_FALLBACK_ACTIVATED"
- [ ] note footer CONTAINS confidence warning
- [ ] audit_trail.total_confidence between 0.50 and 0.70

---

## Running the Test Suite
```python
# Each test follows this pattern
def run_test(test_id, input_payload, inject_conditions=None):
    pipeline = EfrainPipeline()
    if inject_conditions:
        pipeline.inject(inject_conditions)
    result = pipeline.run(input_payload)
    return assert_all(result, TEST_ASSERTIONS[test_id])

# Run all tests
results = [run_test(f"T{i:02d}", INPUTS[i], INJECTIONS.get(i)) for i in range(1, 11)]

# T08 is mandatory gate before any deployment
assert results["T08"].all_critical_pass(), "HALT: T08 MNPI test failed. Deployment blocked."

# Summary
critical_failures = [r for r in results if not r.all_critical_pass()]
print(f"{len(results) - len(critical_failures)}/10 tests passing all critical assertions")
```

**Deployment gate rule:**
- All 10 tests must pass non-critical assertions before staging
- All 10 tests must pass critical assertions before production
- T08 failure = immediate deployment halt, no exceptions
