# Business Process Catalog

This catalog is the starting point for the VIP Club operating model. Each listed process will receive a detailed Markdown specification and a version-controlled BPMN diagram before implementation.

## Process standards

Every detailed process must define its owner, roles, trigger, required inputs, normal flow, exceptions, decisions, data records, permissions, notifications, audit events, metrics, and acceptance criteria.

## Phase 0 — Foundation

| ID | Process | Purpose | Primary owner |
| --- | --- | --- | --- |
| P00 | Policy publication and versioning | Approve, publish, supersede, and apply policies safely. | CEO / Operations |
| P01 | User, role, and branch access lifecycle | Create, change, suspend, and revoke access by role and branch. | HR / System administrator |
| P02 | Audit and correction workflow | Correct sensitive records through traceable adjustment or reversal. | System administrator / Finance |
| P03 | Branch setup and activation | Create a future branch, apply defaults, assign its team and roles, configure scope, and activate reporting safely. | System administrator / CEO |

## Phase 1 — Foundation Operations and Customer Onboarding

| ID | Process | Purpose | Primary owner |
| --- | --- | --- | --- |
| P10 | Employee and entertainer onboarding | Create identity, branch, role, schedule, bank/contract records, and required acknowledgements. | HR |
| P11 | Schedule and attendance | Assign shifts, record check-in/out, classify attendance, and manage corrections. | Branch manager |
| P12 | Entertainer performance and rank evaluation | Convert verified performance events into explainable rank outcomes. | Operations / Branch manager |
| P13 | Three-day income settlement | Calculate earnings, deductions, loan repayment, review, approve, and record settlement. | Accounting |
| P14 | Performance-based loan | Check eligibility, obtain approval, disburse, and repay through settlements. | CEO / Accounting |
| P15 | Customer registration and consent | Find or create customer profile and record marketing consent and channel preferences. | Host / Reception |
| P16 | Reservation lifecycle | Request, confirm, assign, arrive, complete, cancel, and attribute revenue. | Reception / Branch manager |

## Phase 2 — Workforce Task Management

| ID | Process | Purpose | Primary owner |
| --- | --- | --- | --- |
| P20 | Task assignment and acknowledgement | Assign work by role and branch, notify the assignee, and record receipt. | CEO / Manager |
| P21 | Task execution and completion | Record progress, comments, evidence, result, review, rework, and closure. | Assignee / Manager |
| P22 | Overdue task escalation | Remind, escalate, and report delayed or blocked work. | Manager |
| P23 | Formal order and policy acknowledgement | Issue a required instruction and capture read/acknowledgement evidence. | CEO / Manager |
| P24 | Maintenance request and closure | Report, assign, repair, verify, and close maintenance work. | Branch manager |

## Phase 3 — CRM, Membership, Points, Privileges, and Intelligence

| ID | Process | Purpose | Primary owner |
| --- | --- | --- | --- |
| P30 | Customer visit and spend attribution | Reconcile verified visits and eligible spend to a customer, branch, reservation, and entertainer when applicable. | Reception / Operations |
| P31 | Unified membership evaluation | Evaluate eligible spend against the effective policy and maintain one Bronze-to-Black-Diamond status across all branches. | CRM manager |
| P32 | Point earn, redemption, and correction | Earn points from verified POS transactions; redeem, expire, reverse, adjust, and reconcile one cross-branch point ledger. | CRM manager / Finance |
| P33 | Privilege entitlement and use | Issue branch-eligible quotas and privileges, check availability, use or reverse them, reset periodic allowances, and audit every event. | CRM manager / Branch manager |
| P34 | Customer segmentation and campaign | Build a segment, validate consent, send a campaign, and track communication history and outcomes. | Marketing / CRM manager |
| P35 | Customer intelligence review | Analyze visit cadence, spend, point activity, status, privilege use, branch behavior, and entertainer affinity. | Manager / CEO |
| P36 | Membership launch migration and manual approval | Calculate initial statuses from available history or route manager nominations through CEO approval with reason and source tags. | CEO / CRM manager |

## Membership process rules

- Membership evaluation stores one visible status for the member across the company.
- Branch policy changes privilege eligibility, not the displayed status name.
- The retention review occurs on the member's 12-month anniversary.
- A missed retention threshold starts a 30-day grace period; any completed downgrade reduces status by no more than one level.
- CRM records the spend shortfall needed to retain or unlock status and may send approved notifications.
- POS supplies transaction facts; CRM owns status, point ledger, privileges, anniversary, and approval state.
- Monthly entry quotas do not carry over. Annual transport and other periodic quotas reset according to the effective policy.
- Open numerical values and exact operating rules remain configuration or explicit approvals, never hidden constants.

## Phase 4 and later

| ID | Process | Purpose | Primary owner |
| --- | --- | --- | --- |
| P40 | CEO–Manager Goal Engine | Propose, approve, execute, review, and improve monthly branch goals. See [monthly sales goal approval](monthly-sales-goal-process.md). | CEO / Manager |
| P41 | Feedback, complaints, and retention | Receive, restrict, investigate, resolve, and measure people-related concerns. | HR |
| P42 | Customer and entertainer branch transfer | Offer an appropriate alternate branch while preserving authorization and attribution. | Branch manager |
| P43 | Payroll, compliance, and financial reconciliation | Apply approved statutory rules, post records, reconcile, and retain evidence. | Accounting |

## BPMN delivery order

1. P15 Customer registration and consent
2. P11 Schedule and attendance
3. P13 Three-day income settlement
4. P20 Task assignment and acknowledgement
5. P21 Task execution and completion
6. P16 Reservation lifecycle
7. P31 Unified membership evaluation
8. P32 Point earn, redemption, and correction
9. P33 Privilege entitlement and use
10. P36 Membership launch migration and manual approval
11. P34 Customer segmentation and campaign
12. P40 CEO–Manager Goal Engine

Existing membership and benefit/cashback BPMN diagrams must be revised before implementation so they reflect the unified status, 12-month anniversary, 30-day grace, point ledger, and branch-specific privilege model.

## Open design decisions

Detailed BPMN work must not invent policy. The membership framework is selected, while eligible spend, cross-branch threshold normalization, exact thresholds, upgrade timing, point economics, privilege terms, role authority, reconciliation, and abuse controls remain open decisions.
