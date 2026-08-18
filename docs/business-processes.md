# Business Process Catalog

This catalog is the starting point for the VIP Club operating model. Each listed process requires a detailed Markdown specification and version-controlled BPMN diagram before implementation.

## Process standards

Every detailed process defines owner, roles, trigger, inputs, normal flow, exceptions, decisions, records, permissions, notifications, audit events, metrics, and acceptance criteria. Values not finalized are marked **TBD — Business configuration required**.

## Phase 0 — Foundation

| ID | Process | Purpose | Primary owner |
| --- | --- | --- | --- |
| P00 | Policy publication and versioning | Approve, publish, supersede, and apply effective-dated policies safely. | CEO / Operations |
| P01 | User, role, and branch access lifecycle | Create, change, suspend, and revoke role/branch access. | HR / System Administrator |
| P02 | Audit and correction workflow | Correct sensitive records through traceable adjustment or reversal. | System Administrator / Finance |
| P03 | Branch setup and activation | Configure and activate a future branch without code deployment. | System Administrator / CEO |

## Phase 1 — Foundation Operations and Customer Service

| ID | Process | Purpose | Primary owner |
| --- | --- | --- | --- |
| P10 | Employee and entertainer onboarding | Create identity, branch, role, schedule, bank/contract records, and required acknowledgements. | HR |
| P11 | Branch workforce planning, weekly schedule, and attendance | Maintain weekday/role minimum staffing, build and publish weekly shifts, validate coverage, record check-in/out, classify attendance, and manage corrections. | Branch manager |
| P12 | Entertainer performance and rank evaluation | Convert verified performance events into explainable rank outcomes. | Operations / Branch manager |
| P13 | Three-day income settlement | Calculate earnings, deductions, loan repayment, review, approve, and record settlement. | Accounting |
| P14 | Performance-based loan | Check eligibility, obtain approval, disburse, and repay through settlements. | CEO / Accounting |
| P15 | Customer registration and consent | Find or create customer profile and record marketing consent and channel preferences. | Host / Reception |
| P16 | Reservation lifecycle | Request, confirm, assign, arrive, complete, cancel, and attribute revenue. | Reception / Branch manager |

### P11 — Branch workforce planning, weekly schedule, and attendance

**Owner:** Branch Manager for the authorized branch.

**Purpose:** Ensure each operating day has an explicit minimum workforce requirement, a published weekly roster, and verified attendance that can be compared to what the branch required and planned.

**Core flow:**

```text
Maintain weekday/role staffing template
→ Build weekly roster
→ Compare Required vs Scheduled
→ Resolve or record shortage
→ Publish schedule
→ Employee attends / approved absence applies
→ Record verified check-in/out
→ Compare Scheduled vs Checked In
→ Classify late / no-show / approved absence
→ Manager reviews exceptions
→ Publish verified attendance/readiness
```

**Leave/day-off request subflow:**

```text
Team member submits own request with date range and reason
→ Request remains Pending with no schedule/attendance effect
→ Authorized Branch Manager reviews branch scope and coverage
→ Approve with reason / Reject with reason
→ If approved, mark unavailable and recalculate coverage
→ Preserve any published assignment and open a backfill gap
→ Keep request, decision, attendance, and pay treatment as separate records
```

**Key records:**

- branch staffing template;
- staffing requirement;
- ERPNext/Frappe Shift Assignment;
- Employee Checkin;
- Attendance;
- Leave Application;
- shift coverage/readiness snapshot;
- staffing exception;
- attendance correction/manager excusal decision.

**Key rule:** a valid published shift assignment or equivalent approved schedule record is required before a person can be classified as late or no-show for that shift.

**Penalty boundary:** manager confirmation preserves the lateness/no-show evidence but does not itself create a monetary penalty. Until CL-013 has an approved effective policy version, all penalty candidates remain amount-not-calculated and cannot become deductions.

**Coverage model:**

```text
Required -> Scheduled -> Checked In
```

The process must keep planning shortages separate from attendance failures.

## Phase 2 — Workforce Task Management

| ID | Process | Purpose | Primary owner |
| --- | --- | --- | --- |
| P20 | Task assignment and acknowledgement | Assign work down the authorized hierarchy, notify the assignee, and record receipt. | CEO / Manager |
| P21 | Task execution and completion | Record progress, comments, evidence, result, review, rework, and closure using ERPNext/Frappe task records where practical. | Assignee / Manager |
| P22 | Deadline reminder and overdue escalation | Send configurable approaching-deadline reminders, escalate overdue/blocked work, and avoid notification spam. | Manager |
| P23 | Formal order and policy acknowledgement | Issue a required instruction and capture read/acknowledgement evidence. | CEO / Manager |
| P24 | Maintenance request and closure | Report, assign, repair, verify, and close maintenance work. | Branch Manager |
| P25 | Internal message and upward feedback | Send permission-controlled direct messages, concerns, updates, or recipient-anonymous feedback with protected audit identity. | Employee / Authorized Recipient |
| P26 | AI-assisted project/task planning | Convert an authorized idea into proposed projects, milestones, tasks, owners, and deadlines without bypassing backend permissions. | CEO / Manager |

