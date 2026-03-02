# Comparison and Migration — Efrain AI v2.2.0

---

## Part 1 · Comparison vs Alternatives

---

### Efrain AI vs LangGraph

| Dimension | LangGraph | Efrain AI |
|-----------|-----------|-----------|
| Ecosystem | Rich, large community | Purpose-built |
| Domain knowledge | Agnostic | Equity research specific |
| Memory ontology | Generic | 28-entity domain model |
| Compliance built-in | No | MNPI detection native |
| Calibration loop | Manual | Automated CalibrationRun |
| Fallback hierarchy | Manual implementation | L1/L2/Last per agent |
| Inter-agent dialog | Graph edges | Structured lifecycle |
| Cost per analysis | Variable | $0.073 fixed |
| Learning curve | Medium | Low (if equity research background) |

**When to use LangGraph:**
- General-purpose agent workflows
- Rapid prototyping across domains
- Large community support needed
- No domain-specific compliance requirements

**When to use Efrain AI:**
- Production equity research
- Regulatory compliance requirements (MNPI)
- Domain-specific calibration needed
- Structured audit trail required

---

### Efrain AI vs CrewAI

| Dimension | CrewAI | Efrain AI |
|-----------|--------|-----------|
| Role definition | Intuitive, natural language | Precise agent cards (19 fields) |
| Memory | No domain ontology | 28-entity ontology |
| Inter-agent dialog | Basic task passing | Structured with lifecycle tracking |
| Fallback hierarchy | None built-in | L1/L2/Last per agent |
| Compliance | None | MNPI absolute halt |
| Calibration | None | Monthly CalibrationRun |
| Auditability | Limited | Full AuditTrail per idea |
| Cost tracking | None | Per-agent cost in AgentRunLog |

**When to use CrewAI:**
- Rapid prototyping with intuitive role definitions
- Non-regulated domains
- Small teams without engineering resources
- Use cases where audit trail is not required

**When to use Efrain AI:**
- Compliance-regulated outputs
- Domain requiring precise cost tracking
- Use cases requiring reproducibility and audit

---

### Efrain AI vs Manual Pipeline (Python scripts)

| Dimension | Manual Pipeline | Efrain AI |
|-----------|----------------|-----------|
| Control | Total | High (with override mechanism) |
| Scalability | Poor (sequential) | Horizontal (batch mode) |
| Calibration | Manual, ad hoc | Automated monthly |
| Maintenance | High (code + data) | Low (config + prompts) |
| Time to Flash Note | 2-4 hours | 3.3 minutes |
| Fallback handling | Manual error handling | Systematic L1/L2/Last |
| MNPI detection | Manual check | Systematic, < 30 min notify |
| Auditability | Log files | Structured AuditTrail + ontology |
| Onboarding | High (code knowledge required) | Medium (domain knowledge required) |

**When to keep a manual pipeline:**
- Highly idiosyncratic analysis that doesn't fit a structured framework
- One-off research that won't be repeated
- Exploration and hypothesis generation (pre-pipeline)

**When to migrate to Efrain AI:**
- Any recurring analysis pattern (> 5 times = systemize it)
- Any analysis with compliance requirements
- Any analysis where you want to measure your own accuracy over time

---

### Efrain AI vs Sell-Side Analyst

| Dimension | Sell-Side Analyst | Efrain AI |
|-----------|-------------------|-----------|
| Contextual judgment | Human-level | Limited (REVIEW_ZONE for ambiguous) |
| Management relationships | Deep | None (uses CRM contacts) |
| Narrative quality | High | High (Opus, ENTER gate) |
| Cost | $200K+/year fully loaded | $10.52/year |
| Speed | 2-4 hours per note | 3.3 minutes |
| Coverage | 15-25 companies | Unlimited |
| Bias | Undocumented | Documented, calibrable |
| PT hit rate | 50-55% | 58% target |
| Consistency | Variable (good days/bad days) | Consistent (same prompt, same gate) |
| Regulation | Licensed | System (analyst responsible) |
| MNPI detection | Manual, inconsistent | 99.9% systematic |

