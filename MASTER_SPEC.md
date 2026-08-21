# NOMAD Entertainer Platform — Phase 1 Master Specification

> Generated as a Codex-ready product, architecture, delivery, and Linear planning brief.



---

<!-- Source: 00_CODEX_MASTER_INSTRUCTION.md -->

# Codex Master Instruction

## Mission

Turn this planning package into a maintainable product repository, project-management system, and implementation plan for the VIPProposal/NOMAD entertainer platform.

The immediate delivery target is **Phase 1: entertainer mobile/PWA plus connected management and accounting web application**.

## First actions

1. Inspect the entire existing repository.
2. Identify the current framework, package manager, database, authentication, design system, routes, working screens, mock data, tests, deployment configuration, and known defects.
3. Do not delete or rewrite working code merely to match a preferred stack.
4. Create or update `/docs` using the files in this package.
5. Produce:
   - `/docs/PROJECT_STATUS.md`
   - `/docs/ARCHITECTURE.md`
   - `/docs/DECISIONS.md`
   - `/docs/IMPLEMENTATION_PLAN.md`
   - `/docs/LINEAR_MAP.md`
   - `/docs/CHANGELOG.md`
6. Search the connected Linear workspace for an existing VIPProposal, NOMAD, entertainer, ranking, loan, or club project before creating anything.
7. Reuse existing Linear projects and issues where they represent the same work. Never create duplicates.
8. Convert the roadmap into milestones, epics, issues, and sub-issues.
9. Begin implementation only after mapping requirements to existing code and Linear issues.

## Repository organization

Preserve the existing structure when present. For a greenfield monorepo, use this logical separation:

```text
apps/
  entertainer-mobile/
  management-web/
services/
  api/
packages/
  domain/
  ui/
  auth/
  config/
  notifications/
  analytics/
integrations/
  phoenix-pos/
  accounting/
  bank-transfer/
  messaging/
docs/
tests/
```

The mobile app and management web app must share domain types, validation, policy configuration, audit-event definitions, and design tokens.

## Implementation behavior

For every Linear issue:

1. Read the issue, parent epic, dependencies, and linked specification.
2. Move it to In Progress only when actual work starts.
3. Add a short implementation plan as a Linear comment.
4. Create a focused branch using the issue identifier.
5. Implement the smallest complete vertical slice.
6. Add or update tests.
7. Run lint, type-checking, unit tests, integration tests, and relevant UI tests.
8. Record test evidence and changed files in the issue.
9. Link the branch or pull request.
10. Mark Done only when all acceptance criteria pass.
11. Update `PROJECT_STATUS.md` and `CHANGELOG.md`.

## Product rules Codex must not silently change

> Superseding rank decision (2026-08-20): entertainer rank is the three-level daily system defined in `DAILY_RANKING_CONTRACT.md`. Rank 3 is the floor for every entertainer; there is no Rookie rank. Older Bronze/Silver/Gold/Diamond and cumulative-points passages below are retained only as historical context and must not drive new implementation.

- Four ranks: Bronze, Silver, Gold, Diamond.
- Rank progress must update visibly from daily events.
- No-show is a hard gate.
- Loan eligibility uses the latest three completed calendar months of eligible income.
- Initial rank-based maximums: Bronze 0%, Silver 20%, Gold 30%, Diamond 40%.
- Loan repayment percentage is selected by the entertainer from 30% to 60%.
- Repayment is applied to each three-day income settlement.
- CEO approval occurs before accounting disbursement.
- Accounting must explicitly record transfer completion.
- Every financial or status mutation requires an immutable audit event.
- UI language is Mongolian.
- Access is role- and branch-scoped.

## Required delivery sequence

1. Repository audit and documentation.
2. Clickable connected UI using reliable mock data.
3. Authentication and role permissions.
4. Entertainer profile, schedule, and attendance.
5. Ranking and points ledger.
6. Income and three-day payout statements.
7. Loan eligibility, request, approval, disbursement, and repayment.
8. Reservation workflow.
9. Notifications and messaging.
10. Reports, audit logs, security review, QA, and pilot readiness.

## Definition of complete

Phase 1 is complete only when a test entertainer can:

- log in;
- see today's work and reservations;
- see attendance, sales, loyalty, points, rank, and exact next-rank requirements;
- open a three-day payout statement;
- see the calculated loan limit;
- select a loan amount and repayment rate;
- submit a request;
- have the request approved by a CEO user;
- have it marked paid by accounting;
- receive a new three-day settlement with the selected loan deduction;
- see the updated balance and complete audit-backed history.

A CEO and accountant must each see only their authorized actions and records.


---

<!-- Source: 01_PRODUCT_CONTEXT.md -->

# Product Context

## Business problem

Entertainers commonly have short tenure. Management wants to improve retention, attendance, sales performance, customer loyalty, professionalism, and financial stability.

The application should make progress tangible every day. An entertainer should understand:

- what happened today;
- how much they earned;
- how their behavior affected their points;
- how close they are to the next rank;
- which benefit or loan capacity the next rank unlocks;
- which attendance, sales, or loyalty condition is preventing promotion.

## Connected business domains

Phase 1 connects six domains:

1. **Identity and profile**
2. **Schedule, attendance, and leave**
3. **Performance points and ranking**
4. **Income and three-day settlements**
5. **Performance-based zero-interest loans**
6. **Customer reservations and repeat-customer attribution**

Tasks, notifications, messages, and Hermes assistant access support these domains.

## Product experience principles

- Mongolian-first terminology.
- Mobile-first for entertainers.
- Management and accounting use a responsive web workspace.
- Premium, discreet, luxurious appearance.
- Dark black/red gradients, glass cards, premium icons, clear monetary figures.
- Three to five primary actions per screen.
- Large progress bars and status timelines.
- Avoid technical labels such as ERP, ledger posting, or state machine in user-facing UI.
- All calculations must be explainable to the entertainer.
- A user must be able to tap a metric and see the events that produced it.
- Financial records must never disappear after correction; corrections create reversing or adjustment entries.

## Previously established screen model

The entertainer portal previously included:

- dashboard;
- schedule;
- ranking;
- income;
- loans;
- reservations;
- attendance;
- leave and employee requests;
- Hermes AI assistant;
- profile;
- settings;
- notifications and messages.

Phase 1 keeps this model and connects it to management and accounting workflows.


---

<!-- Source: 02_PHASE1_SCOPE.md -->

# Phase 1 Scope

## In scope

### Entertainer mobile/PWA

- Phone or approved identity login.
- Profile and branch assignment.
- Dashboard.
- Today's shift and attendance status.
- Upcoming reservations and customer requests.
- Daily points changes.
- Current rank and next-rank progress.
- Metric breakdown and points ledger.
- Three-day payout statements.
- Monthly and three-month income summaries.
- Loan eligibility.
- Loan amount slider.
- Repayment percentage slider, 30%–60%.
- Loan request submission.
- Loan approval timeline.
- Active loan.
- Repayment history.
- Closed loan history.
- Tasks, leave/absence requests, messages, and notifications.
- Hermes assistant entry point.
- Profile and settings.

