# Monthly Branch Sales Goal Approval Process

## Purpose

Create an approved, evidence-based monthly sales target and action plan for each branch, then track actual progress against that approved target.

## Roles

- **Branch sales manager:** prepares the proposed sales target and activity plan for the branch.
- **CEO:** reviews, asks questions, requests revisions, and approves or rejects the final plan.
- **Hermes:** assists with analysis and recommendations; it does not approve the target or commit a plan.
- **System:** records the approved target and displays progress throughout the month.

## Timing

Three days before the start of a new month, Hermes prepares a planning draft from authorized historical and current data. The branch sales manager completes and submits the proposal before the planning deadline.

## Workflow

1. Hermes analyzes available branch data and prepares recommendations:
   - target rationale;
   - sales trends and baseline;
   - risks and opportunities;
   - focus areas;
   - suggested actions.
2. The branch sales manager reviews the recommendations and drafts:
   - proposed monthly sales target;
   - action plan;
   - expected impact;
   - owners and due dates;
   - supporting explanation.
3. The manager submits the plan to the CEO.
4. The CEO reviews the plan and can ask questions or return it for revision.
5. The manager responds and resubmits until the CEO approves or rejects it.
6. On CEO approval, the system locks the approved target and plan version as the active monthly goal.
7. During the month, the system calculates actual sales against the approved target and displays:
   - target amount;
   - actual sales;
   - achievement percentage;
   - progress bar;
   - forecast, variance, and risks when available.
8. Hermes can provide reminders, summaries, and recommendations during the month, but cannot change the target or approve actions without human authorization.
9. At month-end, the result and action-plan outcome become evidence for the next planning cycle.

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




## Sales-target policy setting

An authorized administrator maintains a versioned, effective-dated improvement percentage. The default target formula is:

```text
Target for branch and month
= reconciled sales for the same branch and month in the prior year
× (1 + approved improvement percentage)
```

Example: if the prior-year sales for the same month were 100 million MNT and the configured improvement percentage is 5%, the system proposes a target of 105 million MNT.

The policy can have a company-wide default and authorized branch-specific override. Hermes shows the baseline, percentage, formula, source sales record, and any override in its recommendation. The CEO may approve a different final target with a recorded reason.

## Historical sales data for goal calculation

Before goal planning, import prior monthly branch sales from the approved POS, accounting system, or validated spreadsheet export into a reconciled branch-sales-history record.

Each imported record includes:

- branch;
- month and year;
- gross and net sales according to the approved definition;
- source system or file;
- import date and operator;
- reconciliation status and evidence;
- corrections or adjustments.

Hermes uses only reconciled, authorized sales history. It can compare the same month in prior years, recent-month trends, and branch-specific patterns, then explain which baseline and assumptions support its recommendation. The CEO and manager remain responsible for choosing and approving the final target.

## Afternoon goal reminders

- Hermes runs a scheduled reminder in the afternoon at a configurable branch-local time.
- The reminder is sent through the manager's approved channels, the PWA/web-app notification channel only.
- It summarizes the approved monthly goal, current progress, priority actions, and any reported blockers.
- The reminder is advisory; it does not create, alter, approve, or close goals automatically.
- Delivery, read state when available, and reminder configuration changes are retained for audit and operational follow-up.

## States

```text
Draft → Submitted → CEO Review → Revision Requested → Resubmitted → Approved / Rejected
Approved → Active → Closed
```

## Required records

- Goal cycle and branch/month.
- Hermes recommendation version and source-data summary.
- Manager target proposal and action-plan version.
- CEO review comments and decision.
- Approved target and effective date.
- Daily or periodic progress snapshots.
- Action status, evidence, blockers, and outcome.
- Immutable audit history.

## Open decisions

- Confirm whether the Branch Manager is also the Branch Sales Manager, or whether Sales Manager is a separate role.
- Confirm planning deadline, CEO response target, and final approval cutoff.
- Confirm the sales baseline and target-setting method, such as the same month last year, rolling average, or another approved rule.
- Confirm the source system or spreadsheet format for historical sales import and reconciliation.
- Confirm which data Hermes may use and the required human review of its recommendations.
- Confirm sales source of truth and refresh frequency for dashboard progress.
- Confirm default afternoon reminder time, branch-local timezone, recipient rules, and PWA delivery, permission, and fallback behavior.