**The correct framing:** Complementarity, not substitution.

Efrain AI generates 80% of structured analysis automatically.
The analyst contributes the 20% of differential value:
- Contextual judgment in REVIEW_ZONE (65-70)
- Management relationships that inform hypotheses
- Narrative quality beyond what CASCADE provides
- Final publication decision and responsibility
- Feedback that trains the system over time

Without the analyst, Efrain AI is a structured but context-blind machine.
Without Efrain AI, the analyst spends 80% of time on structure instead of alpha.

---

## Part 2 · Ontology Migration v2 → v3

---

### Migration Type: 100% Additive
```
v2 tables:    21 entities — ZERO modifications to any existing table
v3 additions: 7 new tables only
Downtime:     ZERO
Rollback risk: ZERO (new tables can be dropped with no effect on v2)
Data migration: NONE (new tables start empty, populate going forward)
```

This is the safest possible migration type.
No ALTER TABLE. No column additions to existing tables.
No data backfill required.

---

### New Tables DDL
```sql
-- 1. PredictionOutcome (backtesting)
-- Created automatically for every publication
CREATE TABLE prediction_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    publication_id UUID NOT NULL REFERENCES publications(id),
    pt_published DECIMAL NOT NULL,
    horizon_date DATE NOT NULL,
    price_at_horizon DECIMAL,           -- NULL until horizon date reached
    hit_rate_achieved BOOLEAN,          -- NULL until evaluated
    direction_correct BOOLEAN,          -- NULL until evaluated
    pct_error DECIMAL,                  -- NULL until evaluated
    evaluated_at TIMESTAMP,             -- NULL until evaluated
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_prediction_outcomes_horizon
    ON prediction_outcomes(horizon_date)
    WHERE evaluated_at IS NULL;

-- 2. CalibrationRun (monthly calibration)
-- Inserted by CalibrationRun scheduler on 1st of each month
CREATE TABLE calibration_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analyst_id UUID NOT NULL REFERENCES analysts(id),
    agent_name VARCHAR NOT NULL,
    run_date DATE NOT NULL,
    outcomes_count INT NOT NULL,
    hit_rate DECIMAL,
    direction_accuracy DECIMAL,
    avg_conf_error DECIMAL,
    calibration_action VARCHAR
        CHECK (calibration_action IN
            ('none','prompt_update','threshold_adjust','weight_update')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. MonitoringSchedule (post-publication alerting)
-- Created automatically for every publication
CREATE TABLE monitoring_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    publication_id UUID NOT NULL REFERENCES publications(id),
    next_check_date DATE NOT NULL,
    check_frequency VARCHAR NOT NULL
        CHECK (check_frequency IN ('weekly','monthly','quarterly')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. FactorAlert (factor change detection)
-- Created by monitoring scheduler when a factor changes post-publication
CREATE TABLE factor_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES monitoring_schedules(id),
    alert_type VARCHAR NOT NULL
        CHECK (alert_type IN
            ('factor_change','pt_breach','catalyst_expired','new_flag')),
    description TEXT NOT NULL,
    triggered_at TIMESTAMP NOT NULL DEFAULT NOW(),
    requires_update BOOLEAN NOT NULL DEFAULT FALSE
);

-- 5. Position (portfolio tracking)
-- Manually logged by analyst after publication
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    publication_id UUID NOT NULL REFERENCES publications(id),
    analyst_id UUID NOT NULL REFERENCES analysts(id),
    position_type VARCHAR NOT NULL
        CHECK (position_type IN ('long','short','watch')),
    entry_price DECIMAL,
    target_price DECIMAL,
    stop_loss DECIMAL,
    size_pct DECIMAL,
    opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMP,                -- NULL until position closed
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. PortfolioSnapshot (weekly portfolio state)
-- Created by weekly scheduler
CREATE TABLE portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analyst_id UUID NOT NULL REFERENCES analysts(id),
    snapshot_date DATE NOT NULL,
    total_positions INT NOT NULL DEFAULT 0,
    active_buys INT NOT NULL DEFAULT 0,
    active_sells INT NOT NULL DEFAULT 0,
    avg_conviction DECIMAL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 7. AgentFeedback (analyst feedback on publications)
-- Manually submitted by analyst
CREATE TABLE agent_feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    publication_id UUID NOT NULL REFERENCES publications(id),
    analyst_id UUID NOT NULL REFERENCES analysts(id),
    agent_name VARCHAR NOT NULL,
    issue_type VARCHAR NOT NULL
        CHECK (issue_type IN (
            'output_quality','wrong_decision','missing_factor',
            'false_flag','missed_flag','pt_too_high','pt_too_low',
            'format_issue','sla_breach','mnpi_concern',
            'calibration_note','other'
        )),
    description TEXT NOT NULL,
    severity VARCHAR NOT NULL
        CHECK (severity IN ('1_critical','2_high','3_medium','4_low')),
    resolution_status VARCHAR NOT NULL DEFAULT 'open'
        CHECK (resolution_status IN ('open','in_review','resolved','wont_fix')),
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP              -- NULL until resolved
);

CREATE INDEX idx_agent_feedbacks_open
    ON agent_feedbacks(agent_name, issue_type, created_at)
    WHERE resolution_status = 'open';
```

