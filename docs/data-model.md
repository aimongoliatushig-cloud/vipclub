# Data and Domain Model

This is the logical data model for the VIP Club system. ERPNext/Frappe core records should be reused where appropriate; custom records belong in the dedicated VIP Club custom app. Final technical names must follow repository conventions.

## Model principles

- Every sensitive financial, policy, rank, membership, point, privilege, and status change is auditable.
- Corrections use reversal or adjustment records rather than silent deletion.
- Policies, thresholds, percentages, privileges, points, and formulas are versioned and effective-dated.
- Branch and role scope is enforced server-side.
- Source-system imports are idempotent and reconcilable.
- Each member has one company-wide membership account, one visible status, and one point account; branches may vary privilege eligibility only.
- Public/customer serializers use explicit allowlists; internal measurements, incidents, financials, and confidential KPI evidence never leak into customer or realtime payloads.

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
| Branch Staffing Template | Effective-dated recurring staffing policy for one branch, defining required headcount by weekday and approved role. | Club Branch, Staffing Requirement, Policy Version |
| Staffing Requirement | Minimum headcount for a specific branch, weekday, role, and effective period. | Branch Staffing Template, Role |
| Weekly Schedule Period | Operational weekly roster window and publication state used to group Shift Assignments for a branch. | Club Branch, Shift Assignment, Manager |
| Schedule Publication | Immutable publication/version event with validation result, shortage reason where allowed, actor, and timestamp. | Weekly Schedule Period, Manager, Staffing Exception |
| Shift Assignment Response | Team-member receipt state: Assigned, Acknowledged, or Change requested, with time and optional request reference. | Shift Assignment, Employee, Schedule Publication |
| Shift Coverage Snapshot | Time-bound comparison of Required, Scheduled, Checked In, approved absence, unexpected no-show, and shortage by branch/date/role. | Staffing Requirement, Shift Assignment, Attendance Evidence Event |
| Staffing Exception | Records a planning or attendance shortage, severity, cause, manager action, and resolution where available. | Shift Coverage Snapshot, Club Branch, Role |
| Operational Task | Assigned work with deadline, state, evidence, blockers, comments, and approval. | Assignee, Branch, Task Evidence |
| Task Comment / Evidence | Conversation, result notes, images, or other completion proof. | Operational Task |
| Internal Team Message | Complaint or compliment from any employee/team member about/to a selected team member, with server-derived branch scope, required text, created time, moderation state, and immutable audit/correction history. Complaint content is management-only; compliments are delivered to the praised person. | Sender Employee, Subject Employee, Club Branch, Message Delivery State, Attitude Incident Review |
| Internal Team Message Delivery State | Per-authorized-audience delivery/read state. Complaint audiences are CEO and relevant authorized branch managers only; compliment audiences also include the praised employee. | Internal Team Message, User, Role Scope / Access Grant |
| Attendance Evidence Event | Check-in/out or attendance signal with source and original time. | Employee, Shift |
| Attendance Correction Request | Evidence-backed correction, decision, and adjustment reference. | Attendance Event |
| Leave / Day-off Request | Team-member self-service request with branch, date range, reason, Pending/Approved/Rejected state, and separate manager decision. Reuse ERPNext Leave Application where appropriate. | Employee, Club Branch, Shift Assignment, Manager Decision |
| Penalty Review Candidate | Read-only bridge from confirmed lateness/no-show evidence to an effective policy workflow; contains no amount until an approved policy applies. | Attendance Evidence Event, Shift Assignment, Manager Decision, Policy Version |
| Penalty / Deduction Record | Authorized, effective-policy result with category, formula inputs, amount, approver, appeal state, and payroll/settlement reference. It never replaces source attendance evidence. | Penalty Review Candidate, Policy Version, Payroll/Settlement |
| Maintenance Request | Branch issue, urgency, assignee, due date, and completion evidence. | Club Branch, Task |
| Entertainer Service Profile | Structured internal measurements, nationality, languages, configurable traits/talents, public-profile fields, and field visibility classification. | Employee / Entertainer Profile, Trait/Tag |
| Entertainer Incident | Structured category, description, time, branch, reporter, severity, evidence, review, resolution, and status used only after authorized review. | Entertainer, Manager, Evidence, Ranking Snapshot |

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
| Customer | Core member identity and contact profile. | Consent, Preference, Visit, Reservation, Membership Account |
| Customer Identity Match | Normalized phone/external identity and duplicate or merge status. | Customer |
| Customer Consent | Versioned acceptance or revocation of terms and promotional consent. | Customer |
| Customer Channel Preference | Approved channels and branch subscriptions, such as Viber, Telegram, and email. | Customer, Consent |
| Customer Visit | Verified visit, spend, branch, entertainer attribution, and reservation link. | Customer, Club Branch, Reservation, Entertainer |
| Club Reservation | Requested, confirmed, assigned, arrived, completed, cancelled, or no-show reservation. | Customer, Branch, Entertainer |
| Branch Customer Transfer | Cross-branch alternative, acceptance, receiving reservation, and attribution. | Customer, Origin/Receiving Branch |
| Customer Entertainer Message | Identified customer complaint or praise about a selected entertainer from the customer helper portal, with required VIP room and visit/reservation/session context, branch, text, routing, delivery/read/review state, and immutable audit history. | Customer, Entertainer, Club Branch, VIP Room, Visit/Reservation/Session, Customer Message Delivery State |
| Customer Message Delivery State | Per-audience delivery/read state. Complaints route only to CEO/relevant managers; praise also routes to the selected entertainer under field-level customer/room masking. | Customer Entertainer Message, User, Role Scope / Access Grant |

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
| Loyalty Policy Version | Five levels, threshold formula, points/value rules, expiry, downgrade, and effective dates. | Branch, Evaluation, Benefit |
| Membership Evaluation Snapshot | Immutable calculation after an eligible visit, correction, or policy trigger; stores eligible spend, eligible visit count, average spend per visit, evaluation window, current/calculated level, source records, reconciliation state, policy version, and explanation. | Customer, Loyalty Policy, Customer Visit, Bill |
| Membership Change Recommendation | Active or historical proposed upgrade/downgrade with direction, severity, first/latest evaluation, consecutive count, pending age, supersession, and escalation status. At most one active recommendation per customer, branch, and direction. | Customer, Membership Evaluation Snapshot |
| Membership Decision | Manager decision to approve, keep current, or review later, including actor, scope, reason, timestamp, referenced evaluation, and audit data. Keep current applies only to one evaluation. | Recommendation, Manager, Audit Event |
| Membership Level Assignment | Current and historical approved level for a customer, branch scope, effective dates, reason, approving decision, and evaluation. A calculation alone never creates an assignment. | Customer, Membership Evaluation, Membership Decision |
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

