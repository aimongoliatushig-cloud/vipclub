---
type: scaffold
status: draft
last_reviewed: 2026-08-18
---

# Test Strategy

## Purpose

Define unit, integration, permission, workflow, audit, E2E, accessibility, and performance testing.

## Current state

The complete application test strategy remains pending repository audit. A standard-library contract test now validates the machine-readable entertainer-ranking weight specification:

```powershell
python -B -m unittest discover -s tests -v
```

## Entertainer-ranking focused coverage

The ranking contract tests must prove:

- the policy has exactly eight canonical factors in order with weights 10%, 15%, 40%, 5%, 5%, 10%, 5%, and 10%;
- weights total exactly 100%;
- each factor's weighted contribution is `normalized_score × weight / 100`;
- contributions for all eight factors sum to the total;
- complaints contributes 15%, entertaining/pole-dancing skill contributes 5%, and attitude contributes 10%;
- attitude defaults to 100 without an incident, an unsubstantiated allegation remains 100, a substantiated branch-manager decision can reduce it within 0-100 for only that day, and the following day resets to 100 without another incident;
- attitude decisions require the full incident/evidence/manager/finding/deduction/result/reason/audit metadata and cannot be finalized by a lead entertainer;
- shift effort requires exactly seven booleans, matching counts, authorized branch manager/lead submitter metadata, and one current record per entertainer/branch/shift/day;
- shift math proves 0/7 = 0/0, 5/7 = `71.428571...`/`7.142857...`, and 7/7 = 100/10 before display rounding;
- monetary penalty proves 0/1/2 misses equal 0/1/2 times the effective branch amount while ranking score remains unchanged by currency values;
- branch-specific per-miss settings can differ, reject negative amounts, resolve by effective date, and never retroactively change stored penalties;
- the payout/settlement line retains missed count, per-miss amount, total/currency, checklist/shift and setting/version references, and negative net-settlement impact;
- correction/reversal linkage preserves historical checklist and payout sources;
- personal development is present, is weighted at 5%, and references development evidence;
- attendance contains attendance, no-show, and lateness signals inside its single 10% factor;
- attendance money proves on-time produces no deduction, late arrival uses minutes times the effective branch rate, and no-show uses only the fixed amount with zero/no calculated lateness;
- branch attendance settings can differ, reject negative values, resolve by branch/shift/effective time, and never retroactively change stored deductions;
- attendance settlement lines retain their shift, time, setting/version, amount, currency, evidence, and correction/reversal sources while remaining separate from the ranking score; and
- exact decimal rank boundaries classify 69.99, 70, 79.99, 80, 89.99, 90, and 100 correctly;
- values below 0 or above 100 fail validation and receive no rank;
- a valid sales benchmark table has exactly months 1-12, Level 1/2/3 ranges, explicit Rookie handling, non-negative min/max values, and monotonic level endpoints;
- branch/year/version, currency, effective period, manager actor/time, and audit history are required;
- two branches can store different ranges for the same month/year without company-wide fallback;
- the January Level 1 MNT 8,000,000-10,000,000 fragment is explicitly illustrative and incomplete; and
- no calculation, API, UI, dashboard, or export can silently omit or rebalance a component or substitute another branch's benchmark.

Internal team message contract tests must also prove that every employee role can submit either type with a selected person and required text; complaints route only to the CEO and managers authorized for the subject branch; a complaint subject cannot receive, view, or respond; compliments deliver to the praised employee plus authorized management; CEO and manager scopes differ; sender confirmation excludes management review data; and neither message type changes customer complaints, attitude, or any ranking value automatically. A separate substantiated branch-manager attitude review is required before an internal complaint can contribute evidence to an attitude deduction.

Customer portal message contract tests must prove that anonymous or missing customer identity is rejected; VIP room and at least one visit/reservation/session reference are required; branch routing follows validated context; customer complaints route only to CEO/relevant managers and never to the entertainer; praise routes to the entertainer plus management with field-level context policy; customer and employee sources remain distinguishable; and submission creates no ranking impact. A customer complaint can become 15% component evidence only through the approved verification/review and normalization path.

When production Frappe/API/PWA code is added, equivalent unit, integration, permission, audit, and user-journey tests must exercise the real server calculation and eight-component response rather than treating this policy-contract test as application coverage.

## Related documents

- [Knowledge-base gap analysis](../../knowledge-base-gap-analysis.md)
- [Stakeholder clarification register](../../stakeholder-clarification-register.md)
