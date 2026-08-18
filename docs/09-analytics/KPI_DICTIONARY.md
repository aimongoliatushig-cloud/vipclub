---
type: scaffold
status: draft
last_reviewed: 2026-08-18
---

# KPI Dictionary

## Purpose

Define KPI formulas, source records, owners, refresh cadence, and drill-down evidence.

## Current state

The complete KPI catalog remains pending repository and source-system discovery. The canonical entertainer-ranking KPIs are defined below.

## Entertainer ranking KPIs

| KPI | Formula | Required dimensions and evidence |
| --- | --- | --- |
| Entertainer weighted ranking score | Sum of eight `normalized_score × weight_percent / 100` contributions; weights are 10/15/40/5/5/10/5/10 and total 100%. | Entertainer, branch, evaluation window, policy version, calculation/effective time, data-quality state, rank. Drill down to eight component results and source records. |
| Ranking component contribution | Component normalized score multiplied by its canonical weight divided by 100. | Component ID, normalized score, weight, unrounded contribution, source evidence, explanation. |
| Personal-development contribution | `personal_development normalized score × 5 / 100`. | Training/coaching/certification/learning evidence allowed by the effective policy version. |
| Daily rank classification | Level 1 for unrounded score `[90,100]`; Level 2 `[80,90)`; Level 3 `[70,80)`; Rookie/unranked `[0,70)`. Values outside `[0,100]` are invalid. | Entertainer, branch, scoring day, unrounded score, matched interval, effective policy version, effective rank. |
| Sales benchmark context | Branch-specific configured min/max for the entertainer's branch, calendar year/month, and level. | Branch, currency, year/month, version, effective period, manager/audit history; no company fallback. |
| Sales component normalized score | Approved versioned normalization of verified daily entertainer-attributed POS sales against the selected branch/year/month/level range. | POS evidence, entertainer branch, benchmark reference, formula/policy version. Formula remains open. |
| Entertainer-attitude contribution | Daily attitude score defaults to 100; a substantiated incident-day score is `100 - manager deduction`, bounded 0-100; contribution is `attitude score × 10 / 100`. | Incident/evidence, entertainer/branch/day, branch manager, finding, deduction/result, reason, history, and policy version. No carry-forward. |
| Shift-effort component score | `completed_count / 7 × 100`. | Entertainer, branch, shift, scoring day, seven boolean items, completed/missed counts, submitter/role, evidence/notes, correction history. |
| Shift-effort contribution | `shift-effort component score × 10 / 100`. | Retain unrounded values: 7/7 = 10 points, 5/7 = `7.142857...`, 0/7 = 0. |
| Missed-performance monetary penalty | `missed_count × effective branch amount_per_miss`. | Branch, scoring time, setting/version, currency, per-miss amount, stored penalty, evidence, correction/reversal link, and itemized three-day settlement payout line/net impact. |
| Lateness monetary penalty | `lateness_minutes × effective branch amount_per_minute_late`; zero for on-time or no-show. | Shift, branch, ready/actual time, minutes, setting/version, rate/currency, settlement line, correction/reversal. |
| No-show monetary penalty | Effective fixed branch no-show amount for a scheduled no-show; mutually exclusive with lateness. | Scheduled shift, branch, no-show evidence, setting/version, amount/currency, settlement line, correction/reversal. |

Attendance reporting combines attendance, no-shows, and lateness within the single 10% attendance component. Dashboards and exports use stored server-calculated snapshots and policy versions; they must not apply independent weights, round before threshold classification, hide missing/disputed components, or mix independent branch benchmark tables.

## Internal team message reporting

| KPI | Formula | Required dimensions and evidence |
| --- | --- | --- |
| Internal message submissions | Count of authorized internal team messages by type and creation period. | Complaint/compliment, relevant branch, sender/subject where permitted, created time; CEO company-wide and manager branch scope. |
| Compliment delivery state | Count of compliments by delivery/read state. | Praised employee, branch, authorized manager/CEO oversight, delivery/read audit. |
| Complaint moderation queue | Count of management-visible complaints by moderation/review status. | CEO or authorized subject-branch manager only; never exposed to the complaint subject. |

These operational measures are not ranking factors. Internal complaints must not be combined with the 15% customer-complaints component or treated as an attitude deduction without a separate substantiated branch-manager incident decision.

| KPI | Formula | Required dimensions and evidence |
| --- | --- | --- |
| Customer entertainer messages | Count by customer `complaint`/`praise` and creation period. | `customer_portal` source, relevant branch, selected entertainer, VIP room/context, authorized/masked customer identity, delivery/read/review state. |
| Customer complaint evidence state | Count by submitted, reviewed/verified, and policy-eligible evidence state. | Complaint, reviewer, branch, evidence linkage, approved normalization/policy version; submission is never itself a ranking deduction. |

Customer-origin measures remain visibly separate from internal employee messages. Praise delivery does not create ranking credit, and complaint counts must not be used as the 15% normalized score without the approved review and normalization rule.

## Related documents

- [Knowledge-base gap analysis](../../knowledge-base-gap-analysis.md)
- [Stakeholder clarification register](../../stakeholder-clarification-register.md)
