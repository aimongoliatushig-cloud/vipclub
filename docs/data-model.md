# Data and Domain Model

This is the logical data model for the VIP Club system. ERPNext/Frappe core records should be reused where appropriate; custom records belong in the dedicated VIP Club custom app. Final technical names must follow repository conventions.

## Model principles

- Every sensitive financial, policy, rank, membership, point, privilege, and status change is auditable.
- Corrections use reversal or adjustment records rather than silent deletion.
- Policies, thresholds, percentages, privileges, points, and formulas are versioned and effective-dated.
- Branch and role scope is enforced server-side.
- Source-system imports are idempotent and reconcilable.
- Each member has one company-wide membership account, one visible status, and one point account; branches may vary privilege eligibility only.

## Organization and access

| Entity | Purpose | Key relationships |
| --- | --- | --- |
| Club Branch | An operational branch with company, cost center, timezone, managers, settings, status, and effective dates. New branches are configured without code changes. | Company, Employee, Customer Visit, Task, Policy Scope |
| Role Scope / Access Grant | Defines a user's branch, role, date range, and restricted actions or fields. | User, Club Branch |
| Audit Event | Immutable record of consequential actions and before/after summary. | Actor, any business record |
| Policy Version | Effective-dated rules used by calculations and workflows. | Ranking, loans, membership, points, privileges |

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
| Customer | Core member identity and contact profile. | Consent, Preference, Visit, Reservation, Membership Account |
| Customer Identity Match | Normalized phone/external identity and duplicate or merge status. | Customer |
| Customer Consent | Versioned acceptance or revocation of terms and promotional consent. | Customer |
| Customer Channel Preference | Approved channels and branch subscriptions, such as Viber, Telegram, and email. | Customer, Consent |
| Customer Visit | Verified visit, spend, branch, entertainer attribution, and reservation link. | Customer, Club Branch, Reservation, Entertainer |
| Club Reservation | Requested, confirmed, assigned, arrived, completed, cancelled, or no-show reservation. | Customer, Branch, Entertainer |
| Branch Customer Transfer | Cross-branch alternative, acceptance, receiving reservation, and attribution. | Customer, Origin/Receiving Branch |

## CRM, segmentation, and messaging

| Entity | Purpose | Key relationships |
| --- | --- | --- |
| Customer Segment | Saved behavioral or profile-based group of eligible customers. | Segment Membership, Campaign |
| Segment Membership | A customer's membership in a segment and how it was determined. | Customer, Customer Segment |
| Campaign | Consent-aware broadcast definition, audience, channel, content, approval, and outcome. | Segment, Message Delivery |
| Message Delivery | Per-customer message history: channel, send time, delivery state, and provider reference. | Customer, Campaign, Consent |
| Customer Intelligence Snapshot | Calculated customer metrics such as recency, frequency, spend, point activity, status, visit cadence, and entertainer affinity. | Customer, Visits, Reservations, Membership |

## Unified membership, points, and privileges

| Entity | Purpose | Key relationships |
| --- | --- | --- |
| Membership Account | The member's single company-wide loyalty identity, anniversary date, current visible status reference, and lifecycle state. | Customer, Status Assignment, Point Account |
| Membership Policy Version | Five status names, 12-month qualification rules, eligible-spend logic, threshold inputs, grace and downgrade rules, and effective dates. | Evaluation, Branch Threshold Input, Status Assignment |
| Branch Threshold Input | Effective-dated branch manager input used by the approved normalization formula; it must not create a separate visible branch rank. | Club Branch, Membership Policy |
| Membership Evaluation Snapshot | Explainable 12-month anniversary or approved upgrade evaluation with source spend, policy version, shortfall, result, and next review dates. | Membership Account, Policy, Source Transactions |
| Membership Status Assignment | Current and historical Bronze, Silver, Gold, Diamond, or Black Diamond status for the member across all branches. | Membership Account, Evaluation |
| Membership Grace Period | Start, expiry, retention threshold, remaining spend, completion result, and any one-level downgrade. | Membership Evaluation, Status Assignment |
| Membership Assignment Decision | Automatic, Manager Recommended, or CEO Approved launch/override decision with proposer, reason, approver, evidence, and effective date. | Membership Account, Evaluation, Audit Event |
| Point Account | The member's single cross-branch point account and derived available balance. | Membership Account, Point Ledger Entry |
| Point Ledger Entry | Immutable earn, redemption, expiry, reversal, or adjustment with MNT value, branch, source, policy, and reconciliation state. | Point Account, Transaction, Redemption |
| Branch Privilege Policy | Effective-dated branch eligibility and operating terms by company-wide status. | Club Branch, Membership Policy, Benefit Definition |
| Benefit Definition | Configurable privilege, eligibility, quota period, limits, value, terms, and branch scope. | Branch Privilege Policy, Benefit Entitlement |
| Benefit Entitlement | A member's available allowance for a privilege in a defined monthly, annual, or other policy period. | Membership Account, Benefit Definition |
| Benefit Redemption | What privilege was used, by whom, when, where, and any reversal or no-show outcome. | Entitlement, Branch, Operator |

Cashback is not a separate balance in the selected model. Any legacy cashback label maps to the Point Account and Point Ledger Entry unless a later approved decision explicitly creates a distinct product.

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
| Branch Sales History | Reconciled historical monthly sales for a branch, including period, gross/net amount, source system, import status, and reconciliation evidence. | Branch, Goal Cycle, Source System |
| Sales Target Policy Version | Effective-dated default and branch-specific improvement percentage, baseline method, override authority, and formula. | Branch, Goal Cycle, Branch Sales History |
| Goal Cycle / Proposal / Action | Monthly branch target, proposal, owner actions, progress, and review. | Branch, Manager, KPI Snapshot, Branch Sales History, Sales Target Policy |
| KPI / Reporting Snapshot | Time-bound calculated management metric with traceable source values. | Branch, Customer, Employee |
| Notification | In-app or external delivery request, state, priority, and deep link. | Recipient, Source Entity |
| Integration Cursor | Synchronization position, success/failure, retry, and reconciliation details. | External System |
| Idempotency Record | Prevents duplicate handling of the same external operation. | Integration Event |
| Policy Decision | Stores the policy inputs, version, result, and explanation used for a consequential calculation. | Policy Version, Source Records |

## Key relationship flows

~~~text
Customer → Membership Account → one Status Assignment
Customer → Visits / POS Transactions → Eligible Spend → Evaluation
POS Transaction → Point Ledger Entry → Point Account → Redemption
Company-wide Status + Branch Privilege Policy → Entitlement → Redemption
Evaluation → 30-day Grace Period → Retain or at most one-level Downgrade
Customer → Reservation → Customer Intelligence → Segment / Campaign
Employee / Entertainer → Attendance + Performance + Income → Rank / Settlement / Loan
CEO or Manager → Operational Task → Comment / Evidence → Review / Completion
~~~

## Important open data decisions

- Exact eligible-spend definition, threshold values, and method for normalizing branch inputs into one company-wide status.
- Upgrade timing before the 12-month anniversary and minimum-history rules.
- Final point earn rates, point-to-MNT value, expiry, balance limits, eligible redemptions, refund handling, and fraud controls.
- Final privilege terms: Bronze entry, annual transport conditions, monthly entry reset, reservation notice windows, guest and no-show rules, and premium-branch eligibility.
- Source of truth and reconciliation method for POS sales, reservations, point redemptions, and messaging delivery.
- Customer and entertainer privacy, retention, masking, and role visibility.
- Final ERPNext reuse versus custom DocType mapping after repository audit.
