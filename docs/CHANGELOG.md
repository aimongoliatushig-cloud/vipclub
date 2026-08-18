---
type: scaffold
status: draft
last_reviewed: 2026-08-18
---

# Knowledge-Base Changelog

## Purpose

Record material documentation, policy, architecture, and scope changes.

## 2026-08-18

- Specified the canonical eight entertainer-ranking weights: attendance 10%, customer complaints 15%, sales 40%, entertaining/pole-dancing skill 5%, cleanliness and beauty 5%, shift effort 10%, personal development 5%, and entertainer attitude 10%.
- Added the machine-readable weight contract and executable contract tests.
- Extended the data, API, internal PWA, KPI, audit, policy-version, and test specifications with the eight-factor contribution breakdown.
- Confirmed a 0-100 daily weighted score with Level 1 `[90,100]`, Level 2 `[80,90)`, Level 3 `[70,80)`, and Rookie/unranked `[0,70)`.
- Added independent branch-specific 12-month Level 1/2/3 sales benchmark settings, explicit Rookie handling, schema/example artifacts, authorization/audit requirements, and validation rules.
- Left raw-input normalization, POS-sales benchmark normalization, display rounding, gates, and related approval decisions open because no approved formulas are present in this repository.
- Defined attitude as default 100 with branch-manager-only incident investigation: unsubstantiated allegations do not reduce it, substantiated discretionary deductions affect only the incident day, and the next day resets to 100. Deduction rubric/appeals/complaint overlap remain open.
- Added the seven-checkbox shift-effort record and confirmed `completed/7 × 100` component scoring with a 10% contribution, unrounded storage, branch-authorized submission, unique daily/shift records, and no extra-performance credit.
- Added branch-specific effective-dated currency penalties per missed performance using `missed_count × amount_per_miss`, with non-retroactive settings and score/money separation.
- Mapped the penalty to an itemized entertainer three-day settlement/payout line—the repository's paystub equivalent—with source checklist/setting links and auditable corrections/reversals.
- Added branch-and-shift-specific ready times, per-minute lateness amounts, and fixed no-show amounts for entertainers, configured only by the authorized branch manager and posted as itemized three-day settlement deductions.
- Confirmed no-show precedence: a scheduled shift classified as a no-show receives only the fixed no-show deduction, with no lateness-minute calculation or lateness charge for that shift.
- Added an audited employee complaint/compliment workflow with CEO company-wide oversight, authorized-manager branch scope, compliment delivery to the praised employee, and management-only complaint content.
- Confirmed that complaint subjects receive no complaint delivery, view, preview, or response access; senders receive submission confirmation without management review data.
- Kept internal employee complaints separate from the customer-complaints ranking factor and all automatic score effects; a complaint can become attitude evidence only through the existing branch-manager substantiation workflow.
- Added an authenticated customer helper-portal flow for entertainer complaints and praise, requiring identified customer, VIP room, and applicable visit/reservation/session context.
- Routed customer complaints only to CEO/relevant managers and customer praise to the selected entertainer plus management, with source distinction and field-level customer/room privacy.
- Defined customer complaints as potential evidence for the 15% customer-complaints factor only after approved verification/review and normalization; customer praise and initial submission have no automatic ranking effect.

## Related documents

- [Knowledge-base gap analysis](../../knowledge-base-gap-analysis.md)
- [Stakeholder clarification register](../../stakeholder-clarification-register.md)