| Performance Event | Verified evidence classified into one canonical ranking factor: attendance (including no-show/lateness), customer complaints, sales, entertaining skill, cleanliness and beauty, shift effort, personal development, or entertainer attitude. A customer-portal complaint is only a candidate source until approved review/verification; its submission is not a performance event by itself. | Entertainer, Source Record, Customer Entertainer Message, Ranking Component Result |
| Entertainer Score Entry | Versioned daily component score, including canonical factor, scoring date, source type, evidence, actor, role, branch, and correction history. Authorized branch managers or lead entertainers manually assess applicable factors; sales is derived from verified POS events and attitude comes from its incident rule. | Entertainer, Club Branch, Performance Event, Ranking Policy Version |
| Attitude Incident Review | Incident allegation and evidence, entertainer/branch, manager investigation, substantiated/unsubstantiated finding, discretionary deduction, resulting 0-100 score, incident/scoring/effective date, reason, timestamp, and correction/appeal history. Only the incident day is affected; no record means the daily attitude score is 100. An authorized internal complaint may be referenced as evidence but never changes a score by itself. | Entertainer, Club Branch, Branch Manager, Performance Event, Internal Team Message, Ranking Snapshot |
| Shift Effort Checklist | One canonical current seven-item boolean checklist per entertainer/branch/shift/scoring day, with item definitions/version, completed/missed counts, submitter/role, evidence/notes, unrounded component/contribution values, and audited correction history. | Entertainer, Club Branch, Shift, Ranking Component Result, Ranking Policy Version |
| Missed-Performance Penalty Setting | Effective-dated branch-specific currency amount per miss with version/status, authorized manager, reason, timestamp, and audit history. | Club Branch, Branch Manager, Shift Effort Checklist |
| Missed-Performance Penalty Calculation | Immutable checklist financial result containing missed count, effective setting/version, per-miss amount, currency, calculated penalty, evidence, correction/reversal links, and linked itemized three-day settlement deduction. | Shift Effort Checklist, Penalty Setting, Payout Line Item / Settlement |
| Attendance Penalty Setting | Effective-dated branch/shift required ready time, per-minute lateness currency amount, fixed no-show amount, version/status, authorized manager, reason, and audit history. | Club Branch, Shift, Branch Manager, Attendance Penalty Calculation |
| Attendance Penalty Calculation | Scheduled-shift result containing ready/actual time, lateness minutes or no-show, effective setting/version, mutually exclusive lateness/no-show currency calculation, evidence, correction/reversal links, and itemized settlement line. | Attendance Evidence Event, Shift, Penalty Setting, Payout Line Item / Settlement |
| Ranking Policy Version | Effective-dated eight-factor policy with weights fixed at 10/15/40/5/5/10/5/10, daily score range 0-100, confirmed Level 1/2/3/Rookie boundaries, and versioned normalization, evidence, missing-data, rounding, gate, and benefit rules. | Performance Event, Ranking Snapshot, Branch Sales Benchmark Table |
| Branch Sales Benchmark Table | Independent branch-specific `(branch, calendar year, version)` configuration containing currency, effective period, actor/time, publication state, audit history, and exactly 12 monthly rows. There is no company-wide fallback. | Club Branch, Ranking Policy Version, Monthly Sales Benchmark |
| Monthly Sales Benchmark | One month with Level 1, Level 2, and Level 3 currency min/max ranges plus explicit Rookie handling. Higher-level range endpoints cannot be lower than lower-level endpoints. | Branch Sales Benchmark Table, Ranking Snapshot |
| Ranking Component Result | Auditable per-factor result containing factor ID, source references/raw values, normalized score, weight percentage, unrounded weighted contribution, data-quality state, and explanation. Exactly eight belong to every complete ranking snapshot. | Ranking Snapshot, Score Entry, Performance Event, Ranking Policy |
| Ranking Snapshot / Rank History | Explainable evaluation containing all eight component results, unrounded 0-100 daily weighted score, matched threshold classification, displayed total, policy version, branch/month sales-benchmark version, evaluation window, gate result, resulting rank change, and correction/appeal/override history. | Entertainer, Score Entry, Ranking Policy, Ranking Component Result, Monthly Sales Benchmark |
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
| Goal Progress Snapshot | Branch/month projection of the active approved target, reconciled actual sales, remaining/above-target amount, achievement percentage, approval version, source state, and refresh time. | Branch, Goal Cycle, CEO Decision, Branch Sales History |
| KPI / Reporting Snapshot | Time-bound calculated management metric with traceable source values. | Branch, Customer, Employee |
| Notification | In-app or external delivery request, state, priority, and deep link. | Recipient, Source Entity |
| Integration Cursor | Synchronization position, success/failure, retry, and reconciliation details. | External System |
| Idempotency Record | Prevents duplicate handling of the same external operation. | Integration Event |
| Policy Decision | Stores the policy inputs, version, result, and explanation used for a consequential calculation. | Policy Version, Source Records |
| Manager KPI Snapshot | Periodic target, sales, task execution, attendance/reliability, approved customer-experience measures, weights, result, and source evidence. | Manager, Branch, Goal Cycle, KPI Policy |
| Manager Reward Allocation | Calculated pool, manager share, proposed team recipients/amounts, explanation, review, final status, and posting references. | Goal Cycle, Manager KPI, Employee, Accounting |
| Manager Penalty Review | Configured underperformance flag, proposed deduction or employment review, evidence, HR/management decision, appeal, and outcome. | Goal Cycle, Manager KPI, HR Workflow |
| Branch Health Snapshot | Configurable periodic branch metrics, formula version, score/severity when approved, contributing exceptions, and drill-down evidence. | Branch, KPI Snapshot, Reconciliation, Feedback |
| CallPro Integration State | Credentials reference, cursor/webhook state, last success, failures, retry, and reconciliation metadata without storing secrets in business records. | External System, Call Event |

