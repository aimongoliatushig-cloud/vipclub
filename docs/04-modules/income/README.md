---
type: module
status: selected-baseline
last_reviewed: 2026-08-07
---

# Income and Settlement Module

## Purpose

Own income events, effective-dated compensation rules, transparent three-day entertainer statements, deductions, loans, adjustments, approvals, payment evidence, and reconciliation.

## Entertainer categories

- customer-time/hourly share;
- normal tips;
- spreading tips;
- wine commission;
- other approved income;
- loan, lateness, no-show, approved missed-request, and other deductions.

Rank-based customer-time shares and spreading-tip interview values are proposals in the detailed requirements. They remain configurable and unapproved until the named financial owners decide them.

## Invariants

- A policy change never rewrites a finalized historical statement.
- Every line links source, branch, policy version, calculation, and correction.
- Manual deductions require evidence, reason, approval, and audit.
- A late/missed entertainer request is evidence first, not an automatic deduction.
- Corrections use adjustment or reversal records.

## Related documents

- [Loans, Compensation, and Settlement Requirements](../../loans-and-settlement-requirements.md)
- [Segregation of Duties](../../03-roles/SEGREGATION_OF_DUTIES.md)
- [Data and Domain Model](../../data-model.md)
