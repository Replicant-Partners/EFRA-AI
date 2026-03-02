# Usage Examples — Efrain AI v2.2.0

Five complete examples covering all modes and edge cases.

---

## Example 01 · Valentine Mode — SMCI Earnings Catalyst

### Input
```json
{
  "ticker": "SMCI",
  "analyst_id": "analyst_001",
  "catalyst": "Q2 earnings beat expected + server rack backlog disclosure",
  "idea_source_tag": "earnings_watch"
}
```

### Scout Output
```json
{
  "alpha_score": {
    "coverage_gap_score": 18,
    "market_cap_fit": 19,
    "sector_relevance": 22,
    "valuation_anomaly": 24,
    "gunn_bonus": 0,
    "total_score": 83
  },
  "decision": "MUST_COVER",
  "horizon_tag": "SHORT",
  "downstream_mode": "valentine",
  "forensic_pre_result": "CONDITIONAL"
}
```

### Intel Output
```json
{
  "surfaced_count": 12,
  "suppressed_count": 31,
  "mosaic_clear": true,
  "mgmt_comm_score": 71,
  "top_items": [
    {"headline": "SMCI server rack backlog disclosed in 10-Q footnote", "score": 87, "source": "edgar"},
    {"headline": "Nvidia partner confirms accelerated delivery schedule", "score": 74, "source": "tier1"},
    {"headline": "Analyst consensus PT range $400-$520", "score": 62, "source": "tier1"}
  ]
}
```

### Critical Factor Output
```json
{
  "factors": [
    {"name": "server_rack_backlog_conversion", "eps_impact": 0.09, "horizon_months": 12},
    {"name": "nvidia_partnership_acceleration", "eps_impact": 0.06, "horizon_months": 9}
  ],
  "scenarios": [
    {"label": "bull", "probability": 0.35, "pt_implied": 620, "assumptions": "Full backlog conversion + margin expansion"},
    {"label": "base", "probability": 0.45, "pt_implied": 510, "assumptions": "70% backlog conversion, stable margins"},
    {"label": "bear", "probability": 0.20, "pt_implied": 340, "assumptions": "Going concern overhang suppresses demand"}
  ],
  "expected_value_pt": 506
}
```

### Forensic Output (Full Scan)
```json
{
  "risk_score": 71,
  "recommendation": "CLEAR",
  "flags": [
    {"type": "going_concern", "severity": "sev4", "eps_haircut": 0.20, "dr_add_bps": 200},
    {"type": "10k_filing_delay", "severity": "sev3", "eps_haircut": 0.10, "dr_add_bps": 150}
  ],
  "eps_haircut_total": 0.28,
  "dr_add_bps_total": 350,
  "mgmt_trust_score": 0.58,
  "buy_rating_blocked": false
}
```

### Valuation Output
```json
{
  "pt_12m": 487,
  "rating": "BUY",
  "rr_ratio": 2.4,
  "faves_score": 7,
  "method_weights": {"pe": 0.40, "ev": 0.35, "dcf": 0.25},
  "consensus_gap": 0.08
}
```

### Communication Output — Flash Note Published
```json
{
  "output_type": "FLASH_NOTE",
  "enter_score": 5,
  "sla_met": true,
  "total_confidence": 0.74,
  "fallback_flags": ["FORENSIC_CONDITIONAL_GOING_CONCERN"],
  "cascade_preview": {
    "C": "BUY $487 PT | High Conviction despite going concern overhang",
    "A": "Initiate long position, size 2-3% portfolio, entry $390-$410",
    "S": "Bull 35%/$620 · Base 45%/$510 · Bear 20%/$340",
    "C2": "Q2 earnings (6 weeks), server rack delivery confirmation (8 weeks)",
    "D": "SMCI 10-Q footnote p.47, Nvidia partner transcript, Bloomberg consensus"
  }
}
```

---

## Example 02 · Gunn Mode — EM Compounder

### Input
```json
{
  "ticker": "NUBR3",
  "analyst_id": "analyst_002",
  "catalyst": "Nu Bank 5Y expansion across LATAM + management track record",
  "idea_source_tag": "compounder_screening"
}
```

### Scout Output
```json
{
  "alpha_score": {
    "coverage_gap_score": 21,
    "market_cap_fit": 17,
    "sector_relevance": 20,
    "valuation_anomaly": 19,
    "gunn_bonus": 25,
    "total_score": 100
  },
  "decision": "MUST_COVER",
  "horizon_tag": "COMPOUNDER",
  "downstream_mode": "gunn"
}
```

### Critical Factor Output (Gunn mode)
```json
{
  "factors": [
    {"name": "latam_unbanked_tam", "eps_impact": 0.12, "horizon_months": 60},
    {"name": "cross_sell_product_attach", "eps_impact": 0.08, "horizon_months": 36},
    {"name": "regulatory_moat_brazil", "eps_impact": 0.05, "horizon_months": 60}
  ],
  "build_to_last_score": {
    "management_quality": 8.5,
    "tam_size": 9.2,
    "moat_durability": 7.8,
    "total": 8.5
  },
  "scenarios": [
    {"label": "bull", "probability": 0.30, "pt_implied": 28.0},
    {"label": "base", "probability": 0.50, "pt_implied": 19.5},
    {"label": "bear", "probability": 0.20, "pt_implied": 11.0}
  ]
}
```

