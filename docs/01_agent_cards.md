# Agent Cards — Efrain AI v2.2.0

---

## Agent 01 · SCOUT
**role:** coverage_universe_optimizer
**model:** claude-sonnet-4-6 | **temperature:** 0.2 | **cost:** $0.003/run
**latency_p50:** 800ms | **accuracy:** 82% → 85% target

### Alpha Score Components
| Component | Weight | Max pts |
|-----------|--------|---------|
| coverage_gap_score | 30% | 25 |
| market_cap_fit | 20% | 20 |
| sector_relevance | 25% | 25 |
| valuation_anomaly | 25% | 30 |
| gunn_bonus (EM flags) | — | +25 |

### Gate
- total_score >= 70 → MUST_COVER
- total_score 65-70 → REVIEW_ZONE
- total_score < 65 → DROP (rescreen_after: 90d)

### Inputs
- ticker, analyst_id, catalyst (free text), idea_source_tag

### MCPs
- financial_data_mcp (primary)
- edgar_sec
- world_bank_api (optional, Gunn bonus)

### Outputs
- alpha_score {base, gunn_bonus, total}
- horizon_tag: SHORT | MEDIUM | COMPOUNDER
- downstream_mode: valentine | gunn | dual
- decision: MUST_COVER | REVIEW_ZONE | DROP
- rescreen_eligible_after (if DROP)
- forensic_pre_result (Quick Scan)

### Fallback
- L1: financial_data_mcp timeout → local cache TTL 24h (conf_adj -0.05)
- L1: world_bank_api down → gunn_bonus = 0 conservative (conf_adj 0)
- L2: no cache → alpha with EDGAR only, market_cap=NULL (conf_adj -0.15)
- Last: all MCPs down → manual 5-field form to analyst (conf_adj -0.25)

---

## Agent 02 · INTEL
**role:** information_hub
**model:** claude-sonnet-4-6 | **temperature:** 0.1 | **cost:** $0.005/run
**latency_p50:** 1200ms | **accuracy:** 79% → 82% target

### News Score Formula
```
news_score = keyword_match  * 0.25
           + eps_impact     * 0.30
           + source_quality * 0.25
           + timeliness     * 0.20
```
Threshold: >= 40 → surface to CF

### MNPI Protocol
- Detection → COMPLIANCE HALT immediate
- Item preserved as evidence (never deleted)
- Compliance notified < 30 min
- No fallback possible

### Inputs
- idea_id, ticker, horizon_tag, downstream_mode

### MCPs
- news_api (tier-1: Bloomberg, Reuters / tier-2: The Information, Axios)
- edgar_sec (8-K)
- crm_contacts
- world_bank_api (macro EM, optional)

### Outputs
- IntelBundle {surfaced_count, suppressed_count, mosaic_clear}
- NewsItem[] with score >= 40
- Hypothesis[] lifecycle=PENDING
- mgmt_comm_score 0-100 (backward-from-customer language)

### Fallback
- L1: rate limit → exponential backoff 60/120/240s + partial bundle from cache TTL 6h (conf_adj -0.08)
- L1: CRM down → hypothesis without contact assigned (conf_adj -0.05)
- L2: news_api down, no cache → EDGAR 8-K last 30 days only (conf_adj -0.18)
- Last: EDGAR also down → analyst provides 3 items manually (conf_adj -0.28)
- MNPI: HALT absolute, no fallback

---

## Agent 03 · CRITICAL FACTOR
**role:** thesis_engine
**model:** claude-sonnet-4-6 | **temperature:** 0.3 | **cost:** $0.008/run
**latency_p50:** 2500ms Valentine / 5000ms Gunn | **accuracy:** 76% → 80% target

### Factor Thresholds by Mode
| Mode | EPS impact | Horizon |
|------|-----------|---------|
| valentine | >= 5% | 12M |
| gunn | >= 4% | 5Y |
| dual | >= 5% (Valentine) + BTL | mixed |
| relaxed fallback | >= 3% | any |

