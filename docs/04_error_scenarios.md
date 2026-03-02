# Error Scenarios — Efrain AI v2.2.0

24 failure scenarios with L1/L2/Last recovery protocols.

---

## Scout Errors (4 scenarios)

### E01 · financial_data_mcp timeout
- **Trigger:** MCP response > 5s
- **L1:** Use local cache (TTL 24h). Flag: SCOUT_FINANCIAL_DATA_FROM_CACHE. conf_adj: -0.05
- **L2:** Cache stale or missing. Run alpha with EDGAR only. market_cap=NULL, valuation_anomaly=0. conf_adj: -0.15
- **Last:** All data unavailable. Present 5-field manual form to analyst. conf_adj: -0.25
- **Invariant:** None — Scout can operate in degraded mode

### E02 · world_bank_api timeout (Gunn bonus)
- **Trigger:** world_bank_api response > 3s
- **L1:** gunn_bonus = 0 conservative. Flag: GUNN_BONUS_CONSERVATIVE_NO_GDP_DATA. conf_adj: 0
- **L2:** N/A (L1 already safe conservative)
- **Last:** N/A
- **Note:** Setting bonus to 0 is conservative — never blocks pipeline

### E03 · alpha_score at REVIEW_ZONE boundary (65-70)
- **Trigger:** total_score in 65-70 range
- **Action:** Route to human decision. Do NOT auto-advance. Present full score breakdown.
- **Analyst options:** Advance manually | Drop | Add context to re-score
- **Timeout:** 48 hours. If no response → DROP

### E04 · ForensicProfile returns BLOCK from Quick Scan
- **Trigger:** SEV-5 flag detected in pre-screen
- **Action:** Immediate DROP. No re-screen eligible. No reorientation possible.
- **Note:** Different from CONDITIONAL — going concern (SEV-4) = CONDITIONAL, fraud (SEV-5) = BLOCK absolute

---

## Intel Errors (5 scenarios)

### E05 · news_api rate limit
- **Trigger:** HTTP 429 from news_api
- **L1:** Exponential backoff 60s/120s/240s. Partial bundle from cache TTL 6h. conf_adj: -0.08
- **L2:** news_api fully down, no cache. EDGAR 8-K last 30 days only. conf_adj: -0.18
- **Last:** EDGAR also down. Analyst provides 3 items manually. conf_adj: -0.28

### E06 · MNPI detected
- **Trigger:** MNPI pattern match confidence >= 0.85
- **Action:** COMPLIANCE HALT immediate. No L1/L2/Last. No recovery path.
- **Protocol:** Preserve item → notify compliance < 30 min → lock AuditTrail
- **Edge case:** Confidence 0.70-0.85 (ambiguous) → flag for analyst review, pause pipeline max 2hrs

### E07 · CRM contacts unavailable
- **Trigger:** crm_contacts MCP timeout
- **L1:** Hypothesis assigned without contact. lifecycle = PENDING_CONTACT_UNAVAILABLE. conf_adj: -0.05
- **Effect:** CF cannot validate hypothesis through contact channel. Marks as UNRESOLVABLE_NO_CONTACT.

### E08 · mgmt_comm_score < 40
- **Trigger:** Backward-from-customer language score below threshold
- **Action:** Flag in IntelBundle. CF receives warning. Does not block pipeline.
- **Downstream effect:** ic_premium discounted in Valuation (Gunn mode only)

### E09 · Re-trigger storm (> 2 triggers in 15 min)
- **Trigger:** Post-publication re-trigger count > 2 in 15 minute window
- **L1:** BATCH mode activated. Queue triggers, process every 15 min. Cooldown prevents noise amplification.

---

## Critical Factor Errors (4 scenarios)

### E10 · Scenario probabilities don't sum to 1.0
- **Trigger:** |bull + base + bear - 1.0| > 0.001
- **L1 (deviation <= 10%):** Auto-normalize proportionally. conf_adj: -0.03
- **L2 (deviation > 10%):** Regenerate scenarios with updated prompt. conf_adj: -0.08
- **Last:** If regeneration fails twice → analyst reviews and sets probabilities manually

### E11 · Zero material factors found
- **Trigger:** No factors with eps_impact >= 5% (Valentine) or >= 4% (Gunn)
- **L1:** Relax threshold to 3% temporarily
- **Last:** Still zero at 3% → DROP. Reason: "No material factors found at relaxed threshold"
- **Invariant:** Never publish without at least 2 material factors