### Valuation Output (Gunn mode)
```json
{
  "pt_12m": 18.50,
  "pt_5y": 42.00,
  "rating": "BUY",
  "rr_ratio": 3.1,
  "ic_premium": 1.2,
  "method_weights": {"pe": 0.20, "ev": 0.30, "dcf": 0.50}
}
```

### Communication Output — Initiation Report Published
```json
{
  "output_type": "INITIATION_REPORT",
  "enter_score": 5,
  "sla_met": true,
  "total_confidence": 0.88,
  "cascade_preview": {
    "C": "BUY $18.50 PT (12M) / $42.00 PT (5Y) | Highest Conviction",
    "A": "Initiate long, size 4-5% portfolio, entry $12.00-$13.50",
    "S": "Bull 30%/$28 · Base 50%/$19.50 · Bear 20%/$11",
    "C2": "Q4 LATAM expansion disclosure, Brazil regulatory approval",
    "D": "BACEN filings, World Bank LATAM GDP data, Nu Bank investor day transcript"
  }
}
```

---

## Example 03 · Dual Mode — Mixed Horizon

### Input
```json
{
  "ticker": "MELI",
  "analyst_id": "analyst_001",
  "catalyst": "Q3 fintech revenue beat + LATAM logistics moat building",
  "idea_source_tag": "earnings_plus_compounder"
}
```

### Scout Output
```json
{
  "alpha_score": {
    "total_score": 91,
    "gunn_bonus": 10
  },
  "decision": "MUST_COVER",
  "horizon_tag": "MEDIUM",
  "downstream_mode": "dual"
}
```

### Communication Output
```json
{
  "output_type": "FLASH_NOTE",
  "queued": "INITIATION_REPORT",
  "initiation_eta_hours": 72,
  "enter_score": 5,
  "sla_met": true,
  "note": "Flash Note published immediately on Q3 catalyst. Initiation queued for full Build-to-Last analysis.",
  "cascade_preview": {
    "C": "BUY $2,100 PT | High Conviction — Q3 beat + long-term moat",
    "A": "Initiate long, size 3-4% portfolio",
    "S": "Bull 35%/$2,450 · Base 45%/$2,100 · Bear 20%/$1,400",
    "C2": "Q3 earnings release, logistics hub expansion announcement",
    "D": "MELI 10-Q, Bloomberg fintech segment data, World Bank LATAM e-commerce"
  }
}
```

---

## Example 04 · MNPI Detection — Immediate Halt

### Input
```json
{
  "ticker": "XYZ",
  "analyst_id": "analyst_003",
  "catalyst": "Supply chain disruption signal from channel checks"
}
```

### Intel MNPI Detection
```json
{
  "mnpi_flag": true,
  "mnpi_item": {
    "source": "crm_contact",
    "content": "Contact mentioned undisclosed supply constraint from earnings call prep",
    "confidence": 0.94
  },
  "pipeline_action": "COMPLIANCE_HALT",
  "mosaic_clear": false,
  "compliance_notified_at": "2026-02-15T14:23:11Z",
  "minutes_to_notify": 4
}
```

### Result
```json
{
  "publication_possible": false,
  "pipeline_status": "COMPLIANCE_HALT",
  "evidence_preserved": true,
  "audit_trail_locked": true,
  "downstream_agents_called": false
}
```

---

## Example 05 · Full Fallback Cascade — All MCPs Down

### Input
```json
{
  "ticker": "AAPL",
  "analyst_id": "analyst_001",
  "catalyst": "iPhone supercycle signal from supply chain",
  "mcp_status": {
    "bloomberg": "DOWN",
    "capital_iq": "DOWN",
    "financial_data_mcp": "DOWN"
  }
}
```

### Scout Fallback Sequence
```json
{
  "fallback_l1_activated": true,
  "l1_result": "financial_data_mcp timeout, using local cache",
  "cache_age_hours": 18,
  "conf_adj": -0.05
}
```

### Valuation Fallback Sequence
```json
{
  "fallback_l1_attempted": true,
  "l1_result": "Bloomberg timeout confirmed",
  "fallback_l2_attempted": true,
  "l2_result": "CapIQ also unavailable",
  "fallback_last_activated": true,
  "last_action": "sector_averages_used + analyst_consensus_manual",
  "analyst_input": {
    "consensus_pt": 210,
    "consensus_source": "Analyst provided manually",
    "timestamp": "2026-02-15T16:45:00Z"
  },
  "conf_adj_total": -0.32,
  "final_confidence": 0.61
}
```

### AuditTrail
```json
{
  "total_confidence": 0.61,
  "fallback_flags": [
    "SCOUT_FINANCIAL_DATA_FROM_CACHE",
    "VALUATION_BLOOMBERG_DOWN",
    "VALUATION_CAPIQ_DOWN",
    "VALUATION_LAST_FALLBACK_ACTIVATED",
    "ANALYST_MANUAL_CONSENSUS_INPUT"
  ],
  "publication_possible": true,
  "publish_decision": "PUBLISH with confidence warning in note footer"
}
```
