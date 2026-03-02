# Fallback Strategies — Efrain AI v2.2.0

---

## Three Invariants (never broken by any fallback)

1. **FORENSIC is non-negotiable** — pipeline PAUSEs max 30 min rather than skip it
2. **COMPLIANCE is absolute** — MNPI = HALT, no fallback path exists
3. **Confidence never inflates** — every fallback lowers confidence, never raises it

If ALL fallbacks activate simultaneously across all agents:
- Theoretical confidence floor: -0.89
- Clamped minimum: 0.10
- Any pipeline with total confidence < 0.50 = NO_PUBLISH

---

## Master Fallback Table

| Agent | L1 trigger | L1 action | L1 conf_adj | L2 trigger | L2 action | L2 conf_adj | Last trigger | Last action | Last conf_adj |
|-------|-----------|-----------|-------------|-----------|-----------|-------------|-------------|-------------|---------------|
| Scout | financial_data timeout | local cache TTL 24h | -0.05 | no cache | EDGAR only | -0.15 | all MCPs down | manual 5 fields | -0.25 |
| Intel | rate limit | backoff + cache 6h | -0.08 | news_api down | EDGAR 8-K 30d | -0.18 | EDGAR down | analyst 3 items | -0.28 |
| CF | prob deviation <=10% | auto-normalize | -0.03 | prob deviation >10% | regenerate | -0.08 | 0 factors at 3% | DROP | — |
| Forensic | >80% at timeout | partial + analyst | -0.07 | EDGAR >30min down | Quick + manual | -0.18 | EDGAR no cache | PAUSE 30min | — |
| Valuation | Bloomberg timeout | CapIQ primary | -0.12 | both down | sector averages | -0.20 | no market data | manual PT | -0.30 |
| Communication | consensus <=15% conflict | conservative bound | -0.05 | SLA breach Flash | downgrade to ALERT | -0.10 | AuditTrail corrupt | reconstruct | 0 |

---

## MNPI Protocol (absolute, no fallback)
```
MNPI detected in Intel or Communication
  |
  v
pipeline.status = COMPLIANCE_HALT
publication_possible = false
  |
  v
preserve item as evidence (never delete)
  |
  v
notify compliance < 30 min
  |
  v
AuditTrail locked with full chain of custody
  |
  v
STOP — no further processing under any condition
```

This is the only point in the system where there is zero recovery path.
No analyst override. No fallback. No timeout that unlocks it.

---

## Forensic Invariant Detail

Forensic is the only agent that can PAUSE the pipeline rather than degrade:
```
EDGAR unavailable, no cache
  |
  v
pipeline.status = PAUSED
  |
  v
poll EDGAR every 5 min
  |
  v (if EDGAR recovers within 30 min)
resume Full Scan from beginning
  |
  v (if EDGAR still down at 30 min)
HARD STOP — analyst must resolve manually
```

Why 30 minutes and not longer:
- Flash Note SLA is 2 hours
- Forensic at 30 min + remaining agents = ~45 min = total ~75 min
- Still within SLA with margin for Communication
- Beyond 30 min the Flash Note SLA is at risk

---

## Confidence Floor Mechanics

Every fallback subtracts from a starting confidence of 1.0:
```
Starting confidence: 1.0

Scout L1 cache:         -0.05  → 0.95
Intel L1 backoff:       -0.08  → 0.87
CF L1 normalize:        -0.03  → 0.84
Forensic L1 partial:    -0.07  → 0.77
Valuation L2 sectors:   -0.20  → 0.57
Communication L1 bound: -0.05  → 0.52

Total with above combo: 0.52 → PUBLISH (above 0.50 floor)
```

Worst case (all Last fallbacks):
```
Scout Last:             -0.25  → 0.75
Intel Last:             -0.28  → 0.47  ← already below floor
```

If Intel reaches Last fallback, pipeline confidence is likely < 0.50
and NO_PUBLISH is triggered before reaching Valuation.

---

## Fallback Decision Tree per Agent

### Scout
```
financial_data_mcp responds?
  YES → normal run
  NO (timeout > 5s) → L1: check local cache
    cache exists and age < 24h? → use cache, conf_adj -0.05
    cache stale or missing → L2: EDGAR only, conf_adj -0.15
      world_bank_api responds?
        YES → gunn_bonus calculated normally
        NO → L1: gunn_bonus = 0, conf_adj 0
      all MCPs down? → Last: manual 5-field form, conf_adj -0.25
```

### Intel
```
news_api responds?
  YES → normal run up to 300 items
  NO (HTTP 429 rate limit) → L1: exponential backoff 60/120/240s
    backoff resolves? → resume with partial cache bundle, conf_adj -0.08
    news_api still down, cache exists? → use cache bundle, conf_adj -0.08
    news_api down, no cache → L2: EDGAR 8-K last 30 days only, conf_adj -0.18
      EDGAR also down? → Last: analyst provides 3 items manually, conf_adj -0.28

MNPI detected at any point?
  YES → COMPLIANCE HALT (overrides all fallback logic)
```

### Critical Factor
```
scenarios generated?
  YES → check probability sum
    |sum - 1.0| <= 0.001? → pass
    |sum - 1.0| <= 0.10? → L1: auto-normalize, conf_adj -0.03
    |sum - 1.0| > 0.10? → L2: regenerate, conf_adj -0.08
      second generation fails? → Last: analyst sets probabilities manually

factors found at primary threshold?
  YES → proceed
  NO → L1: relax to 3%
    factors found at 3%? → proceed with relaxed threshold
    NO → Last: DROP (not a recoverable failure)
```

