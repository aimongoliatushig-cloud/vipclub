---
type: scaffold
status: draft
last_reviewed: 2026-08-18
---

# Attendance Integration

## Purpose

Define attendance sources, import, matching, correction, and reconciliation.

## Current state

The wider attendance integration remains pending source-system discovery. Ranking and settlement require scheduled shift, branch, effective required ready time, actual arrival/check-in, no-show classification, evidence, correction state, and source identifiers.

Attendance/no-show/lateness remain raw inputs to the 10% ranking factor. Separately, the system resolves the effective branch/shift penalty setting: late arrivals use `lateness_minutes × amount_per_minute_late`; scheduled no-shows use only the fixed no-show amount. Confirmed precedence forbids calculating or charging lateness for the same shift when no-show applies.

The resulting itemized three-day settlement deductions retain source attendance evidence and setting/version. Effective-dated setting changes are non-retroactive, and attendance corrections produce linked financial adjustments/reversals rather than rewriting history.

## Related documents

- [Knowledge-base gap analysis](../../knowledge-base-gap-analysis.md)
- [Stakeholder clarification register](../../stakeholder-clarification-register.md)