### Management web

- Branch dashboard.
- Entertainer directory and detail page.
- Rank overview, promotion candidates, and blocked candidates.
- Attendance exceptions and leave requests.
- Reservation management.
- CEO loan approval queue.
- Loan decision detail with policy and calculation evidence.
- Policy configuration with version history.
- Notifications and audit access.
- Reports and exports.

### Accounting web

- Approved-for-payment queue.
- Disbursement recording.
- Bank reference, amount, date, and proof metadata.
- Three-day payout run.
- Loan deduction calculation and review.
- Adjustment workflow.
- Active loan reconciliation.
- Financial audit history.
- Exportable settlement and loan reports.

### Shared platform

- Authentication.
- Role-based and branch-based authorization.
- Event and audit model.
- Configurable ranking policy.
- Configurable loan policy.
- Notification service.
- POS and reservation adapters.
- Reporting data model.
- Test and seed data.

## Out of scope for Phase 1

- Customer loyalty mobile app.
- Full customer CRM replacement.
- Direct bank payment initiation unless a supported bank API is later approved.
- Full payroll/accounting general ledger.
- Automated credit bureau reporting.
- Multiple simultaneous active loans.
- Interest, late fees, or compounding charges.
- Public entertainer marketplace.
- Advanced AI recommendations that can autonomously approve financial requests.
- Cross-branch transfer and vacancy recommendation engine.
- Full offline synchronization.
- Native iOS/Android store release unless required after PWA validation.

## Phase 1 quality constraint

Do not build isolated demo screens. Every screen must be connected to the same domain entities and status flows, first with coherent mock data and then with real persistence.


---

<!-- Source: 03_ROLES_PERMISSIONS.md -->

# Roles and Permissions

## Entertainer

Can:

- view own profile, rank, points, attendance, reservations, income, payouts, loans, tasks, requests, and notifications;
- submit loan and leave requests;
- select a requested loan amount and repayment percentage;
- acknowledge reservations and report conflicts;
- view calculation explanations and history.

Cannot:

- view another entertainer's financial details;
- change rank, sales, attendance, loyalty, payout, loan, or repayment records;
- approve their own request;
- mark a loan disbursed.

## Branch manager

Can:

- view entertainers assigned to authorized branches;
- manage schedules, attendance exceptions, leave requests, and reservations;
- view performance and rank readiness;
- add evidence-backed notes and corrections;
- escalate issues.

Cannot:

- approve CEO-only loan decisions;
- mark bank disbursement complete;
- edit immutable financial entries.

## CEO / authorized executive

Can:

- view cross-branch summary;
- review loan requests and evidence;
- approve, reject, or return for clarification;
- configure policy when granted system-admin permission;
- view audit and risk alerts.

CEO approval must record:

- actor;
- timestamp;
- decision;
- optional note;
- policy version;
- eligibility snapshot;
- approved amount and repayment percentage.

## Accountant

Can:

- view CEO-approved requests;
- record transfer completion or transfer failure;
- run/review three-day settlements;
- record loan deductions, adjustments, and reconciliation results;
- export reports.

Cannot:

- change CEO decision;
- increase the approved amount;
- silently change the entertainer-selected repayment percentage.

## Reception / reservation operator

Can:

- create and update reservations for authorized branches;
- assign an entertainer;
- record arrival, completion, cancellation, or customer no-show;
- see availability and limited profile information.

Cannot:

- see private loan or detailed income information.

## System administrator

Can:

- manage users, roles, branches, integrations, policy versions, feature flags, and system settings;
- view security audit events.

Cannot:

- bypass required CEO/accounting workflow without a visible emergency override event and reason.

## Permission model

Use deny-by-default permissions with:

- role scope;
- branch scope;
- record ownership;
- action-level permission;
- field-level masking for personal and financial data.


---

<!-- Source: 04_USER_JOURNEYS.md -->

# Primary User Journeys

## Journey A — Daily entertainer experience

1. Entertainer opens the app.
2. Dashboard shows today's shift, attendance state, reservations, estimated current payout, rank, and next-rank progress.
3. New sales, completed reservations, repeat-customer visits, and attendance events add or remove points.
4. The progress bar updates.
5. Tapping the progress opens a metric breakdown.
6. Tapping a metric opens the event ledger.
7. Notifications explain meaningful changes, including a hard-gate failure.

## Journey B — Rank qualification

1. Ranking service receives verified attendance, sales, loyalty, reservation, rating, or compliance events.
2. Events are scored under the active policy version.
3. The system recalculates rolling qualification metrics.
4. Hard gates are evaluated.
5. The system displays:
   - current rank;
   - achieved requirements;
   - missing requirements;
   - estimated next evaluation;
   - points gained or lost.
6. Promotion is automatic or placed in an approval queue according to policy.
7. Rank history records the previous rank, new rank, reason, evidence window, and policy version.

## Journey C — Loan request

1. Entertainer opens Loan.
2. App calculates three-month average eligible monthly income.
3. App applies the current rank multiplier.
4. App subtracts any unavailable capacity.
5. App displays maximum eligible amount and calculation details.
6. Entertainer selects an amount from 0 to maximum.
7. Entertainer selects repayment deduction from 30% to 60%.
8. App estimates number of three-day settlement cycles and projected completion date.
9. Entertainer reviews terms and submits.
10. Request status becomes `SUBMITTED`.
11. CEO receives a notification.

## Journey D — CEO decision

1. CEO opens the approval queue.
2. CEO sees entertainer identity, branch, rank, three-month average, maximum, requested amount, repayment rate, active warnings, and audit evidence.
3. CEO approves, rejects, or returns for clarification.
4. Approved request becomes `CEO_APPROVED`.
5. Accounting receives a notification.
6. Rejected request records a reason and notifies the entertainer.

## Journey E — Accounting disbursement

1. Accountant opens approved queue.
2. Accountant confirms approved amount and bank information.
3. Accountant sends payment outside the system or through a later bank integration.
4. Accountant records:
   - transfer date/time;
   - amount;
   - transaction/reference number;
   - proof metadata;
   - note.
5. Status becomes `DISBURSED`.
6. Loan account becomes active.
7. Entertainer receives confirmation.

## Journey F — Three-day repayment

1. A three-day payout period closes.
2. System calculates eligible gross and net payout.
3. If an active loan exists, deduction equals:
   `min(eligible deduction base × selected repayment %, remaining principal)`.
4. Settlement preview shows the deduction.
5. Accountant reviews or the authorized automated run posts it.
6. Repayment entry reduces principal.
7. Entertainer sees payout, deduction, and new balance.
8. Final deduction closes the loan.

## Journey G — Reservation

1. Customer or receptionist requests a reservation.
2. Availability is checked.
3. Reservation is assigned to an entertainer.
4. Entertainer receives a notification.
5. Entertainer acknowledges or reports a conflict.
6. Reception confirms.
7. Arrival and completion are recorded.
8. Completed reservation contributes to reservation performance.
9. A verified returning customer contributes to loyalty performance.

## Journey H — Attendance exception

