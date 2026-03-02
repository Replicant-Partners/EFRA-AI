# Ontology v3 — Efrain AI

28 entities · 33 relationships · February 2026

---

## Migration Notes

v2 → v3 is **100% additive**. Zero modifications to existing tables.
Zero downtime. Zero rollback risk. 7 new tables only.

---

## Core Layer — v2 (21 entities)

### ResearchIdea ← central hub
```sql
id UUID PK
analyst_id FK → Analyst
company_id FK → Company
idea_source_tag VARCHAR
catalyst TEXT
created_at TIMESTAMP
status ENUM(active, dropped, published, paused)
downstream_mode ENUM(valentine, gunn, dual)
horizon_tag ENUM(short, medium, compounder)
```

### Analyst
```sql
id UUID PK
name VARCHAR
coverage_universe_id FK → CoverageUniverse
```

### Company
```sql
id UUID PK
ticker VARCHAR UNIQUE
sector VARCHAR
market_cap DECIMAL
country VARCHAR
em_flag BOOLEAN
```

### AlphaScore
```sql
id UUID PK
idea_id FK → ResearchIdea
coverage_gap_score DECIMAL
market_cap_fit DECIMAL
sector_relevance DECIMAL
valuation_anomaly DECIMAL
gunn_bonus DECIMAL
total_score DECIMAL
decision ENUM(must_cover, review_zone, drop)
rescreen_after DATE
```

### IntelBundle
```sql
id UUID PK
idea_id FK → ResearchIdea
surfaced_count INT
suppressed_count INT
mosaic_clear BOOLEAN
mgmt_comm_score DECIMAL
created_at TIMESTAMP
```

### NewsItem
```sql
id UUID PK
bundle_id FK → IntelBundle
headline TEXT
source VARCHAR
source_tier ENUM(tier1, tier2, edgar, crm)
news_score DECIMAL
mnpi_flag BOOLEAN
published_at TIMESTAMP
```

### Hypothesis
```sql
id UUID PK
bundle_id FK → IntelBundle
factor_id FK → CriticalFactor (nullable)
content TEXT
lifecycle ENUM(pending, validated, invalidated, unresolvable)
contact_id FK → CRMContact (nullable)
```

### ForensicProfile
```sql
id UUID PK
idea_id FK → ResearchIdea
run_mode ENUM(quick, full)
risk_score DECIMAL
mgmt_trust_score DECIMAL
eps_haircut_total DECIMAL
dr_add_bps_total DECIMAL
buy_rating_blocked BOOLEAN
recommendation ENUM(block, conditional, clear)
created_at TIMESTAMP
```

### YellowFlag
```sql
id UUID PK
profile_id FK → ForensicProfile
flag_type VARCHAR
severity ENUM(sev1, sev2, sev3, sev4, sev5)
eps_haircut DECIMAL
dr_add_bps INT
description TEXT
```

### CriticalFactor
```sql
id UUID PK
idea_id FK → ResearchIdea
factor_name VARCHAR
eps_impact DECIMAL
horizon_months INT
mode ENUM(valentine, gunn, dual)
build_to_last_score DECIMAL (nullable, Gunn only)
```

### Scenario
```sql
id UUID PK
idea_id FK → ResearchIdea
label ENUM(bull, base, bear)
probability DECIMAL
pt_implied DECIMAL
key_assumptions TEXT
```

### ValuationModel
```sql
id UUID PK
idea_id FK → ResearchIdea
pt_12m DECIMAL
pt_5y DECIMAL (nullable, Gunn only)
rating ENUM(buy, hold, underperform)
rr_ratio DECIMAL
faves_score DECIMAL
ic_premium DECIMAL (nullable, Gunn only)
pe_weight DECIMAL
ev_weight DECIMAL
dcf_weight DECIMAL
method_divergence DECIMAL
expected_value_pt DECIMAL
```

### EnterGateResult
```sql
id UUID PK
idea_id FK → ResearchIdea
edge_pass BOOLEAN
new_pass BOOLEAN
timely_pass BOOLEAN
examples_pass BOOLEAN
revealing_pass BOOLEAN
forensic_penalty INT
effective_score INT
result ENUM(publish, hold, drop)
missing_criterion VARCHAR (nullable)
```

### Publication
```sql
id UUID PK
idea_id FK → ResearchIdea
output_type ENUM(flash_note, initiation_report, alert, quarterly_update)
format_mode ENUM(valentine, gunn, dual)
published_at TIMESTAMP
sla_met BOOLEAN
content_url VARCHAR
```

### AuditTrail
```sql
id UUID PK
idea_id FK → ResearchIdea
agents_executed VARCHAR[]
total_confidence DECIMAL
fallback_flags VARCHAR[]
mnpi_detected BOOLEAN
publication_possible BOOLEAN
created_at TIMESTAMP
```

