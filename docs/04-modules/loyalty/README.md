---
type: module
status: selected-baseline
last_reviewed: 2026-08-07
---

# Loyalty Module

## Purpose

Provide one membership identity, one visible five-level status, one cross-branch point balance, branch-specific privilege eligibility, anniversary evaluation, redemption, and auditable controls.

## Selected product model

- One membership account per customer across the company.
- One visible status across all branches: Bronze, Silver, Gold, Diamond, or Black Diamond.
- One point account that earns and redeems at all branches.
- Branch-specific privilege policy may vary eligibility without changing the displayed status.
- CRM owns status, points, privileges, redemptions, anniversaries, and approvals.
- POS supplies verified transactions and corrections; the model does not depend on permanent or dynamic POS membership discounts.
- Status retention uses an individual 12-month anniversary review.
- A missed threshold starts a 30-day grace period; any completed downgrade is limited to one level per review.
- Launch classification uses verified history from April 2026 onward where available, or manager nomination with reason and CEO approval.

## Module responsibilities

- import and reconcile eligible POS transaction and refund events;
- calculate eligible spend and effective point earn;
- maintain immutable point ledger entries and a reconcilable balance;
- evaluate anniversary, grace, retain, upgrade, and downgrade decisions;
- expose remaining spend to retain or reach status;
- issue, reset, consume, reverse, and audit privilege quotas;
- evaluate branch-specific privilege eligibility;
- manage manual launch and exception approvals;
- provide staff and customer views with positive unlock language;
- retain policy version, evidence, explanation, and audit events.

## Policy boundaries

The following remain configuration or explicit approvals, not implementation constants:

- eligible-spend definition and five threshold values;
- cross-branch threshold normalization;
- upgrade timing and minimum history;
- final point earn rates, point-to-MNT value, expiry, limits, and eligible redemption;
- final transport, entry, reservation, guest, no-show, abuse, and premium-branch rules;
- role authority, separation of duties, and reconciliation controls.

Working example rates and privilege quotas are documented in the canonical requirements page but are not approved values.

## Related documents

- [CRM and Loyalty Requirements](../../crm-and-loyalty-requirements.md)
- [Business Process Catalog](../../business-processes.md)
- [Data and Domain Model](../../data-model.md)
- [Technical Architecture](../../technical-architecture.md)
- [Stakeholder Clarification Register](../../stakeholder-clarification-register.md)
- [Оролцогч талуудын тодруулгын бүртгэл](../../stakeholder-clarification-register-mn.md)