## Key relationship flows

```text
Customer → Eligible completed Visit / correction → Membership Evaluation → Recommendation → Manager Decision → Membership Level Assignment
Membership Level → Benefit Entitlement → Benefit Redemption
Customer → Cashback Ledger Entry → Available Cashback Balance
Employee / Entertainer → Attendance + Performance + Income → Rank / Settlement / Loan
CEO or Manager → Operational Task → Comment / Evidence → Review / Completion
Employee → Complaint → CEO + authorized subject-branch manager message center → optional separate attitude review
Employee → Compliment → praised employee + CEO + authorized subject-branch manager visibility
Customer helper portal → identified customer + VIP room/experience → complaint to management only or praise to entertainer + management
```

## Important open data decisions

- Final branch thresholds, evaluation window, minimum visit count, eligible-expenditure treatment, approval levels, escalation SLA, and cross-branch scope. The authoritative metric is eligible net expenditure divided by eligible completed visits, recalculated after every eligible completed visit and relevant correction.
- Final five membership-level names and benefit rules.
- Cashback point-to-currency value, expiry, allowed items, and approval/reversal rules.
- Source of truth and reconciliation method for POS sales, attendance, reservations, and messaging delivery.
- Exact field-level customer identity/VIP-room context visible to an entertainer receiving praise; authenticated identity and room/experience capture are confirmed and anonymous submission is excluded.
- Customer and entertainer privacy, retention, masking, and role visibility. For internal team messages, complaint-subject non-visibility is confirmed; sender anonymity/confidentiality, retention, appeal/escalation, compliment response rights, and attachment enablement remain open.
- Final ERPNext reuse versus custom DocType mapping after repository audit.
- Final publication cutoff and ordinary post-publication schedule-change policy for weekly rosters.
