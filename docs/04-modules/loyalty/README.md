---
type: module-specification
status: draft
last_reviewed: 2026-08-16
---

# Loyalty Module

## Purpose

Provide versioned branch membership policies, per-visit evaluation, manager-approved membership changes, benefits, cashback, customer-facing status, and complete auditability.

## Core capabilities

1. Configure five ordered levels and branch-specific average-spend-per-visit thresholds.
2. Version and effective-date every policy change.
3. Recalculate eligibility after every reconciled completed visit and relevant financial correction.
4. Store immutable calculation snapshots with source visit and bill references.
5. Compare calculated level with the current approved level.
6. Create or refresh an upgrade/downgrade recommendation.
7. Require an authorized manager decision before changing the effective level.
8. Support Approve, Keep current, and Review later decisions.
9. Continue recalculation after Keep current and recommend again when later evidence still supports a change.
10. Apply benefit entitlement changes only after an approved level assignment.
11. Maintain auditable benefit and cashback ledgers.
12. Display calculation explanation, policy version, decision history, and data freshness.

## Authoritative formula

```text
Average expenditure per visit
= Sum of eligible net expenditure in the policy window
÷ Count of eligible completed visits in the policy window
```

The recommended default window is the latest 10 eligible visits within 12 months, subject to CEO or General Manager approval.

## Main records

- Loyalty Policy Version
- Membership Evaluation Snapshot
- Membership Change Recommendation
- Membership Decision
- Membership Level Assignment
- Benefit Definition
- Benefit Entitlement
- Benefit Redemption
- Cashback Ledger Entry
- Audit Event
- Notification

## Workflow invariant

A calculation may recommend a level; it must never directly change the effective membership level. Only an authorized approval creates a new Membership Level Assignment.

A Keep current decision is scoped to one evaluation. It does not disable subsequent calculations, recommendations, reminders, or escalation.

## Related documents

- [CRM and loyalty requirements](../../crm-and-loyalty-requirements.md)
- [Data model](../../data-model.md)
- [Membership evaluation BPMN](../../diagrams/bpmn/process-31-membership-evaluation.bpmn)
- [Stakeholder clarification register](../../stakeholder-clarification-register.md)
