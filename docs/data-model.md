# Data and Domain Model

This is the logical data model for the VIP Club system. ERPNext/Frappe core records should be reused where appropriate; custom records belong in the dedicated VIP Club custom app. Final technical names must follow repository conventions.

## Model principles

- Every sensitive financial, policy, rank, loyalty, and status change is auditable.
- Corrections use reversal or adjustment records rather than silent deletion.
- Policies, thresholds, percentages, benefits, and formulas are versioned and effective-dated.
- Branch and role scope is enforced server-side.
- Source-system imports are idempotent and reconcilable.

## Organization and access

| Entity | Purpose | Key relationships |
| --- | --- | --- |
| Club Branch | One of four operational branches with company, cost center, managers, and settings. | Company, Employee, Customer Visit, Task |
| Role Scope / Access Grant | Defines a user’s branch, role, date range, and restricted actions or fields. | User, Club Branch |
| Audit Event | Immutable record of consequential actions and before/after summary. | Actor, any business record |
| Policy Version | Effective-dated rules used by calculations and workflows. | Ranking, loans, loyalty, benefits |

## Workforce and operations

| Entity | Purpose | Key relationships |
| --- | --- | --- |
| Employee / Entertainer Profile | Identity, branch, status, bank verification, rank, and privacy profile. | Employee, User, Club Branch |
| Employee Lifecycle Event | Onboarding, change, suspension, resignation, or offboarding history. | Employee |
| Operational Task | Assigned work with deadline, state, evidence, blockers, comments, and approval. | Assignee, Branch, Task Evidence |
| Task Comment / Evidence | Conversation, result notes, images, or other completion proof. | Operational Task |
| Attendance Evidence Event | Check-in/out or attendance signal with source and original time. | Employee, Shift |
| Attendance Correction Request | Evidence-backed correction, decision, and adjustment reference. | Attendance Event |
| Maintenance Request | Branch issue, urgency, assignee, due date, and completion evidence. | Club Branch, Task |

## Customers, visits, reservations, and consent

| Entity | Purpose | Key relationships |
| --- | --- | --- |
| Customer | Core member identity and contact profile. | Consent, Preference, Visit, Reservation |
| Customer Identity Match | Normalized phone/external identity and duplicate or merge status. | Customer |
| Customer Consent | Versioned acceptance or revocation of terms and promotional consent. | Customer |
| Customer Channel Preference | Approved channels and branch subscriptions, such as Viber, Telegram, and email. | Customer, Consent |
| Customer Visit | Verified visit, spend, branch, entertainer attribution, and reservation link. | Customer, Club Branch, Reservation, Entertainer |
| Club Reservation | Requested, confirmed, assigned, arrived, completed, cancelled, or no-show reservation. | Customer, Branch, Entertainer |
| Branch Customer Transfer | Cross-branch alternative, acceptance, receiving reservation, and attribution. | Customer, Origin/Receiving Branch |

## CRM, segmentation, and messaging

| Entity | Purpose | Key relationships |
| --- | --- | ---|
| Customer Segment | Saved behavioral or profile-based group of eligible customers. | Segment Membership, Campaign |
| Segment Membership | A customer’s membership in a segment and how it was determined. | Customer, Customer Segment |
| Campaign | Consent-aware broadcast definition, audience, channel, content, approval, and outcome. | Segment, Message Delivery |
| Message Delivery | Per-customer message history: channel, send time, delivery state, and provider reference. | Customer, Campaign, Consent |
| Customer Intelligence Snapshot | Calculated customer metrics such as recency, frequency, spend, visit cadence, and entertainer affinity. | Customer, Visits, Reservations |

## Five-level membership, benefits, and cashback

| Entity | Purpose | Key relationships |
| --- | --- | --- |
| Loyalty Policy Version | Five levels, threshold formula, points/value rules, expiry, downgrade, and effective dates. | Branch, Evaluation, Benefit |
| Membership Evaluation Snapshot | Explainable result that assigns a member level using approved policy and source values. | Customer, Loyalty Policy |
| Membership Level Assignment | Current and historical level for a customer, branch scope, effective dates, and reason. | Customer, Membership Evaluation |
| Benefit Definition | Configurable privilege, eligibility, limits, value, and branch scope. | Loyalty Policy, Benefit Entitlement |
| Benefit Entitlement | A customer’s available allowance for a benefit in a period. | Customer, Benefit Definition |
| Benefit Redemption | What benefit was used, by whom, when, where, and any reversal. | Entitlement, Branch, Operator |
| Cashback Ledger Entry | Immutable credit, redemption, expiry, reversal, or adjustment with monetary value. | Customer, Policy, Source Record |

## Performance, rank, income, and loans

| Entity | Purpose | Key relationships |
| --- | --- | --- |
| Performance Event | Verified attendance, loyalty, sales, reservation, or training signal used in rank calculations. | Entertainer, Source Record |
| Ranking Policy Version | Rank weights, thresholds, gates, benefits, and effective date. | Performance Event, Ranking Snapshot |
| Ranking Snapshot / Rank History | Explainable evaluation and resulting rank change. | Entertainer, Ranking Policy |
| Income Event | Revenue, tips, commission, bonus, adjustment, or deduction source record. | Entertainer, Branch |
| Payout Period / Settlement | Three-day calculation period and entertainer settlement with line items. | Income Event, Loan Repayment |
| Payout Line Item | One explained component of a settlement. | Settlement, Source Record |
| Loan Eligibility Snapshot | Eligible income, multipliers, gates, maximum, and explanation. | Entertainer, Loan Policy |
| Loan Request / Loan Account / Repayment | Request, approval, disbursement, outstanding balance, and settlement deductions. | Settlement, Accounting Evidence |

## Goals, reporting, and integrations

| Entity | Purpose | Key relationships |
| --- | --- | --- |
| Goal Cycle / Proposal / Action | Monthly branch target, proposal, owner actions, progress, and review. | Branch, Manager, KPI Snapshot |
| KPI / Reporting Snapshot | Time-bound calculated management metric with traceable source values. | Branch, Customer, Employee |
| Notification | In-app or external delivery request, state, priority, and deep link. | Recipient, Source Entity |
| Integration Cursor | Synchronization position, success/failure, retry, and reconciliation details. | External System |
| Idempotency Record | Prevents duplicate handling of the same external operation. | Integration Event |
| Policy Decision | Stores the policy inputs, version, result, and explanation used for a consequential calculation. | Policy Version, Source Records |

## Key relationship flows

```text
Customer → Visit / Reservation → Customer Intelligence → Membership Evaluation
Membership Level → Benefit Entitlement → Benefit Redemption
Customer → Cashback Ledger Entry → Available Cashback Balance
Employee / Entertainer → Attendance + Performance + Income → Rank / Settlement / Loan
CEO or Manager → Operational Task → Comment / Evidence → Review / Completion
```

## Important open data decisions

- Exact customer membership formula, thresholds, evaluation frequency, and cross-branch scope.
- Final five membership-level names and benefit rules.
- Cashback point-to-currency value, expiry, allowed items, and approval/reversal rules.
- Source of truth and reconciliation method for POS sales, attendance, reservations, and messaging delivery.
- Customer and entertainer privacy, retention, masking, and role visibility.
- Final ERPNext reuse versus custom DocType mapping after repository audit.