### Forensic
```
EDGAR responds?
  YES → run Full Scan (120s)
    completes within 120s? → normal output
    timeout at > 80% complete? → L1: use partial, conf_adj -0.07
    timeout at < 80% complete → L2: degrade to Quick Scan, conf_adj -0.18
  NO (EDGAR down) → check cache
    cache exists? → L1: use cached ForensicProfile, conf_adj -0.07
    no cache → Last: PAUSE 30 min, poll every 5 min
      EDGAR recovers? → resume Full Scan
      30 min elapsed, EDGAR still down → HARD STOP

bloomberg_governance responds?
  YES → normal governance check
  NO → L1: proxy EDGAR DEF 14A, conf_adj -0.05
```

### Valuation
```
Bloomberg responds?
  YES → normal run with live multiples
  NO (timeout) → L1: use CapIQ as primary, conf_adj -0.12
    CapIQ responds?
      YES → proceed with CapIQ
      NO → L2: sector averages + manual consensus from analyst, conf_adj -0.20
        analyst provides consensus? → proceed
        analyst unavailable → Last: system provides structure, analyst fills PT, conf_adj -0.30

ForensicProfile received?
  YES → apply actual haircuts
  NO → L1: apply SEV-4 conservative defaults (20% haircut + 200bps), conf_adj -0.10

RR ratio after all adjustments?
  >= 2:1 → proceed to Communication
  < 2:1 → DROP (no fallback for RR gate)
```

### Communication
```
MNPI check (upstream sources)?
  MNPI found → COMPLIANCE HALT (overrides everything)
  MNPI clear → proceed to ENTER Gate

ENTER Gate score?
  5/5 → proceed to consensus round
  4/5 → HOLD
    analyst resolves within 2hrs? → re-run Communication
    no resolution in 2hrs → L2: auto-downgrade to ALERT
  <= 3/5 → DROP

Consensus round conflict?
  <= 15% → L1: use conservative bound, conf_adj -0.05
  > 15% → ESCALATE to analyst (45 min timeout)
    analyst resolves? → re-run consensus
    no response in 45 min → defer 24h

Flash Note SLA?
  within 2hrs → PUBLISH
  > 2hrs → L2: auto-downgrade to ALERT format, conf_adj -0.10
```

---

## Fallback Audit Flags Reference

Every activated fallback appends a flag to `AuditTrail.fallback_flags[]`:

| Flag | Agent | Level | Meaning |
|------|-------|-------|---------|
| SCOUT_FINANCIAL_DATA_FROM_CACHE | Scout | L1 | financial_data_mcp timeout, cache used |
| SCOUT_EDGAR_ONLY_NO_MARKET_DATA | Scout | L2 | financial_data + cache both unavailable |
| SCOUT_MANUAL_INPUT_REQUIRED | Scout | Last | All MCPs down, analyst provided data |
| GUNN_BONUS_CONSERVATIVE_NO_GDP | Scout | L1 | world_bank_api down, bonus = 0 |
| INTEL_PARTIAL_BUNDLE_FROM_CACHE | Intel | L1 | news_api rate limited, cache used |
| INTEL_EDGAR_ONLY_NO_NEWS_API | Intel | L2 | news_api down, EDGAR 8-K only |
| INTEL_ANALYST_MANUAL_ITEMS | Intel | Last | EDGAR down, analyst provided items |
| CF_SCENARIOS_AUTO_NORMALIZED | CF | L1 | Probability deviation <= 10%, auto-fixed |
| CF_SCENARIOS_REGENERATED | CF | L2 | Probability deviation > 10%, regenerated |
| CF_HYPOTHESIS_UNRESOLVABLE | CF | L1 | Dialog loop > 2 rounds, forced close |
| CF_THRESHOLD_RELAXED_TO_3PCT | CF | L1 | No factors at primary threshold |
| CF_BUILD_TO_LAST_INCOMPLETE | CF | L2 | < 3/3 sub-scores available |
| FORENSIC_PARTIAL_SCAN | Forensic | L1 | Timeout at > 80%, partial used |
| FORENSIC_GOVERNANCE_PROXY_DEF14A | Forensic | L1 | bloomberg_governance down |
| FORENSIC_DEGRADED_TO_QUICK_SCAN | Forensic | L2 | EDGAR timeout < 80% complete |
| FORENSIC_PIPELINE_PAUSED | Forensic | Last | EDGAR down, 30 min pause activated |
| FORENSIC_CONDITIONAL_GOING_CONCERN | Forensic | — | SEV-4 flag, pipeline conditional |
| FORENSIC_BLOCK_SEV5 | Forensic | — | SEV-5 flag, pipeline blocked |
| VALUATION_BLOOMBERG_DOWN | Valuation | L1 | Bloomberg timeout, CapIQ used |
| VALUATION_CAPIQ_DOWN | Valuation | L2 | CapIQ timeout |
| VALUATION_SECTOR_AVERAGES_USED | Valuation | L2 | Both MCPs down, averages used |
| VALUATION_LAST_FALLBACK_ACTIVATED | Valuation | Last | No market data, manual PT |
| VALUATION_FORENSIC_DEFAULTS_APPLIED | Valuation | L1 | ForensicProfile missing |
| VALUATION_METHOD_DIVERGENCE | Valuation | L1 | Methods diverge > 30% |
| COMM_CONSERVATIVE_BOUND_APPLIED | Communication | L1 | Consensus conflict <= 15% |
| COMM_FLASH_DOWNGRADED_TO_ALERT | Communication | L2 | SLA breach > 2hrs |
| COMM_CONSENSUS_ESCALATED | Communication | L2 | Conflict > 15%, analyst alerted |
| COMPLIANCE_HALT | Intel/Comm | Absolute | MNPI detected, zero fallback |