### Scenario Constraints
- Bull + Base + Bear probabilities must sum to exactly 1.0000
- Auto-normalize if deviation <= 10%
- Regenerate if deviation > 10%

### Build-to-Last Score (Gunn only)
- Management quality score
- TAM size (world_bank_api)
- Moat durability (3-5Y)

### Inputs
- IntelBundle, ForensicProfile (preliminary), horizon_tag, downstream_mode

### MCPs
- financial_data_mcp (earnings estimates)
- world_bank_api (TAM regional)

### Outputs
- CriticalFactor[] 2-4 factors with eps_impact
- Scenario[] {bull_prob, base_prob, bear_prob, pt_bull, pt_base, pt_bear}
- expected_value_pt = bull_prob*pt_bull + base_prob*pt_base + bear_prob*pt_bear
- build_to_last_score (Gunn mode only)
- Hypothesis[] with final lifecycle

### Fallback
- L1: prob sum deviation <= 10% → auto-normalize (conf_adj -0.03)
- L1: hypothesis loop > 2 rounds → force convergence UNRESOLVABLE (conf_adj -0.12)
- L2: prob sum deviation > 10% → regenerate scenarios (conf_adj -0.08)
- L2: build_to_last incomplete → publish if > 2/3 sub-scores available (conf_adj -0.15)
- Last: zero factors at 3% threshold → DROP

---

## Agent 04 · FORENSIC
**role:** risk_and_trust_engine
**model:** claude-sonnet-4-6 | **temperature:** 0.1
**cost:** $0.004 Quick / $0.080 Full
**latency:** 8s Quick / 120s Full
**accuracy:** 88% → 90% target
**false_positive_rate target:** < 5%
**false_negative_rate target:** < 2%

### Run Modes
- PRE-SCREEN (Quick Scan): 10-K delay + going concern + SEC investigation
- FULL: accrual ratio + DSO + auditor quality + insider txns + governance + Shadow Test 3Y

### Severity Table
| SEV | Example | EPS haircut | DR add | Result |
|-----|---------|------------|--------|--------|
| 5 | Fraud / Restatement | 30% | 300bps | BLOCK |
| 4 | Going concern | 20% | 200bps | CONDITIONAL |
| 3 | Governance / COB separation | 10% | 150bps | CONDITIONAL |
| 2 | DSO expansion | 5% | 75bps | CLEAR+adj |
| 1 | Minor irregularity | 0% | 25bps | CLEAR+adj |

### Result Logic
- risk_score >= 75 AND SEV-5 → BLOCK
- risk_score >= 75, no SEV-5 → CONDITIONAL
- risk_score < 75 → CLEAR

### MCPs
- edgar_sec (10-K, 10-Q, 8-K, DEF 14A)
- bloomberg_governance (COB, board composition)
- capital_iq (accruals, peer benchmarks)

### Outputs
- ForensicProfile {risk_score, mgmt_trust_score, recommendation}
- YellowFlag[] with SEV, haircut, dr_add per flag
- eps_haircut_total
- dr_add_bps_total
- buy_rating_blocked (bool)

### Fallback
- L1: Full Scan > 80% complete at timeout → use partial + analyst reviews remainder (conf_adj -0.07)
- L1: bloomberg_governance down → proxy EDGAR DEF 14A (conf_adj -0.05)
- L2: EDGAR down > 30min no cache → degrade to Quick Scan + manual analyst (conf_adj -0.18)
- Last: EDGAR completely down, no cache → PAUSE pipeline max 30 min. Never skip Forensic.

---

## Agent 05 · VALUATION
**role:** price_target_engine
**model:** claude-opus-4-6 | **temperature:** 0.2 | **cost:** $0.018/run
**latency_p50:** 3500ms | **accuracy:** 71% → 76% target (highest priority gap)
**pt_hit_rate_12m target:** 58%

### Method Weights by Sector
| Sector | PE | EV/EBITDA | DCF |
|--------|----|-----------|-----|
| Tech hardware | 25% | 40% | 35% |
| Fintech pre-revenue | 15% | 25% | 60% |
| Consumer staples | 45% | 35% | 20% |
| Gunn compounder EM | 20% | 30% | 50% |
| Default Valentine | 40% | 35% | 25% |