## Phase 3 — CRM, Membership, Points, Privileges, and Intelligence

| ID | Process | Purpose | Primary owner |
| --- | --- | --- | --- |
| P30 | Customer visit and spend attribution | Link verified visits and eligible spend to a customer, branch, reservation, and entertainer when applicable. | Reception / Operations |
| P31 | Membership-level evaluation | Apply approved branch-specific policy to assign one of five customer membership levels. | CRM manager |
| P32 | Benefit and approved value-ledger lifecycle | Earn/issue, use, expire, adjust, reverse, and audit approved privileges, points, or value without assuming a standalone cashback balance. | CRM manager / Finance |
| P33 | Customer segmentation and campaign | Build a segment, validate consent, send a campaign, and track communication history and outcomes. | Marketing / CRM manager |
| P34 | Customer intelligence review | Analyze visit cadence, spend, value, loyalty, branch behavior, and entertainer affinity. | Manager / CEO |

## Phase 4 — Management, Finance, and Optimization

| ID | Process | Purpose | Primary owner |
| --- | --- | --- | --- |
| P40 | CEO target and manager monthly plan | CEO sets target; manager builds an AI-assisted action plan; CEO approves; execution and month-end review follow. | CEO / Branch Manager |
| P41 | Employee feedback, complaints, and retention | Receive, restrict, investigate, resolve, and measure employee concerns. | HR |
| P42 | Customer and entertainer branch transfer | Offer an alternate branch while preserving authorization and attribution. | Branch Manager |
| P43 | Payroll, compliance, and financial reconciliation | Apply approved statutory rules, post records, reconcile, and retain evidence. | Accounting |
| P44 | Manager KPI, reward, and penalty review | Calculate approved KPI evidence, route reward/penalty proposal through human review, allocate approved rewards, and post/audit outcomes. | CEO / HR / Accounting |
| P45 | Branch health review | Combine approved branch metrics into a configurable score or severity with drill-down and exception follow-up. | CEO / General Manager |

## Cross-module relationship flows

~~~text
CallPro → Customer lookup/create → Reservation → Branch operations

Reception check-in → Room/customer session → Customer Assistant QR
→ Entertainer request → Service completion → Bill or Drop-off → Reconciliation

Customer feedback → Management review
→ Verified incident when substantiated → Entertainer evidence

Entertainer KPI evidence → Recommendation → Human approval
→ Effective rank → Effective profit-sharing policy → Settlement

CEO target → Manager/AI action plan → ERPNext Projects/Tasks
→ Execution → Sales/KPI result → Reward/Penalty review → Next cycle
~~~

## Core process rules

- CallPro supplies only verified provider facts; ERP classifies call purpose unless provider documentation confirms otherwise.
- Customer, Call Operator, Receptionist, and Bartender access is limited to service-required data.
- Operational entertainer availability and customer visibility are distinct.
- The approximate two-minute entertainer-request target measures service response and does not automatically punish.
- A customer complaint is reviewed before becoming a verified incident.
- An unexplained checked-in session creates a reconciliation exception, not an automatic accusation.
- AI drafts and recommends; authorized humans approve rank, compensation, penalty, termination, target plan, and policy decisions.
- All financial values, KPI weights, thresholds, deadlines, prices, and formulas use effective-dated configuration.

## BPMN delivery order

1. P15 Customer registration and consent
2. P11 Branch workforce planning, weekly schedule, and attendance
3. P13 Three-day income settlement
4. P20 Task assignment and acknowledgement
5. P21 Task execution and completion
6. P16 Reservation lifecycle
7. P31 Membership-level evaluation
8. P32 Benefit and approved value-ledger lifecycle
9. P33 Customer segmentation and campaign
10. P40 CEO–Manager Goal Engine

## Open design decisions

Detailed BPMN work must not invent policy. The completed-eligible-visit membership formula is approved; the main pending decisions are eligible-spend treatment, branch ranges, cross-branch classification, task approval/reopening, benefit/value-ledger controls, channel-provider behavior, and the final weekly schedule publication/change cutoff.