1. Shift starts.
2. Check-in is recorded.
3. Late, absence, or no-show rules run.
4. Entertainer and manager are notified.
5. Manager may submit evidence-backed correction.
6. Correction never deletes the original event.
7. A reversal or adjustment event changes the score.


---

<!-- Source: 05_RANKING_POINTS_ENGINE.md -->

# Ranking and Points Engine

## Ranks

1. Bronze
2. Silver
3. Gold
4. Diamond

Use premium rank icons and a visible next-rank path.

## Two-layer model

### A. Daily XP / achievement points

Purpose: create visible daily momentum.

Points are produced by verified events, for example:

- attending a scheduled shift;
- arriving on time;
- completing a full shift;
- verified sales;
- completed reservations;
- repeat-customer visits;
- positive rating;
- training completion;
- policy violation;
- late arrival;
- no-show.

The exact event points must be configurable and versioned.

### B. Qualification score and hard gates

Purpose: prevent raw points from hiding poor behavior.

Initial weighted qualification model:

| Metric | Weight |
|---|---:|
| Attendance, punctuality, no-show behavior | 30% |
| Repeat-customer loyalty | 25% |
| Verified sales/income | 20% |
| Reservation completion/conversion | 10% |
| Customer rating and complaint record | 5% |
| Training/development and tenure stability | 5% |
| Compliance/teamwork/discipline | 5% |

Total: 100%.

The first release may display only the three primary metrics prominently:

- Ирц
- Борлуулалт
- Үйлчлүүлэгчийн үнэнч байдал

Supporting metrics remain accessible in the detail page.

## Hard gates

Recommended initial gates:

- Any unresolved no-show in the active gate window blocks promotion.
- Suspended or terminated status blocks promotion and new loan eligibility.
- Unverified sales do not count.
- Fraud-flagged loyalty events do not count.
- Insufficient data shows `NOT_ENOUGH_DATA` rather than a failing score.

## Initial configurable qualification defaults

These are seed defaults, not hard-coded constants.

### Bronze

- Default onboarding rank.
- Loan multiplier: 0%.
- Shows progress toward Silver.

### Silver

- Rolling qualification score: at least 70.
- Attendance rate: at least 85%.
- No unresolved no-show in the last 30 days.
- Minimum activity requirement met.
- Loan multiplier: 20%.

### Gold

- Rolling qualification score: at least 82.
- Attendance rate: at least 90%.
- No unresolved no-show in the last 45 days.
- Sales target achievement: at least 90%.
- Repeat-customer rate: at least 20%, where enough customer data exists.
- Loan multiplier: 30%.

### Diamond

- Rolling qualification score: at least 92.
- Attendance rate: at least 95%.
- No unresolved no-show in the last 60 days.
- Sales target achievement: at least 110%.
- Repeat-customer rate: at least 30%, where enough customer data exists.
- Customer rating: at least 4.7/5 where enough ratings exist.
- Loan multiplier: 40%.

## Evaluation windows

- Daily XP: immediate.
- Operational dashboard metrics: current month plus rolling 30 days.
- Rank qualification: configurable rolling window, initially 30–90 days depending on metric.
- Loan average income: latest three completed calendar months.
- A rank should not require waiting exactly three months when sufficient verified performance data exists; however, minimum activity and data-quality rules apply.

## Promotion and demotion

Initial default:

- Promotions are evaluated daily.
- Promotion becomes effective after all requirements are met and no hard gate is active.
- Demotion requires a grace period and manager-visible warning.
- A single low day should not immediately demote a rank.
- No-show or serious discipline can suspend benefits immediately without rewriting rank history.
- Policy changes create a new policy version and do not recalculate old historical decisions silently.

## Loyalty calculation

Primary signal:

`repeat_customer_rate = customers_with_qualifying_repeat_visit / unique_verified_customers`

A customer becomes a repeat customer after at least three verified visits linked to the entertainer, unless policy configuration changes this threshold.

Supporting signals:

- number of repeat visits;
- days between visits;
- reservation-to-arrival rate;
- customer retention across rolling periods;
- customer complaints and ratings.

Prevent gaming by requiring verified customer identity and POS/reservation linkage.

## Sales calculation

Only verified, finalized POS transactions attributed to the entertainer count.

Track:

- gross attributed sales;
- eligible sales;
- refunds and voids;
- target achievement;
- average sales per shift;
- sales trend;
- cross-branch attribution.

## Points ledger

Every points mutation must include:

- event ID;
- entertainer ID;
- metric;
- points delta;
- source system;
- source record;
- occurred time;
- posted time;
- policy version;
- status;
- reversal reference when applicable.

The entertainer can see an understandable description, not internal IDs.


---

<!-- Source: 06_LOAN_ENGINE.md -->

# Loan Engine

## Product purpose

Provide a transparent, zero-interest, performance-based advance/loan that rewards stable work and supports retention without hiding repayment obligations.

## Eligibility base

Use the entertainer's average eligible monthly income from the latest three completed calendar months.

```text
three_month_average =
  sum(eligible_income_for_month_1,
      eligible_income_for_month_2,
      eligible_income_for_month_3) / 3
```

Do not use the incomplete current month for the formal maximum.

Eligible income must be defined in policy. Initial recommendation:

Included:

- finalized service income;
- eligible commissions;
- finalized tips when reliably recorded;
- approved performance bonuses.

Excluded:

- reversed transactions;
- reimbursements;
- previous loan proceeds;
- manual non-income transfers;
- unverified cash;
- exceptional one-time grants unless policy includes them.

## Rank-based maximum

```text
maximum_eligible_loan =
  three_month_average × rank_multiplier
```

Initial multipliers:

- Bronze: 0%
- Silver: 20%
- Gold: 30%
- Diamond: 40%

The UI must show all inputs to this calculation.

## Additional eligibility gates

A new request is blocked when:

- Bronze rank;
- an active loan exists;
- unresolved no-show is within the configured gate period;
- entertainer is suspended or leaving;
- required three-month income data is missing;
- bank account is unverified;
- a fraud or financial hold exists.

The UI must display the exact blocking reason.

## Amount selection

Use a large amount slider and numeric input.

Rules:

- minimum can be configured;
- maximum equals current eligible capacity;
- amount step should be configurable, initially 10,000 MNT;
- user may request less than the maximum;
- changing the amount updates repayment estimates immediately.

## Repayment selection

Use a percentage slider:

- minimum: 30%;
- maximum: 60%;
- recommended steps: 5%;
- default: 50% until business changes it.

The percentage applies to the eligible deduction base of each three-day payout, not to total historical income.

## Repayment estimate

Display:

- selected amount;
- selected percentage;
- typical three-day eligible payout, based on recent history;
- estimated repayment per cycle;
- estimated number of cycles;
- projected completion date;
- a warning that actual completion depends on actual earnings.

## Status lifecycle

```text
DRAFT
SUBMITTED
RETURNED_FOR_INFO
CEO_APPROVED
CEO_REJECTED
ACCOUNTING_PENDING
DISBURSEMENT_FAILED
DISBURSED
ACTIVE
REPAYING
PAID
CANCELLED
DEFAULT_REVIEW
```

