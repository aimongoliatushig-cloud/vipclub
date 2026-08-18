# Monthly Branch Sales Target and Action-Plan Process

## Purpose

The CEO sets a monthly sales target for each relevant branch or manager. The manager then prepares an evidence-based operating plan, receives CEO approval, tracks execution, and reviews results for the next cycle.

This latest client direction replaces the earlier rule in which the Branch Sales Manager proposed the target before the month.

## Roles

- **CEO:** sets the monthly target, reviews the manager's action plan, requests changes, approves the plan, monitors all branches, and reviews reward/penalty outcomes.
- **Branch Manager:** reviews the assigned target, prepares and executes the monthly plan, decides which AI recommendations to adopt, allocates an approved team reward when permitted, and resolves branch exceptions.
- **General Manager:** reviews or escalates within delegated company authority.
- **Manager assistant / Hermes:** analyzes authorized evidence, recommends actions, decomposes approved ideas into proposed projects/tasks, explains progress, and never approves consequential decisions.
- **System:** retains target, plan, projects/tasks, progress, KPI, reward/penalty, review, and audit history.

## Timing

The planning cycle begins around the first few days of the new month. The exact target-setting deadline, plan-submission deadline, CEO review target, and activation cutoff are **TBD — Business configuration required** and must be configurable.

Do not hard-code a three-days-before-month rule.

## Workflow

1. The system prepares reconciled historical branch sales, prior targets, action-plan outcomes, customer-experience measures, and other authorized evidence.
2. The CEO sets the target for each relevant branch or manager, recording rationale and any selected baseline.
3. The Branch Manager reviews the target.
4. The Manager assistant may analyze:
   - previous target and actual sales;
   - completed and incomplete initiatives;
   - branch history and seasonal comparison;
   - authorized customer-experience and team-operation data;
   - risks, opportunities, and data limitations.
5. The assistant proposes sales, retention, service, staffing, and operational actions.
6. The manager chooses, edits, rejects, or supplements recommendations.
7. The manager converts the selected approach into an action plan, projects, milestones, tasks, owners, and proposed deadlines.
8. The manager submits the plan to the CEO.
9. The CEO approves or requests changes.
10. The approved version becomes the active monthly operating plan.
11. During the month, the system tracks sales, attainment, forecast when supported, tasks, blockers, and KPI evidence.
12. The assistant provides advisory summaries and progress coaching without unsupported causal claims.
13. At month-end, management reviews target attainment, plan execution, reward/penalty proposal, exceptions, and lessons.
14. The result feeds the next cycle.

## Branch Manager default overview

The Branch Manager's first/default PWA page shows only the active goal for the manager's authorized branch. It includes:

- month and branch;
- CEO approval state, target version, and approval evidence;
- approved target amount;
- reconciled actual sales;
- remaining amount or amount above target;
- achievement percentage and progress bar;
- actual-sales source, reconciliation state, and last refresh time;
- a quick path to the same branch's customer-level and CRM context.

The progress calculation is:

```text
Achievement percentage
= reconciled actual sales for the authorized branch and goal month
÷ active CEO-approved target for the same branch and month
× 100
```

The displayed percentage may exceed 100%. The visual progress track may stop at 100%, while the numeric achievement remains accurate. If the target is not active and CEO-approved, or actual sales are not reconciled, the UI must show the missing/pending state instead of treating the target or sales as zero. The branch view must not expose company-wide or other-branch goals.


Use existing ERPNext/Frappe Project and Task records where practical. AI-generated projects and tasks are proposals until backend permissions and required approvals succeed.

The assistant may request authorized backend services to create projects, milestones, tasks, subtasks, owners, deadlines, and comments. It must not bypass the organizational assignment hierarchy.

## Target evidence and baseline

An effective-dated Sales Target Policy may provide a proposed baseline such as:

~~~text
Suggested target
= reconciled sales for the comparable prior period
× (1 + configured improvement percentage)
~~~

The baseline is advice, not the final target. The CEO selects the final target and records a reason when it differs from the recommendation.

Historical branch sales records retain branch, period, gross/net definition, source, import actor/date, reconciliation state, evidence, and corrections. AI uses only authorized reconciled data and discloses assumptions.

## Manager KPI and history

The manager view shows:

- monthly target and current sales;
- attainment percentage and trend;
- active plan, projects, tasks, owners, blockers, and completion;
- attendance, lateness, no-show, and approved KPI components;
- reward/penalty proposal and final status;
- prior target, actual, reached/missed, and outcome history.

The CEO can compare and drill into authorized manager and branch history.

## Underperformance inputs

Current interview inputs are:

| Attainment | Proposed policy input |
| --- | --- |
| Below 80% | Approximately 10% salary deduction |
| Below 70% | Approximately 20% salary deduction |
| Below 60% | Approximately 30% salary deduction |
| Around or below 50% | Human review for possible dismissal |

These are not approved constants.

- **TBD — Business configuration required:** exact boundaries, stacking/exclusivity, salary base, exceptions, evidence, approval, appeal, and effective dates.
- The system may calculate, flag, report, and support review.
- The system must never terminate employment automatically.
- Any approved deduction or employment action follows HR/legal policy and human authorization.

## Above-target reward and allocation

An approved policy may calculate a reward pool from performance above target. Store:

- policy and source target/actual;
- calculated reward pool;
- manager share;
- proposed team distribution;
- recipient and amount/percentage;
- allocation explanation;
- submission date;
- reviewer/approver;
- final status;
- adjustment/reversal history.

The Branch Manager may propose or decide team allocation only within approved authority. The CEO can see the full allocation.

**TBD — Business configuration required:** reward formula, incremental-sales definition, manager share, team allocation authority, approval, accounting, and payout treatment.

## Candidate customer-experience measures

Potential measures include entertainer-request response, request completion, missed requests, drop-off, check-in-to-bill conversion, complaints per visit, repeat customers, resolution time, alternative-entertainer time, and service feedback trend.

These are candidate evidence only. Final KPI selection and weights are **TBD — Business configuration required** and must not silently affect compensation.

## Afternoon progress reminders

- A scheduled reminder runs at a configurable branch-local time.
- Delivery uses approved PWA/web notification channels.
- It summarizes target, actual, attainment, priority actions, blockers, and approaching deadlines.
- It does not create, alter, approve, or close targets or work.
- Delivery and configuration changes are retained for audit.

## States

~~~text
Target Draft → Target Set
Plan Draft → Submitted → CEO Review → Revision Requested → Resubmitted
→ Approved / Rejected
Approved → Active → Month-End Review → Closed
Reward/Penalty Proposed → Reviewed → Approved / Rejected → Posted / Adjusted
~~~

## Required records

- Goal cycle, branch, manager, and target period.
- CEO target, rationale, baseline, policy, and set date.
- Assistant recommendation and source-data summary.
- Manager plan and decision on each recommendation.
- Project/task links, owners, due dates, evidence, and outcomes.
- CEO comments, revisions, and approval.
- Periodic sales/KPI snapshots and forecast assumptions.
- Reward/penalty proposal, review, final decision, and accounting evidence.
- Immutable audit history.

## Open decisions

- Confirm whether a separate Sales Manager role remains or Branch Manager owns the process.
- Confirm configurable early-month deadlines and escalation.
- Confirm approved target baseline and improvement policy.
- Confirm sales source of truth, refresh cadence, and reconciliation.
- Confirm manager KPI components, weights, customer-experience use, and compensation relationship.
- Confirm exact penalty boundaries and reward formula.
- Confirm which data the Manager assistant may use and the human review standard for its recommendations.