---

### Activation Plan
```
Day 0 — Migration day:
  Run all 7 CREATE TABLE statements
  Verify: SELECT COUNT(*) FROM prediction_outcomes → 0
  Verify: all 7 tables exist and are empty
  Verify: no changes to any v2 table

Week 1 — Immediate activation:
  PredictionOutcome: auto-created on every new publication
  MonitoringSchedule: auto-created on every new publication
  AgentFeedback: endpoint live, analysts can submit immediately

Month 1 — Secondary activation:
  CalibrationRun: scheduler active, first run when >= 10 outcomes exist
  FactorAlert: monitoring scheduler checks weekly

Months 2-3 — Portfolio activation:
  Position: UI available, analyst logs positions manually
  PortfolioSnapshot: weekly scheduler active

Long-term (2031):
  IC Premium calibration using Position + PortfolioSnapshot outcome data
```

---

### Rollback Plan (if needed)
```sql
-- Complete rollback — drops all v3 tables
-- No effect on any v2 data

DROP TABLE IF EXISTS agent_feedbacks;
DROP TABLE IF EXISTS portfolio_snapshots;
DROP TABLE IF EXISTS positions;
DROP TABLE IF EXISTS factor_alerts;
DROP TABLE IF EXISTS monitoring_schedules;
DROP TABLE IF EXISTS calibration_runs;
DROP TABLE IF EXISTS prediction_outcomes;
```

Rollback is instantaneous. Zero impact on v2 operations.
All v2 tables, data, and relationships remain exactly as before.

---

### Verification Queries Post-Migration
```sql
-- 1. Verify all v3 tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'prediction_outcomes', 'calibration_runs',
    'monitoring_schedules', 'factor_alerts',
    'positions', 'portfolio_snapshots', 'agent_feedbacks'
  )
ORDER BY table_name;
-- Expected: 7 rows

-- 2. Verify no v2 tables were modified
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'publications'
ORDER BY ordinal_position;
-- Expected: same columns as before migration

-- 3. Verify foreign keys are valid
SELECT COUNT(*)
FROM prediction_outcomes po
JOIN publications p ON po.publication_id = p.id;
-- Expected: 0 (tables are empty post-migration)

-- 4. Verify indexes exist
SELECT indexname FROM pg_indexes
WHERE tablename IN ('prediction_outcomes', 'agent_feedbacks')
ORDER BY indexname;
-- Expected: 2 indexes
```