Clarification:

- `CEO_APPROVED` should automatically enter accounting queue.
- `DISBURSED` creates the loan principal.
- `ACTIVE`/`REPAYING` may be represented as one domain state plus derived UI status.
- A request rejected before disbursement never creates principal.
- Cancellation after disbursement is not deletion; it requires financial adjustment.

## CEO decision screen

Show:

- entertainer;
- branch;
- current rank;
- rank history;
- three-month income by month;
- calculated average;
- multiplier;
- maximum;
- requested amount;
- selected repayment rate;
- active warnings;
- no-show and discipline status;
- estimated repayment;
- prior loan history;
- policy version;
- request timestamp.

CEO actions:

- Approve;
- Reject with reason;
- Return for information.

## Accounting disbursement

Required fields:

- approved request;
- recipient bank name;
- masked bank account;
- transfer amount;
- transfer time;
- transaction/reference number;
- proof attachment metadata or note;
- accountant identity.

Accounting may not increase the amount.

## Repayment posting

For each payout:

```text
scheduled_deduction =
  eligible_deduction_base × selected_repayment_rate

actual_deduction =
  min(scheduled_deduction, remaining_principal)
```

A repayment record contains:

- loan;
- payout settlement;
- deduction base;
- rate;
- amount;
- remaining principal before;
- remaining principal after;
- posting time;
- reversal/adjustment reference.

## Loan history

Entertainer views:

- request date;
- approved and disbursed amount;
- repayment percentage;
- total repaid;
- remaining principal;
- progress percentage;
- expected completion;
- every repayment;
- status timeline;
- closed loans.

## MVP policy

One active loan per entertainer. Top-ups, refinancing, multiple concurrent loans, interest, and late fees are out of scope.


---

<!-- Source: 07_INCOME_PAYOUT_ENGINE.md -->

# Income and Three-Day Payout Engine

## Purpose

Give entertainers a clear income statement and provide a reliable deduction point for loan repayment.

## Settlement cadence

Create a settlement for each configured three-day period.

A settlement must have:

- start date/time;
- end date/time;
- branch;
- entertainer;
- status;
- line items;
- gross amount;
- additions;
- deductions;
- loan repayment;
- net amount;
- approval/posting data.

## Suggested settlement statuses

```text
OPEN
CALCULATING
REVIEW_REQUIRED
READY
POSTED
PAID
ADJUSTED
VOIDED_WITH_REVERSAL
```

## Line-item model

Possible additions:

- service commission;
- drink/product commission;
- tips;
- reservation bonus;
- rank bonus;
- performance bonus;
- manual approved adjustment.

Possible deductions:

- loan repayment;
- documented penalty;
- advance recovery;
- tax/required statutory deduction when applicable;
- manual approved correction.

Do not combine all deductions into one unexplained number.

## Entertainer statement

The payout detail screen shows:

- covered dates;
- shifts worked;
- sales;
- commissions;
- tips;
- bonuses;
- deductions;
- loan deduction;
- net payable;
- payment status;
- calculation explanation.

## Summaries

- Current three-day estimate.
- Last completed payout.
- Current month.
- Previous month.
- Three-month income used for loan eligibility.
- Trend chart.
- Download/export may follow after core web view.

## Corrections

Never edit a posted statement invisibly.

Use:

- adjustment line;
- reversal;
- replacement statement;
- reason;
- approving actor;
- audit link.


---

<!-- Source: 08_RESERVATION_ENGINE.md -->

# Reservation Engine

## Reservation sources

- Customer PWA or CRM.
- Reception.
- Manager.
- Phone or message entry.
- Future integration source.

## Core fields

- reservation ID;
- customer ID;
- branch;
- entertainer;
- room/table/service where relevant;
- requested start and end;
- source;
- status;
- notes;
- privacy-safe contact;
- created by;
- timestamps;
- attribution and completion data.

## Status flow

```text
REQUESTED
AVAILABILITY_CHECK
ASSIGNED
ENTERTAINER_NOTIFIED
ACKNOWLEDGED
CONFIRMED
CUSTOMER_ARRIVED
IN_SERVICE
COMPLETED
CANCELLED_BY_CUSTOMER
CANCELLED_BY_CLUB
CUSTOMER_NO_SHOW
CONFLICT_REVIEW
```

## Entertainer actions

- View details permitted by privacy rules.
- Acknowledge.
- Report schedule conflict.
- Open directions/branch context where applicable.
- Mark ready or request manager assistance when allowed.
- View completed reservation history.

The entertainer should not directly change financial completion or customer-arrival evidence without authorized verification.

## Availability

Check:

- scheduled shift;
- overlapping reservation;
- leave or absence;
- suspended/unavailable status;
- branch assignment;
- manager override.

## Ranking linkage

Only verified completed reservations count.

A repeat-customer loyalty event requires:

- verified customer identity;
- completed visit;
- entertainer attribution;
- qualifying repeat threshold;
- no fraud or duplicate flag.

## Notifications

Notify entertainer for:

- new assignment;
- confirmation;
- change;
- cancellation;
- imminent start;
- customer arrival;
- conflict resolution.

Notify reception/manager when acknowledgement is missing.


---

<!-- Source: 09_ATTENDANCE_SCHEDULE.md -->

# Schedule, Attendance, and Leave

## Schedule

Entertainer sees:

- today's shift;
- weekly calendar;
- branch;
- start/end;
- expected check-in window;
- reservations attached to the shift;
- approved leave;
- schedule changes.

## Attendance events

```text
SCHEDULED
CHECKED_IN
ON_TIME
LATE
CHECKED_OUT
EARLY_LEAVE
ABSENT
NO_SHOW
EXCUSED
CORRECTED
```

Record original evidence and timestamps.

## No-show

No-show is a hard business event.

Effects may include:

- promotion block;
- new loan eligibility block;
- points deduction;
- manager alert;
- benefit suspension.

A correction must create a separate reviewed event rather than deleting the no-show.

## Leave and absence requests

Types:

- paid leave;
- sick leave;
- unpaid leave;
- emergency request;
- schedule change request.

Flow:

```text
DRAFT
SUBMITTED
MANAGER_REVIEW
APPROVED
REJECTED
CANCELLED
```

Include dates, reason, evidence metadata, and decision note.

## Data sources

MVP may use app check-in, manager verification, or imported attendance.

Design an adapter so later systems can provide:

- biometric;
- POS login;
- QR check-in;
- schedule system;
- manual authorized correction.


---

<!-- Source: 10_MOBILE_APP_SCREENS.md -->

# Entertainer Mobile/PWA Screens

## Global navigation

Recommended bottom navigation:

1. Нүүр
2. Хуваарь
3. Орлого
4. Зээл
5. Профайл

Ranking and reservations appear prominently from Home and may also use secondary navigation.

## 1. Login / identity

- Phone or approved identity method.
- OTP.
- Device/session notice.
- Privacy consent.
- Error and locked states.

## 2. Dashboard

Show:

