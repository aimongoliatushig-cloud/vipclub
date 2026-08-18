---
type: analytics
status: selected-baseline
last_reviewed: 2026-08-18
---

# KPI Dictionary

## Purpose

Define KPI meaning, source evidence, owner, refresh cadence, drill-down, and whether a metric may affect a decision or compensation. A displayed metric is not automatically a compensation rule.

| Metric | Definition/source | Owner/cadence | Decision status |
| --- | --- | --- | --- |
| Call answer rate | Answered calls ÷ eligible incoming calls from reconciled CallPro facts | Call operations / daily-periodic | Reporting selected; provider fields: **TBD — Business configuration required** |
| Call booking conversion | Calls linked to completed reservation creation ÷ eligible handled calls | Call operations / daily-periodic | Selected reporting metric; denominator: **TBD — Business configuration required** |
| Call purpose distribution | Count/share by ERP-side purpose classification | Call operations / daily-periodic | Selected reporting metric |
| Entertainer request response time | Arrival or approved response timestamp minus request time | Branch operations / realtime-daily | Candidate manager/customer-experience KPI |
| Entertainer request completion rate | Completed eligible requests ÷ eligible requests | Branch operations / daily-periodic | Candidate KPI |
| Missed entertainer requests | Eligible requests ending Missed or timing out under approved rule | Branch operations / daily | Candidate KPI; timeout: **TBD — Business configuration required** |
| Visit conversion | Billed/served groups ÷ checked-in groups | Branch operations / daily-periodic | Selected reporting metric |
| Customer drop-off rate | Recorded legitimate drop-offs ÷ checked-in groups | Branch operations / daily-periodic | Selected reporting metric |
| Reconciliation exception rate | Unexplained customer sessions ÷ checked-in groups | Branch operations / daily-periodic | Selected exception metric |
| Customer feedback trend | Counts/rates by compliment, complaint, suggestion, branch, and resolved state | Branch Manager / periodic | Reporting selected; compensation use: **TBD — Business configuration required** |
| Entertainer sales/performance | Approved eligible sales/performance from reconciled source | Ranking owner / configured window | Ranking dimension; threshold/weight: **TBD — Business configuration required** |
| Entertainer attendance/reliability | Attendance, late, no-show, work-night evidence | Ranking owner / configured window | Ranking dimension; rules/weight: **TBD — Business configuration required** |
| Entertainer customer loyalty | Repeat customers/reservations under approved definition | Ranking owner / configured window | Ranking dimension; repeat rule/weight: **TBD — Business configuration required** |
| Entertainer behavioral record | Reviewed verified incidents, not raw complaints | Ranking owner / configured window | Ranking dimension; scoring: **TBD — Business configuration required** |
| Manager target attainment | Actual reconciled sales ÷ CEO-set target | CEO / periodic-monthly | Selected measure |
| Manager task execution | Approved completion/overdue evidence from projects/tasks | CEO / periodic-monthly | Candidate KPI weight: **TBD — Business configuration required** |
| Manager attendance/reliability | Approved manager attendance, late, no-show evidence | CEO / monthly | Candidate KPI weight: **TBD — Business configuration required** |
| Manager reward/penalty | Result of approved effective-dated financial policy and human review | HR/Accounting / monthly | Formula/boundaries: **TBD — Business configuration required** |
| Branch health | Configured composition of approved branch metrics | CEO / cadence: **TBD — Business configuration required** | **TBD — Business configuration required** |

## Candidate customer-experience inputs

Possible manager/branch KPI inputs include response time, request completion, missed requests, drop-off, conversion, complaints per visit, repeat-customer rate, request-resolution time, alternative-entertainer time, and feedback trend.

Final selection and weights are **TBD — Business configuration required**. Prefer metrics with reliable automated sources, manager influence, resistance to gaming, and audit drill-down.

## KPI governance

- Retain formula and policy version.
- Retain source record references and refresh time.
- Distinguish missing, late, unreconciled, and excluded data.
- AI may explain changes and flag anomalies but does not secretly set scores or compensation.
- Corrections create new snapshots or adjustments rather than silently rewriting finalized outcomes.
- UI and reports drill to authorized evidence.

## Open decisions

- Final formulas, denominators, inclusion/exclusion, periods, thresholds, weights, and severity.
- Which candidate metrics affect compensation versus reporting only.
- CallPro and POS source completeness.
- Reconciliation tolerance and exception aging.
- Branch health color/alert rules.
