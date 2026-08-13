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
| Club Branch | An operational branch with company, cost center, timezone, managers, settings, status, and effective dates. New branches are configured without code changes. | Company, Employee, Customer Visit, Task, Policy Scope |
| Role Scope / Access Grant | Defines a user’s branch, role, date range, and restricted actions or fields. | User, Club Branch |
| Audit Event | Immutable record of consequential actions and before/after summary. | Actor, any business record |
| Policy Version | Effective-dated rules used by calculations and workflows. | Ranking, loans, loyalty, benefits |

## Workforce and operations

| Entity | Purpose | Key relationships |
| --- | --- | --- |
| Employee / Entertainer Profile | Identity, branch, status, bank verification, rank, and privacy profile. | Employee, User, Club Branch |
| Employee Lifecycle Event | Onboarding, change, suspension, resignation, or offboarding history. | Employee |
| Branch Staffing Template | Effective-dated recurring staffing policy for one branch, defining required headcount by weekday and approved role. | Club Branch, Staffing Requirement, Policy Version |
| Staffing Requirement | Minimum headcount for a specific branch, weekday, role, and effective period. | Branch Staffing Template, Role |
| Weekly Schedule Period | Operational weekly roster window and publication state used to group Shift Assignments for a branch. | Club Branch, Shift Assignment, Manager |
| Schedule Publication | Immutable publication/version event with validation result, shortage reason where allowed, actor, and timestamp. | Weekly Schedule Period, Manager, Staffing Exception |
| Shift Assignment Response | Team-member receipt state: Assigned, Acknowledged, or Change requested, with time and optional request reference. | Shift Assignment, Employee, Schedule Publication |
| Shift Coverage Snapshot | Time-bound comparison of Required, Scheduled, Checked In, approved absence, unexpected no-show, and shortage by branch/date/role. | Staffing Requirement, Shift Assignment, Attendance Evidence Event |
| Staffing Exception | Records a planning or attendance shortage, severity, cause, manager action, and resolution where available. | Shift Coverage Snapshot, Club Branch, Role |
| Operational Task | Assigned work with deadline, state, evidence, blockers, comments, and approval. | Assignee, Branch, Task Evidence |
| Task Comment / Evidence | Conversation, result notes, images, or other completion proof. | Operational Task |
| Attendance Evidence Event | Check-in/out or attendance signal with source and original time. | Employee, Shift |
| Attendance Correction Request | Evidence-backed correction, decision, and adjustment reference. | Attendance Event |
| Leave / Day-off Request | Team-member self-service request with branch, date range, reason, Pending/Approved/Rejected state, and separate manager decision. Reuse ERPNext Leave Application where appropriate. | Employee, Club Branch, Shift Assignment, Manager Decision |
| Penalty Review Candidate | Read-only bridge from confirmed lateness/no-show evidence to an effective policy workflow; contains no amount until an approved policy applies. | Attendance Evidence Event, Shift Assignment, Manager Decision, Policy Version |
| Penalty / Deduction Record | Authorized, effective-policy result with category, formula inputs, amount, approver, appeal state, and payroll/settlement reference. It never replaces source attendance evidence. | Penalty Review Candidate, Policy Version, Payroll/Settlement |
| Maintenance Request | Branch issue, urgency, assignee, due date, and completion evidence. | Club Branch, Task |

### ERPNext/Frappe workforce reuse

Reuse ERPNext/Frappe Employee, Shift Type, Shift Assignment, Employee Checkin, Attendance, and Leave Application where they satisfy the requirement.

The VIP Club custom workforce model should add branch-specific staffing requirements, weekly publication/coverage semantics, readiness snapshots, and shortage/audit records rather than duplicating ERPNext core HR records.

### Workforce relationship flow

```text
Branch Staffing Template
→ Staffing Requirement by weekday/role
→ Weekly Schedule Period
→ ERPNext Shift Assignments
→ Employee Checkin / Attendance / Leave
→ Shift Coverage Snapshot
→ Staffing Exception / manager action
```