- greeting and profile;
- current rank badge;
- next-rank progress;
- today's points change;
- today's shift;
- check-in state;
- upcoming reservations;
- current three-day estimated income;
- active loan balance;
- urgent task or message;
- notification bell;
- Hermes assistant shortcut.

## 3. Ranking overview

Show:

- Bronze/Silver/Gold/Diamond path;
- current rank;
- progress percentage;
- qualification score;
- achieved requirements;
- blocked requirements;
- benefits unlocked;
- next-rank benefits;
- policy date/version in plain language.

## 4. Points and metric detail

Tabs:

- Ирц
- Борлуулалт
- Үнэнч хэрэглэгч
- Захиалга
- Бусад

Each tab shows:

- current metric;
- target;
- trend;
- points gained/lost;
- underlying event list.

## 5. Schedule

- day/week view;
- shift cards;
- reservation markers;
- check-in/out action;
- schedule-change request.

## 6. Attendance

- attendance percentage;
- on-time count;
- late count;
- no-show count;
- correction status;
- leave request entry.

## 7. Reservations

- new;
- upcoming;
- completed;
- cancelled;
- acknowledge;
- conflict report;
- reservation detail;
- customer identity masked as required.

## 8. Income summary

- current three-day estimate;
- last paid amount;
- current month;
- three-month average;
- sales, commissions, tips, bonuses, deductions;
- trend.

## 9. Payout statement

- period;
- line items;
- loan deduction;
- net amount;
- paid/pending;
- calculation details;
- correction link/status.

## 10. Loan home

States:

- not eligible with reasons;
- eligible with maximum;
- request pending;
- approved awaiting accounting;
- active repayment;
- paid loan.

Show:

- current maximum;
- active balance;
- next deduction estimate;
- progress;
- history.

## 11. New loan request

- calculation explanation;
- amount slider and direct input;
- repayment slider 30%–60%;
- estimated deduction;
- estimated cycles/date;
- terms confirmation;
- submit.

## 12. Loan request timeline

Timeline:

- submitted;
- CEO review;
- CEO decision;
- accounting;
- transferred;
- active.

Include decision notes and notifications.

## 13. Active loan detail

- original principal;
- total repaid;
- remaining;
- progress bar;
- selected rate;
- every repayment;
- next estimate;
- status.

## 14. Tasks and employee requests

- assigned tasks;
- due date;
- completion;
- leave/sick/other request;
- manager response.

## 15. Messages and notifications

- system alerts;
- reservation messages;
- loan status;
- attendance;
- rank changes;
- management messages;
- read/unread.

## 16. Hermes assistant

Examples:

- “Дараагийн зэрэгт хүрэхэд юу дутуу байна?”
- “Сүүлийн орлогын тайланг тайлбарла.”
- “Миний зээлийн үлдэгдэл хэд вэ?”
- “Өнөөдрийн захиалгуудыг харуул.”

Hermes must respect the same permissions and must not approve or mutate financial data without explicit authorized workflows.

## 17. Profile and settings

- profile;
- branch;
- bank account verification state;
- language;
- notification preferences;
- security;
- logout.

## Required empty/error/loading states

Every screen requires:

- loading;
- no data;
- insufficient data;
- offline/retry;
- permission denied;
- stale calculation warning;
- action success;
- action failure.


---

<!-- Source: 11_ADMIN_WEB_SCREENS.md -->

# Management and Accounting Web Screens

## Shared layout

- Left navigation.
- Branch selector where authorized.
- Global search.
- Notification center.
- Role-aware action buttons.
- Audit link on sensitive records.

## Executive dashboard

- active entertainers;
- rank distribution;
- promotion candidates;
- blocked promotions;
- attendance/no-show alerts;
- sales and loyalty trends;
- pending loan requests;
- approved awaiting payment;
- active loan principal;
- repayment health;
- reservation volume.

## Entertainer directory

Filters:

- branch;
- rank;
- attendance status;
- loan status;
- promotion readiness;
- active/inactive.

## Entertainer detail

Tabs:

- overview;
- rank and points;
- attendance;
- reservations;
- income;
- loans;
- tasks/requests;
- audit.

## Rank management

- rank distribution;
- candidates;
- blockers;
- policy configuration;
- policy versions;
- rank history;
- manual review with reason;
- benefit suspension.

## CEO loan approval queue

Columns:

- entertainer;
- branch;
- rank;
- three-month average;
- maximum;
- request;
- repayment rate;
- risk/gate status;
- waiting time;
- action.

## Loan review detail

Use the specification in `06_LOAN_ENGINE.md`.

## Accounting disbursement queue

- CEO-approved requests;
- bank verification;
- transfer entry;
- failure/retry state;
- proof/reference;
- completed transfers.

## Payout runs

- period;
- branch;
- status;
- entertainer count;
- gross;
- deductions;
- loan repayments;
- net;
- exceptions;
- post/approve actions.

## Loan reconciliation

- active principal;
- expected deductions;
- posted deductions;
- reversed deductions;
- mismatches;
- closed loans;
- export.

## Reservations

- calendar;
- queue;
- entertainer availability;
- assignment;
- acknowledgement;
- arrival/completion;
- conflict handling.

## Attendance and leave

- live shift status;
- late/no-show;
- leave queue;
- correction requests;
- evidence;
- decision.

## Reports

- rank movement;
- attendance;
- sales;
- loyalty;
- reservations;
- income;
- loan issuance;
- repayments;
- outstanding principal;
- branch comparison;
- entertainer trend.

## Settings

- branches;
- roles;
- ranking policy;
- loan policy;
- payout period;
- integration credentials;
- notification templates;
- feature flags;
- audit access.


---

<!-- Source: 12_DATA_MODEL.md -->

# Logical Data Model

## Identity and organization

### User
- id
- phone/email
- authentication state
- status
- last login

### RoleAssignment
- user_id
- role
- branch_id nullable
- effective_from/to

### Branch
- id
- name
- timezone
- status

### EntertainerProfile
- id
- user_id
- branch_id
- stage name
- employment status
- joined_at
- bank_account_verification_id
- current_rank_id
- profile metadata

## Ranking

### RankDefinition
- id
- code
- name
- order
- icon
- benefits
- loan_multiplier
- policy_version_id

### RankingPolicyVersion
- id
- version
- effective_from
- weights
- thresholds
- hard_gates
- event_points
- created_by

### PerformanceEvent
- id
- entertainer_id
- metric
- type
- source
- source_record_id
- value
- points_delta
- occurred_at
- policy_version_id
- status
- reversal_of

### RankingSnapshot
- id
- entertainer_id
- window
- metric_values
- weighted_score
- hard_gate_results
- rank_before
- rank_after
- evaluated_at
- policy_version_id

### RankHistory
- id
- entertainer_id
- from_rank
- to_rank
- reason
- snapshot_id
- effective_at

## Attendance

### Shift
- id
- entertainer_id
- branch_id
- starts_at
- ends_at
- status

### AttendanceEvent
- id
- shift_id
- entertainer_id
- type
- occurred_at
- source
- evidence
- reversal_of

