# VIP Club business-logic reconciliation

- **Decision date:** 2026-08-11
- **Published to workspace:** 2026-08-13
- **Status:** Approved baseline; listed sub-rules remain open
- **Tracking:** BAT-75, BAT-83, BAT-84, BAT-96

## Why this record exists

Earlier working drafts contain a proposed four-level entertainer rank, a proposed rolling three-month customer-spend model, editable manager thresholds, and a standalone cashback balance. The approved product baseline recorded in Linear on 2026-08-11 supersedes those proposals. Active UI, APIs, tests, BPMN, and policy documents must use this record when they conflict with an older draft.

## Approved entertainer-ranking baseline

- The active model has **Rank 1, Rank 2, and Rank 3**.
- Evaluation occurs on a **14-day cadence** using verified, source-linked evidence.
- A Branch Manager reviews the evidence and submits a recommendation.
- The CEO makes the final approve, return, or reject decision with a mandatory reason.
- Current rank, evidence, recommendation, decision, policy version, effective date, history, and appeal must remain explainable and auditable.
- An active client UI must not calculate, promote, demote, suspend, or override a rank without the effective policy version and an authorized server workflow.

Open rank sub-rules remain: metric weights, numerical thresholds, hard gates, benefit effects, stale/missing-data treatment, appeal timing, and manual-adjustment authority.

## Approved customer-membership baseline

- The five customer levels are **Bronze, Silver, Gold, Diamond, and Black Diamond**. Mongolian UI labels are **Хүрэл, Мөнгө, Алт, Очир, Хар очир**.
- After every completed eligible visit, calculate:

```text
Average eligible expenditure per completed eligible visit
= total included eligible expenditure
÷ completed eligible visit count
```

- Compare the result with the active, effective-dated, branch-specific membership range.
- A Branch Manager may support the calculated change or retain the current level as an explicit exception.
- The CEO has final approval and override authority.
- Current level, calculated level, included/excluded spend, completed eligible visits, active range, policy version, manager position, CEO decision, effective period, and history must remain separate and auditable.
- The rolling three-month proposal is superseded and must not remain as an active calculation.

Open membership sub-rules remain: exact eligible-spend inclusion, refunds, cancellations, discounts, complimentary items, corrections, cross-branch classification, exact branch ranges, benefits, and effective transition rules.

## Benefits, points, and monetary value

- Do not invent a standalone cashback balance.
- Any approved points, privilege, or monetary-value mechanism must use immutable, source-linked earn, use, expire, adjust, and reverse entries.
- Until the financial and benefit rules are approved, manager screens may show verified benefit-use evidence but must not create, edit, redeem, or advertise a balance.

## Manager UI boundary

The browser-local manager prototype may show branch-scoped, masked customer intelligence, current source membership/rank, and separate calculation evidence. It must not expose unrestricted PII, send campaigns, edit thresholds, assign a membership level, or create a rank decision. Consequential actions require secure field-projected APIs, policy-version checks, authorization, audit, idempotency, and stale-decision protection.

## Superseded statements to remove

- four-level Bronze/Silver/Gold/Diamond entertainer ranking;
- rolling three-month membership average and inactive-month-zero calculation;
- direct Branch Manager threshold editing without an approval lifecycle;
- standalone client-side cashback balance.