The published Shift Assignment or equivalent approved schedule record establishes the operational attendance expectation for lateness and no-show classification.

`Weekly Schedule Period` retains status (`Draft`, `Published`, `Closed`, `Superseded`), version, publication deadline, published timestamp, published-by actor, last material change, and branch scope. Published changes append a `Schedule Publication` version rather than overwriting prior schedule history. Assignment acknowledgement is receipt evidence and remains separate from attendance evidence.

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

## Five-level membership, benefits, and approved value ledgers

| Entity | Purpose | Key relationships |
| --- | --- | --- |
| Loyalty Policy Version | Bronze/Silver/Gold/Diamond/Black Diamond ranges, completed-eligible-visit average formula, points/value rules if approved, transition controls, and effective dates. | Branch, Evaluation, Benefit |
| Membership Evaluation Snapshot | Explainable completed eligible visits, included/excluded spend, average per eligible visit, active branch range, calculated level, and policy version. | Customer, Loyalty Policy |
| Membership Level Assignment | Current and historical level for a customer, branch scope, effective dates, and reason. | Customer, Membership Evaluation |
| Membership Manager Position / CEO Decision | Manager support or retain exception followed by CEO approve, return, reject, or override with reason. | Evaluation, Assignment, Actors |
| Benefit Definition | Configurable privilege, eligibility, limits, value, and branch scope. | Loyalty Policy, Benefit Entitlement |
| Benefit Entitlement | A customer’s available allowance for a benefit in a period. | Customer, Benefit Definition |
| Benefit Redemption | What benefit was used, by whom, when, where, and any reversal. | Entitlement, Branch, Operator |
| Approved Value Ledger Entry | Immutable earn, use, expire, adjust, or reverse entry for an explicitly approved points/privilege/value mechanism; no standalone balance is assumed. | Customer, Policy, Source Record |

## Performance, rank, income, and loans

| Entity | Purpose | Key relationships |
| --- | --- | --- |
| Performance Event | Verified attendance, loyalty, sales, reservation, or training signal used in rank calculations. | Entertainer, Source Record |
| Ranking Policy Version | Rank 1/2/3, 14-day cadence, weights, thresholds, gates, benefits, missing-data handling, and effective date. | Performance Event, Ranking Snapshot |
| Ranking Snapshot / Rank History | Explainable 14-day evaluation, manager recommendation, CEO decision, and resulting rank change. | Entertainer, Ranking Policy |
| Income Event | Revenue, tips, commission, bonus, adjustment, or deduction source record. | Entertainer, Branch |
| Payout Period / Settlement | Three-day calculation period and entertainer settlement with line items. | Income Event, Loan Repayment |
| Payout Line Item | One explained component of a settlement. | Settlement, Source Record |
| Loan Eligibility Snapshot | Eligible income, multipliers, gates, maximum, and explanation. | Entertainer, Loan Policy |
| Loan Request / Loan Account / Repayment | Request, approval, disbursement, outstanding balance, and settlement deductions. | Settlement, Accounting Evidence |

## Goals, reporting, and integrations

| Entity | Purpose | Key relationships |
| --- | --- | --- |
| Branch Sales History | Reconciled historical monthly sales for a branch, including period, gross/net amount, source system, import status, and reconciliation evidence. | Branch, Goal Cycle, Source System |
| Sales Target Policy Version | Effective-dated default and branch-specific improvement percentage, baseline method, override authority, and formula. | Branch, Goal Cycle, Branch Sales History |
| Goal Cycle / Proposal / Action | Monthly branch target, proposal, owner actions, progress, and review. | Branch, Manager, KPI Snapshot, Branch Sales History, Sales Target Policy |
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
- Final publication cutoff and ordinary post-publication schedule-change policy for weekly rosters.