### LeaveRequest
- id
- entertainer_id
- type
- starts_at
- ends_at
- reason
- status
- decision

## Customer and reservation

### Customer
- id
- verified identity keys
- privacy fields
- status

### Reservation
- id
- customer_id
- entertainer_id
- branch_id
- starts_at
- ends_at
- source
- status
- assigned_by
- completion evidence

### CustomerEntertainerVisit
- id
- customer_id
- entertainer_id
- reservation_id nullable
- pos_transaction_id nullable
- occurred_at
- verified
- qualifies_for_loyalty

## Income and payout

### IncomeEvent
- id
- entertainer_id
- branch_id
- type
- gross
- eligible_income
- deduction_base
- source
- source_record_id
- occurred_at
- status
- reversal_of

### PayoutPeriod
- id
- starts_at
- ends_at
- branch_id
- status

### PayoutSettlement
- id
- payout_period_id
- entertainer_id
- gross
- additions
- deductions
- loan_repayment
- net
- status
- posted_at
- paid_at

### PayoutLineItem
- id
- settlement_id
- type
- description
- amount
- source
- source_record_id
- reversal_of

## Loans

### LoanPolicyVersion
- id
- effective_from
- income_definition
- rank_multipliers
- min_repayment_rate
- max_repayment_rate
- gates
- created_by

### LoanEligibilitySnapshot
- id
- entertainer_id
- months
- monthly_eligible_income
- average
- rank
- multiplier
- maximum
- gates
- policy_version_id
- calculated_at

### LoanRequest
- id
- entertainer_id
- eligibility_snapshot_id
- requested_amount
- repayment_rate
- status
- submitted_at
- CEO decision fields
- accounting fields

### LoanAccount
- id
- request_id
- principal
- disbursed_at
- outstanding_principal
- status

### LoanRepayment
- id
- loan_account_id
- settlement_id
- deduction_base
- rate
- amount
- before_balance
- after_balance
- posted_at
- reversal_of

## Support and governance

### Notification
### MessageThread
### Task
### AttachmentMetadata
### AuditEvent
### IntegrationCursor
### IdempotencyKey
### PolicyDecision


---

<!-- Source: 13_API_EVENTS.md -->

# API and Domain Events

## API principles

- Version APIs.
- Validate all financial inputs server-side.
- Use idempotency keys for request submission, disbursement recording, payout posting, and repayment posting.
- Never trust rank, maximum loan, or repayment calculations from the client.
- Return human-readable explanation objects for UI.
- Apply branch and role scope on every query.
- Use optimistic concurrency or version checks on financial state changes.

## Suggested endpoint groups

```text
/auth
/me
/entertainers
/shifts
/attendance
/leave-requests
/reservations
/performance-events
/ranking
/income
/payout-periods
/payout-settlements
/loan-eligibility
/loan-requests
/loan-accounts
/loan-repayments
/tasks
/messages
/notifications
/policies
/reports
/audit
/integrations
```

## Critical commands

- SubmitLoanRequest
- DecideLoanRequest
- RecordLoanDisbursement
- CalculatePayoutPeriod
- PostPayoutSettlement
- PostLoanRepayment
- ReversePayoutLine
- RecordAttendanceCorrection
- AssignReservation
- CompleteReservation
- EvaluateRank
- PublishPolicyVersion

## Domain events

```text
EntertainerCreated
ShiftScheduled
EntertainerCheckedIn
EntertainerLate
EntertainerNoShow
AttendanceCorrected
SaleFinalized
SaleReversed
ReservationAssigned
ReservationAcknowledged
ReservationCompleted
RepeatCustomerQualified
PerformancePointsPosted
RankEvaluationCompleted
RankPromoted
RankBenefitSuspended
LoanEligibilityCalculated
LoanRequested
LoanReturnedForInformation
LoanApprovedByCEO
LoanRejectedByCEO
LoanDisbursementRecorded
LoanActivated
PayoutCalculated
PayoutPosted
LoanRepaymentPosted
LoanRepaymentReversed
LoanPaid
NotificationRequested
AuditEventRecorded
```

## Event-processing requirements

- At-least-once delivery must not duplicate points, income, or repayments.
- Use source-system record IDs and idempotency keys.
- Failed consumers go to a visible retry/dead-letter process.
- Reprocessing must preserve policy version and historical accuracy.


---

<!-- Source: 14_INTEGRATIONS.md -->

# Integrations

## Phoenix.mn POS or equivalent POS

Expected data:

- finalized orders;
- entertainer attribution;
- products/services;
- amount;
- tips when available;
- voids/refunds;
- customer identity or link;
- branch;
- transaction time.

Build an adapter layer. Do not embed POS-specific fields throughout the domain.

## Customer CRM / loyalty source

Expected data:

- customer identity;
- visit history;
- reservation source;
- branch;
- entertainer association;
- repeat visit;
- rating/complaint when available.

## Attendance source

MVP can use app and authorized management input. Keep an adapter for later biometric, QR, POS, or scheduling sources.

## Accounting

Phase 1 supports:

- payout export;
- disbursement record;
- reconciliation export;
- optional import confirmation.

Do not assume direct general-ledger integration without API documentation.

## Bank transfer

Phase 1 defaults to manual transfer plus transaction reference recording.

A future bank API adapter may:

- initiate payment;
- poll status;
- receive webhook status;
- reconcile transfer.

## Messaging

Potential channels:

- in-app push;
- Telegram;
- Viber;
- email.

Use notification templates and channel preferences. Financial approval and disbursement messages must not expose full bank details.

## Hermes assistant

Hermes may answer authorized questions and navigate users to records. It must:

- use scoped read tools;
- explain calculations from server-returned evidence;
- never independently approve loans;
- never fabricate a balance;
- request explicit confirmation before supported write actions;
- leave an audit trail for writes.


---

<!-- Source: 15_NOTIFICATIONS.md -->

# Notifications and Messaging

## Notification categories

- Shift and attendance.
- Reservation.
- Rank and points.
- Income and payout.
- Loan.
- Tasks and employee requests.
- Management announcements.
- Security.

## Priority

- Critical: no-show, transfer failure, suspicious financial change.
- High: new CEO approval request, approved loan awaiting accounting, reservation starting soon.
- Normal: points update, payout posted, task assigned.
- Low: educational tip, rank coaching.

## Required loan notifications

Entertainer:

- request submitted;
- returned for information;
- approved;
- rejected with reason;
- transferred;
- repayment posted;
- loan paid.

CEO:

- new request;
- aging request;
- data changed after eligibility snapshot;
- suspicious or blocked request.

Accounting:

- CEO-approved request;
- bank information issue;
- transfer failed;
- payout exception;
- reconciliation mismatch.

## Notification center

- read/unread;
- deep link;
- category;
- timestamp;
- priority;
- action;
- archival;
- delivery status by channel.

## Group messages

Authorized management may send branch or group announcements. Keep direct operational messages separate from financial audit records.


---

<!-- Source: 16_SECURITY_AUDIT.md -->

# Security, Privacy, and Audit

## Security requirements

