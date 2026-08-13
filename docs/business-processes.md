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

**Coverage model:**

```text
Required -> Scheduled -> Checked In
```

The process must keep planning shortages separate from attendance failures.

## Phase 2 — Workforce Task Management

| ID | Process | Purpose | Primary owner |
| --- | --- | --- | --- |
| P20 | Task assignment and acknowledgement | Assign work by role and branch, notify the assignee, and record receipt. | CEO / Manager |
| P21 | Task execution and completion | Record progress, comments, evidence, result, review, rework, and closure. | Assignee / Manager |
| P22 | Overdue task escalation | Remind, escalate, and report delayed or blocked work. | Manager |
| P23 | Formal order and policy acknowledgement | Issue a required instruction and capture read/acknowledgement evidence. | CEO / Manager |
| P24 | Maintenance request and closure | Report, assign, repair, verify, and close maintenance work. | Branch manager |

## Phase 3 — CRM, Loyalty, Benefits, and Intelligence

| ID | Process | Purpose | Primary owner |
| --- | --- | --- | --- |
| P30 | Customer visit and spend attribution | Link verified visits and eligible spend to a customer, branch, reservation, and entertainer when applicable. | Reception / Operations |
| P31 | Membership-level evaluation | Apply approved branch-specific policy to assign one of five customer membership levels. | CRM manager |
| P32 | Benefit and approved value-ledger lifecycle | Earn/issue, use, expire, adjust, reverse, and audit approved privileges, points, or value without assuming a standalone cashback balance. | CRM manager / Finance |
| P33 | Customer segmentation and campaign | Build a segment, validate consent, send a campaign, and track communication history and outcomes. | Marketing / CRM manager |
| P34 | Customer intelligence review | Analyze visit cadence, spend, value, loyalty, branch behavior, and entertainer affinity. | Manager / CEO |

## Phase 4 and later

| ID | Process | Purpose | Primary owner |
| --- | --- | --- | --- |
| P40 | CEO–Manager Goal Engine | Propose, approve, execute, review, and improve monthly branch goals. See [monthly sales goal approval](monthly-sales-goal-process.md). | CEO / Manager |
| P41 | Feedback, complaints, and retention | Receive, restrict, investigate, resolve, and measure people-related concerns. | HR |
| P42 | Customer and entertainer branch transfer | Offer an appropriate alternate branch while preserving authorization and attribution. | Branch manager |
| P43 | Payroll, compliance, and financial reconciliation | Apply approved statutory rules, post records, reconcile, and retain evidence. | Accounting |

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