### Divergence Rule
- Methods diverge > 30% → use conservative bound (BUY=lower, SELL=upper, conf_adj -0.08)

### FaVeS Edge Score (Valentine)
- F: Frequency — catalyst recurs 2-4x/year
- V: Visibility — pre-announced event
- S: Significance — eps_impact >= 5%
- Score: 1-9

### IC Premium (Gunn only)
- Inputs: mgmt_trust_score + build_to_last_score + moat_durability
- Range: 0 to 1.5

### Gate
- RR ratio = upside% / downside%
- RR < 2:1 OR gap vs consensus < 5% → DROP

### MCPs
- bloomberg (consensus, multiples, peers)
- capital_iq (peer EV/EBITDA)

### Outputs
- pt_12m, pt_5y (Gunn only)
- rating: BUY | HOLD | UNDERPERFORM
- rr_ratio, faves_score, ic_premium
- ValuationModel complete

### Fallback
- L1: Bloomberg timeout → Capital IQ as primary (conf_adj -0.12)
- L1: ForensicProfile missing → conservative defaults SEV-4: 10% haircut + 100bps (conf_adj -0.10)
- L2: Both Bloomberg and CapIQ down → sector averages + analyst provides consensus manually (conf_adj -0.20)
- Last: No market data → analyst provides PT manually, system provides structure + sanity checks (conf_adj -0.30)

---

## Agent 06 · COMMUNICATION
**role:** publication_gate
**model:** claude-opus-4-6 | **temperature:** 0.4
**cost:** $0.035 Flash / $0.120 Initiation / $0.008 Alert / $0.020 Quarterly
**latency:** 3min Flash / 14hrs Initiation
**accuracy:** 91% → 92% target

### MNPI Check (first, absolute)
- Any MNPI in upstream sources → COMPLIANCE HALT
- publication_possible = false
- AuditTrail preserved
- Compliance notified < 30 min
- No fallback

### ENTER Gate (5 criteria)
| Criterion | Test | Fail condition |
|-----------|------|---------------|
| E Edge | Alpha differential vs consensus | Idea = consensus |
| N New | Not yet in price | Already discounted |
| T Timely | Active catalyst | No catalyst |
| E Examples | 3+ data points in section D | Only 1-2 citations |
| R Revealing | Changes perspective | No new insight |

- effective_score 5 → PUBLISH
- effective_score 4 → HOLD (missing_criterion_code + actionable instruction, auto-downgrade 2hrs)
- effective_score <= 3 → DROP

### Consensus Round
- Scout confirms: horizon valid
- Intel confirms: mosaic_clear
- CF confirms: factors unchanged
- Forensic confirms: no new flags
- Valuation confirms: PT correct
- Conflict > 15% → ESCALATE to analyst (45min timeout, defer 24h)

### CASCADE Format (mandatory)
1. **C** Conclusion: rating · PT · conviction level
2. **A** Action: position · timing · size
3. **S** Scenario: Bull / Base / Bear with probabilities
4. **C** Catalysts: types and timing
5. **D** Data: EDGAR citations + tier-1 sources (min 3)

### SLAs
| Format | SLA | Cost | Model |
|--------|-----|------|-------|
| ALERT | 30 min | $0.008 | Sonnet |
| FLASH_NOTE | 2 hrs | $0.035 | Opus |
| QUARTERLY_UPDATE | same day | $0.020 | Sonnet |
| INITIATION_REPORT | 72 hrs | $0.120 | Opus |

### Fallback
- L1: consensus conflict <= 15% → conservative bound BUY=lower / SELL=upper (conf_adj -0.05)
- L1: AuditTrail corrupted → reconstruct from AgentRunLog, compliance review if impossible
- L2: Flash SLA breach > 2hrs → auto-downgrade to ALERT format (conf_adj -0.10)
- L2: HOLD no response > 2hrs → ALERT if critical SLA, defer 24h + reminder if not
- MNPI: absolute HALT, no fallback