- Strong authentication and session management.
- Role and branch authorization.
- Server-side financial validation.
- Encryption in transit and at rest where supported.
- Mask bank accounts except where accounting requires the full value.
- Do not expose customer contact details beyond role need.
- Rate-limit authentication and sensitive actions.
- Protect integration credentials.
- Log security-sensitive access.

## Immutable audit events

Audit:

- rank policy publication;
- rank promotion/demotion/benefit suspension;
- attendance correction;
- income adjustment;
- payout posting;
- loan request;
- CEO decision;
- disbursement;
- repayment;
- reversal;
- permission changes;
- bank-account changes;
- manual override.

Fields:

- actor;
- role;
- action;
- entity;
- entity version;
- before/after summary;
- reason;
- timestamp;
- request/correlation ID;
- source IP/device where appropriate.

## Financial invariants

- Outstanding principal cannot be negative.
- Total posted repayments minus reversals cannot exceed principal.
- Disbursed amount cannot exceed approved amount.
- Accounting cannot disburse before CEO approval.
- A repayment must reference a posted settlement.
- A posted financial record cannot be physically deleted.
- Policy versions used for decisions remain queryable.


---

<!-- Source: 17_ANALYTICS_REPORTING.md -->

# Analytics and Reporting

## Entertainer metrics

- attendance rate;
- punctuality;
- no-show count;
- sales;
- sales per shift;
- repeat-customer rate;
- completed reservations;
- rating;
- points gained/lost;
- current score;
- rank;
- days in rank;
- income;
- payout;
- active loan;
- repayment progress.

## Management metrics

- rank distribution;
- promotion conversion;
- rank retention;
- attendance trend;
- no-show trend;
- sales by branch/rank;
- repeat-customer trend;
- reservation conversion;
- entertainer tenure;
- loan request approval rate;
- disbursement time;
- active principal;
- repayment cycle count;
- loan completion rate;
- payout exceptions.

## Explainability

Every aggregate report must allow drill-down to source events subject to permissions.

## Initial exports

- entertainer rank report;
- attendance exception report;
- three-day payout report;
- loan issuance report;
- active loan report;
- repayment report;
- reconciliation exceptions;
- reservation report.

CSV/XLSX export may be added after on-screen correctness is validated.


---

<!-- Source: 18_TEST_ACCEPTANCE.md -->

# Test Strategy and Acceptance Criteria

## Test layers

- Unit tests for scoring, eligibility, repayment, and state transitions.
- Property/invariant tests for financial calculations.
- Integration tests for POS import, idempotency, and event processing.
- API authorization tests.
- UI component tests.
- End-to-end tests for complete role workflows.
- Accessibility and responsive tests.
- Audit-log tests.
- Migration and seed-data tests.

## Critical end-to-end scenario

1. Seed entertainer “Ану” as Silver.
2. Seed three completed months of eligible income.
3. Calculate average.
4. Confirm maximum equals 20% of average.
5. Select less than maximum.
6. Select 50% repayment.
7. Submit.
8. CEO approves.
9. Accounting records transfer.
10. Loan becomes active.
11. Post a three-day payout.
12. Apply 50% deduction.
13. Verify payout net and loan balance.
14. Show repayment to entertainer.
15. Repeat until final deduction closes loan.
16. Verify audit chain.

## Ranking acceptance

- Daily events update points without duplication.
- Metric breakdown totals reconcile to points ledger.
- No-show blocks promotion.
- Corrected no-show uses reversal/adjustment and restores eligibility only according to policy.
- Historical rank decision uses the historical policy version.
- Entertainer sees exact missing requirements.

## Reservation acceptance

- Conflicting assignment is detected.
- Entertainer receives notification.
- Completion creates eligible performance event.
- Cancelled/no-show reservation does not create completed-reservation points.
- Repeat-customer event requires verified threshold.

## Security acceptance

- Entertainer cannot read another entertainer's finances.
- Manager cannot disburse.
- Accountant cannot approve.
- CEO cannot silently mark a bank transfer complete unless explicitly granted accounting role.
- Branch data does not leak across unauthorized users.

## Definition of Done

An issue is Done only when:

- acceptance criteria pass;
- tests are committed;
- lint/type-check/build pass;
- documentation is updated;
- no sensitive data is logged;
- UI has loading, empty, error, and permission states;
- Linear issue includes evidence and links.


---

<!-- Source: 19_ROADMAP_SPRINTS.md -->

# Phase 1 Roadmap

This plan fits the previously discussed 45-day delivery structure by using focused vertical slices. Codex should adjust sequencing after repository inspection without changing business dependencies.

## Milestone 0 — Repository and rules baseline

Deliverables:

- current-state repository audit;
- architecture map;
- existing-screen inventory;
- Linear project and issue inventory;
- confirmed policy configuration;
- seed data;
- connected clickable navigation.

Exit criteria:

- no duplicate Linear structure;
- all major requirements mapped;
- unresolved decisions recorded with defaults.

## Milestone 1 — Platform foundation

Deliverables:

- authentication;
- roles and branch scope;
- shared design tokens;
- mobile and web shells;
- user/profile/branch models;
- audit framework;
- notification foundation.

## Milestone 2 — Schedule, attendance, and profile

Deliverables:

- entertainer dashboard;
- schedule;
- check-in/out;
- attendance history;
- no-show and correction workflow;
- leave requests;
- manager attendance workspace.

## Milestone 3 — Ranking and points

Deliverables:

- policy version model;
- performance events;
- points ledger;
- qualification snapshot;
- rank progression UI;
- next-rank requirements;
- promotion/blocker management;
- rank reports.

## Milestone 4 — Income and payouts

Deliverables:

- income imports/events;
- three-day payout periods;
- line items;
- statement UI;
- monthly and three-month summaries;
- correction/reversal workflow;
- accounting payout workspace.

## Milestone 5 — Loans

Deliverables:

- eligibility snapshot;
- maximum calculation;
- amount and repayment sliders;
- request;
- CEO queue and decision;
- accounting disbursement;
- active loan;
- repayment from payout;
- history and reconciliation;
- notifications.

## Milestone 6 — Reservations and loyalty linkage

Deliverables:

- reservation states;
- availability;
- assignment;
- entertainer acknowledgement/conflict;
- completion;
- customer-return attribution;
- loyalty performance events;
- reservation reporting.

## Milestone 7 — Hardening and pilot

Deliverables:

- end-to-end tests;
- role/branch security;
- audit review;
- performance review;
- mobile responsiveness;
- backup/recovery documentation;
- pilot seed users;
- training notes;
- release checklist.

## Dependency order

```text
Auth/roles
  -> profile/branch
  -> schedule/attendance
  -> performance events
  -> ranking

Income events
  -> payout settlement
  -> loan eligibility
  -> request/approval/disbursement
  -> repayment/reconciliation

Reservation
  -> completion evidence
  -> loyalty event
  -> ranking
```


---

<!-- Source: 20_LINEAR_OPERATING_MODEL.md -->

# Linear Operating Model

## Project hierarchy

Use one Linear project for Phase 1, unless an existing project already represents it.

Suggested project:

`NOMAD Entertainer Platform — Phase 1`