### AgentRunLog
```sql
id UUID PK
idea_id FK → ResearchIdea
agent_name VARCHAR
run_start TIMESTAMP
run_end TIMESTAMP
model_used VARCHAR
tokens_input INT
tokens_output INT
cost_usd DECIMAL
fallback_level ENUM(none, l1, l2, last)
confidence_adjustment DECIMAL
```

### AgentDialog
```sql
id UUID PK
idea_id FK → ResearchIdea
initiator_agent VARCHAR
responder_agent VARCHAR
message_type VARCHAR
payload JSONB
round_number INT
resolved BOOLEAN
created_at TIMESTAMP
```

### CoverageUniverse
```sql
id UUID PK
max_companies INT DEFAULT 25
active_count INT
```

### CRMContact
```sql
id UUID PK
name VARCHAR
company_id FK → Company
role VARCHAR
insight_rate DECIMAL
last_contacted DATE
```

### AnalystOverride
```sql
id UUID PK
idea_id FK → ResearchIdea
agent_name VARCHAR
override_field VARCHAR
original_value TEXT
override_value TEXT
reason TEXT
analyst_id FK → Analyst
created_at TIMESTAMP
```

---

## Extension Layer — v3 (7 new entities)

### PredictionOutcome
```sql
id UUID PK
publication_id FK → Publication
pt_published DECIMAL
horizon_date DATE
price_at_horizon DECIMAL (nullable until horizon reached)
hit_rate_achieved BOOLEAN (nullable)
direction_correct BOOLEAN (nullable)
pct_error DECIMAL (nullable)
evaluated_at TIMESTAMP (nullable)
```

### CalibrationRun
```sql
id UUID PK
analyst_id FK → Analyst
agent_name VARCHAR
run_date DATE
outcomes_count INT
hit_rate DECIMAL
direction_accuracy DECIMAL
avg_conf_error DECIMAL
calibration_action ENUM(none, prompt_update, threshold_adjust, weight_update)
notes TEXT
```

### MonitoringSchedule
```sql
id UUID PK
publication_id FK → Publication
next_check_date DATE
check_frequency ENUM(weekly, monthly, quarterly)
active BOOLEAN
```

### FactorAlert
```sql
id UUID PK
schedule_id FK → MonitoringSchedule
alert_type ENUM(factor_change, pt_breach, catalyst_expired, new_flag)
description TEXT
triggered_at TIMESTAMP
requires_update BOOLEAN
```

### Position
```sql
id UUID PK
publication_id FK → Publication
analyst_id FK → Analyst
position_type ENUM(long, short, watch)
entry_price DECIMAL
target_price DECIMAL
stop_loss DECIMAL
size_pct DECIMAL
opened_at TIMESTAMP
closed_at TIMESTAMP (nullable)
```

### PortfolioSnapshot
```sql
id UUID PK
analyst_id FK → Analyst
snapshot_date DATE
total_positions INT
active_buys INT
active_sells INT
avg_conviction DECIMAL
```

### AgentFeedback
```sql
id UUID PK
publication_id FK → Publication
analyst_id FK → Analyst
agent_name VARCHAR
issue_type ENUM(output_quality, wrong_decision, missing_factor, false_flag,
                missed_flag, pt_too_high, pt_too_low, format_issue,
                sla_breach, mnpi_concern, calibration_note, other)
description TEXT
severity ENUM(1_critical, 2_high, 3_medium, 4_low)
resolution_status ENUM(open, in_review, resolved, wont_fix)
created_at TIMESTAMP
resolved_at TIMESTAMP (nullable)
```

---

## Key Relationships
```
ResearchIdea → AlphaScore (1:1)
ResearchIdea → IntelBundle (1:1)
ResearchIdea → ForensicProfile (1:many, quick + full)
ResearchIdea → CriticalFactor (1:many, 2-4 factors)
ResearchIdea → Scenario (1:3, bull/base/bear)
ResearchIdea → ValuationModel (1:1)
ResearchIdea → EnterGateResult (1:1)
ResearchIdea → Publication (1:1)
ResearchIdea → AuditTrail (1:1)
ResearchIdea → AgentRunLog (1:many, one per agent)
ResearchIdea → AgentDialog (1:many)

Publication → PredictionOutcome (1:1)   -- v3
Publication → MonitoringSchedule (1:1)  -- v3
Publication → Position (1:many)         -- v3
Publication → AgentFeedback (1:many)    -- v3

MonitoringSchedule → FactorAlert (1:many) -- v3
Analyst → CalibrationRun (1:many)         -- v3
Analyst → PortfolioSnapshot (1:many)      -- v3

ForensicProfile → YellowFlag (1:many)
IntelBundle → NewsItem (1:many)
IntelBundle → Hypothesis (1:many)
```
