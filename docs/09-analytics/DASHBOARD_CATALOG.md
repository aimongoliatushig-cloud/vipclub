---
type: scaffold
status: draft
last_reviewed: 2026-08-18
---

# Dashboard Catalog

## Purpose

Define CEO, manager, HR, accounting, CRM, and role-specific dashboards.

## Current state

The complete dashboard catalog remains pending. Entertainer and authorized manager ranking views must show the policy version, scoring day/review window, unrounded/displayed 0-100 score, Level 1/2/3/Rookie threshold classification, effective rank state, and all eight component scores, weights, contributions, and data-quality states. Authorized users must be able to drill into source evidence and correction/appeal/override history, including incident-day attitude deductions and seven-item shift checklists. Attitude is 100 absent a substantiated incident for that day; dashboards must not carry a deduction forward. Dashboard totals and classifications must come from stored server-calculated ranking snapshots rather than client-side reweighting.

Sales views must display the exact branch/year/month/version benchmark used and remain branch-scoped. Authorized managers can compare a branch's 12-month ranges and versions, but the dashboard must not merge independent branch settings into a company-wide benchmark or substitute one branch's table for another.

The internal message center/reporting view is company-wide for the CEO and branch-scoped for authorized managers. It may summarize complaint/compliment volume, delivery/read state, and moderation/review state from authorized records. Complaint subjects receive no dashboard tile, count, preview, export row, drill-down, or response route for complaints about them. Compliments are visible to their recipient plus authorized management. Internal complaint metrics remain separate from customer-complaint ranking metrics and cannot alter any ranking result.

The same view includes customer-portal complaint/praise records with a required source discriminator, relevant branch, selected entertainer, VIP room/experience context, and masked customer identity. Customer complaints remain management-only; praise delivery/read state is visible to the selected entertainer only through their own field-filtered inbox. Customer complaint volume is not the 15% ranking component: reporting must separately show submitted, verified/reviewed, and policy-eligible evidence states, with no automatic score impact.

## Related documents

- [Knowledge-base gap analysis](../../knowledge-base-gap-analysis.md)
- [Stakeholder clarification register](../../stakeholder-clarification-register.md)