Suggested milestones:

1. Foundation
2. Attendance
3. Ranking
4. Income
5. Loans
6. Reservations
7. Pilot Release

Use issues as vertical deliverables and sub-issues as implementation work.

## Labels

- `phase:1`
- `app:entertainer-mobile`
- `app:management-web`
- `service:api`
- `domain:attendance`
- `domain:ranking`
- `domain:income`
- `domain:loans`
- `domain:reservations`
- `domain:notifications`
- `domain:security`
- `type:feature`
- `type:bug`
- `type:tech-debt`
- `type:research`
- `priority:blocker/high/normal/low`

Reuse workspace naming conventions when they already exist.

## Issue template

### Outcome

What user or business result will exist?

### User story

As a [role], I need [capability], so that [outcome].

### Scope

Included behavior.

### Not included

Explicit boundary.

### Business rules

Reference exact policy.

### Acceptance criteria

Use Given/When/Then or checkable statements.

### UI states

Loading, empty, error, permission, success.

### Data/API

Entities, endpoints, events, migrations.

### Security

Role and branch restrictions.

### Tests

Unit, integration, end-to-end.

### Dependencies

Issue links.

### Documentation

Relevant `/docs` files.

## Codex synchronization rules

Before implementation:

- search issue/project;
- avoid duplicates;
- confirm parent and dependency;
- update `PROJECT_STATUS.md`.

During implementation:

- move to In Progress;
- comment plan;
- link branch;
- add blockers immediately;
- split only when a child issue can be independently accepted.

After implementation:

- attach test/build evidence;
- link PR/commit;
- summarize changed behavior;
- update docs;
- move to Done only after acceptance.

## Suggested initial epics/issues

### Foundation

- Audit existing code and prototypes.
- Establish shared domain package.
- Implement authentication and sessions.
- Implement role and branch authorization.
- Implement audit service.
- Implement notifications.

### Attendance

- Schedule model and UI.
- Check-in/out.
- Late/no-show rules.
- Leave requests.
- Attendance corrections.
- Manager exception dashboard.

### Ranking

- Ranking policy versions.
- Performance event ingestion.
- Daily points ledger.
- Qualification calculation.
- Rank progress UI.
- Promotion/blocker workflow.
- Rank history and reporting.

### Income

- Income-event adapter.
- Three-day payout periods.
- Settlement calculation.
- Entertainer statement UI.
- Accounting review.
- Adjustment/reversal.

### Loans

- Eligibility snapshot.
- Amount and repayment controls.
- Submit request.
- CEO approval.
- Accounting disbursement.
- Active loan and repayment.
- Loan history.
- Reconciliation.

### Reservations

- Reservation model.
- Availability/conflict check.
- Assignment and acknowledgement.
- Arrival/completion.
- Repeat-customer qualification.
- Reservation notifications.

### Pilot

- Complete E2E flow.
- Security review.
- Reporting.
- Seed/pilot users.
- Release checklist.


---

<!-- Source: 21_OPEN_DECISIONS_DEFAULTS.md -->

# Open Decisions and Current Defaults

Codex should not block implementation on these unless the current repository or Linear issues already contain a different approved rule. Use the defaults below and keep them configurable.

## 1. Four ranks but three loan percentages

Default resolution:

- Bronze: no loan
- Silver: 20%
- Gold: 30%
- Diamond: 40%

## 2. Active loans

Default: one active loan per entertainer.

## 3. Repayment percentage

Default selectable range: 30%–60%, 5% steps, initially preselected at 50%.

## 4. Loan interest

Default: zero interest and no late fee in Phase 1.

## 5. Income window

Default: latest three completed calendar months, excluding the incomplete current month.

## 6. Payout cadence

Default: every three days.

## 7. Rank evaluation

Default: daily recalculation with rolling metric windows and hard gates.

## 8. Repeat customer definition

Default: at least three verified completed visits linked to the same entertainer.

## 9. Promotion

Default: automatic when all requirements are met, while management receives an audit notification.

## 10. Demotion

Default: grace period and warning; immediate benefit suspension may occur for no-show or serious discipline.

## 11. Reservation response

Default: entertainer acknowledges or reports conflict; reception/manager confirms the final assignment.

## 12. Accounting payment

Default: transfer is performed externally and recorded with reference/proof metadata.

## 13. Tips and service income

Default: count only values supplied by a reliable finalized POS/accounting source.

## 14. Rank-specific commission percentages

Not defined in Phase 1. Store rank benefits as configurable metadata but do not invent commission changes.

## 15. Customer-facing app

Out of scope for this phase; reservation imports must use an adapter.


---

<!-- Source: 22_SEED_MOCK_DATA.md -->

# Seed and Mock Data

Use consistent test data across mobile, web, API, and end-to-end tests.

## Entertainer

- Name: Ану
- Branch: NOMAD
- Current rank: Silver
- Attendance: 92%
- Monthly sales: 4,800,000 MNT
- Loyalty score: 89%
- Rating: 4.9
- Progress to Gold: 76%
- Today's shift: 19:00–04:00
- VIP requests: 3
- New reservations: 2
- Current three-day estimated income: 580,000 MNT

## Three-month eligible income example

- Month 1: 4,200,000 MNT
- Month 2: 4,800,000 MNT
- Month 3: 5,100,000 MNT
- Average: 4,700,000 MNT
- Silver maximum at 20%: 940,000 MNT

## Loan example

- Requested amount: 750,000 MNT
- Selected repayment rate: 50%
- Status path:
  - Submitted
  - CEO approved
  - Accounting pending
  - Disbursed
  - Active
- Example three-day eligible deduction base: 500,000 MNT
- Deduction: 250,000 MNT
- Balance after first repayment: 500,000 MNT

## Ranking events

- On-time shift: positive attendance points.
- Completed shift: positive attendance points.
- Verified sale: sales points.
- Third verified visit by a customer: loyalty points.
- Completed VIP reservation: reservation points.
- Late arrival: negative attendance points.
- No-show: large negative points and hard gate.
- Corrected no-show: reversal plus corrected attendance event.

## Required states

Seed at least one record for:

- Bronze, Silver, Gold, Diamond;
- eligible and ineligible loan;
- pending CEO decision;
- approved awaiting accounting;
- disbursement failed;
- active repayment;
- paid loan;
- upcoming reservation;
- conflict;
- completed repeat-customer reservation;
- no-show;
- corrected attendance;
- posted payout;
- adjusted payout.


---

<!-- Source: 23_OUT_OF_SCOPE.md -->

# Explicitly Deferred Work

Do not let Phase 1 expand into these projects:

- full customer VIP membership application;
- five-level customer loyalty system;
- room booking marketplace;
- full HR employee lifecycle;
- procurement and repair workflow;
- company-wide CEO goal planning;
- branch sales goal approval;
- full CRM;
- full accounting ledger;
- cross-branch entertainer transfer engine;
- automated bank payment initiation;
- native app store packaging;
- advanced AI autonomous decisions.

Design integration boundaries so later modules can connect, but do not build them inside Phase 1 issues.