### E12 · CF-Intel hypothesis loop > 2 rounds
- **Trigger:** Dialog round_number > 2 without resolution
- **L1:** Force convergence. Mark hypothesis as UNRESOLVABLE_WITH_PUBLIC_DATA. conf_adj: -0.12
- **Effect:** Analysis proceeds without hypothesis validation. Noted in AuditTrail.

### E13 · Build-to-Last score incomplete (Gunn)
- **Trigger:** One of three sub-scores unavailable
- **L2:** Publish if >= 2/3 sub-scores available. Mark missing sub-score as NULL. conf_adj: -0.15
- **Last:** Only 1/3 available → force Valentine mode, drop all Gunn-specific components

---

## Forensic Errors (4 scenarios)

### E14 · Full Scan timeout at > 80% completion
- **Trigger:** Scan time > 120s with > 80% checks complete
- **L1:** Use partial results. Flag incomplete checks. Analyst reviews remainder. conf_adj: -0.07
- **Note:** Partial Forensic accepted only if > 80% complete. Below 80% → L2.

### E15 · bloomberg_governance MCP down
- **Trigger:** Governance MCP unavailable
- **L1:** Proxy with EDGAR DEF 14A for COB separation and insider ownership. conf_adj: -0.05
- **L2:** EDGAR also down → governance sub-score = NULL. Overall risk_score adjusted upward (conservative).

### E16 · EDGAR completely down
- **Trigger:** EDGAR unavailable with no local cache
- **Last:** PAUSE pipeline max 30 min. Poll EDGAR every 5 min.
- **Invariant:** NEVER skip Forensic. NEVER substitute with manual input. 30 min is the absolute ceiling.

### E17 · Shadow Test data insufficient (< 3 years)
- **Trigger:** Company has < 3Y of guidance vs actuals history
- **L2:** mgmt_trust_score = NULL. Apply proxy: sector average mgmt_trust. conf_adj: -0.15
- **Effect:** ic_premium (Gunn) = NULL. Output notes: SHADOW_TEST_PROXY_APPLIED.

---

## Valuation Errors (4 scenarios)

### E18 · Bloomberg and CapIQ both down
- **Trigger:** Both primary market data MCPs unavailable simultaneously
- **L2:** Use sector averages from internal table. Analyst provides consensus PT manually.
- **conf_adj:** -0.20 (sector averages) + -0.05 (manual consensus) = -0.25 total
- **Gate:** If final confidence < 0.50 after adjustment → NO_PUBLISH

### E19 · Method divergence > 30%
- **Trigger:** PE, EV/EBITDA, and DCF produce PTs diverging > 30% from each other
- **L1:** Use conservative bound (BUY = lower bound, SELL = upper bound). conf_adj: -0.08
- **Effect:** PT narrows, conviction lowers. Noted in AuditTrail as METHOD_DIVERGENCE_CONSERVATIVE.

### E20 · ForensicProfile missing or corrupted
- **Trigger:** ForensicProfile not received from Forensic agent
- **L1:** Apply conservative defaults: SEV-4 treatment (20% haircut + 200bps). conf_adj: -0.10
- **Note:** Never proceed with zero forensic adjustment applied. Conservative default is mandatory.

### E21 · RR ratio below gate (< 2:1)
- **Trigger:** upside% / downside% < 2.0
- **Action:** DROP. Reason: "Insufficient risk/reward differential."
- **No fallback:** RR gate is absolute. Cannot be overridden by any fallback level.

---

## Communication Errors (3 scenarios)

### E22 · ENTER Gate score 4/5 (HOLD)
- **Trigger:** Exactly one criterion fails
- **L1:** HOLD state. missing_criterion_code provided. Actionable instruction sent to analyst.
- **Timeout:** 2 hours. If resolved → re-run Communication. If not → auto-downgrade to ALERT format.
- **ALERT output:** 1 paragraph with rating, PT, and catalyst only. SLA resets to 30 min.

### E23 · Consensus round conflict > 15%
- **Trigger:** One upstream agent disagrees materially (> 15% variance from others)
- **L1:** If conflict <= 15% → use conservative estimate. conf_adj: -0.05
- **L2:** Conflict > 15% → ESCALATE to analyst. 45 min timeout. If no response → defer 24h.

### E24 · Flash Note SLA breach (> 2 hours)
- **Trigger:** Pipeline exceeds 2-hour SLA for Flash Note
- **L2:** Auto-downgrade to ALERT format. 1 paragraph. SLA resets to 30 min from downgrade point.
- **conf_adj:** -0.10. Format downgrade noted in AuditTrail.
- **Note:** Initiation Reports (72hr SLA) have no auto-downgrade. Flagged as LATE, no format change.
