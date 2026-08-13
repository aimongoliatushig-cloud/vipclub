---
type: ux-spec
status: partial-approved
last_reviewed: 2026-08-13
---

# Internal PWA

## Purpose

Define role-aware internal PWA user journeys, workspaces, navigation, and notification behavior.

The application is one role-aware internal PWA. Server-side permissions determine available data and actions.

## Branch Manager default overview

The default page for a Branch Manager is the manager overview for the authenticated manager's authorized branch. The first business panel must show the current active monthly sales goal before operational workforce cards:

- month and branch;
- CEO-approved state and target version;
- approved target amount;
- reconciled actual sales;
- remaining amount or amount above target;
- numeric achievement percentage and progress bar;
- actual-sales source, reconciliation state, and refresh time;
- a direct path to the branch customer-level and CRM view.

Do not show a company-wide target, other branches, or an unapproved proposal as the manager's active goal. If approval or reconciled sales evidence is missing, show a clear pending/unavailable state rather than a misleading zero.

### Manager CRM discovery

The branch customer view should support fast lookup by customer name or the permitted phone identifier. The browser shows masked phone data; a production full-number lookup is performed and normalized server-side, then returns only masked authorized fields.

The customer directory should expose, without opening every record:

- current source membership level;
- total confirmed expenditure;
- average eligible expenditure per completed eligible visit;
- last visit;
- ordering by membership level, total expenditure, average expenditure, and latest visit.

Opening a customer preserves the detailed visit, spend range, affinity, consent, benefit-use, and policy evidence already defined for the manager CRM. Search and sorting do not grant membership editing, approval, export, or cross-branch access.

## Branch Manager workforce workspace

The Branch Manager must have a Workforce area for the manager's authorized branch.

### 1. Staffing Requirements

Purpose: configure the branch's recurring minimum workforce by weekday and role.

The screen should provide a Monday-through-Sunday grid with approved branch roles as rows or an equivalent mobile-friendly editor.

Managers can:

- view the active minimum staffing requirement;
- edit minimum headcount for each weekday/role;
- reuse the same value across multiple days when convenient;
- save an effective-dated configuration;
- view configuration history where authorized.

Example:

```text
Role            Mon Tue Wed Thu Fri Sat Sun
Entertainer      20  20  20  22  25  28  24
Server             4   4   4   4   5   6   5
Bartender          2   2   2   2   3   3   3
Receptionist       2   2   2   2   2   3   2
Security           2   2   2   2   2   3   2
```

### 2. Weekly Schedule

Purpose: assign specific team members to actual shifts for the operating week.

The scheduler should support:

- week calendar view;
- role filters;
- team-member search;
- shift-type selection;
- authorized availability/leave indicators;
- assignment and reassignment;
- unresolved-shortage indicators;
- publish action;
- audited post-publication changes.

The manager should be able to scan team members as rows and operating days as columns on desktop, with a compact day-by-day view on mobile. Each assignment should show shift time and acknowledgement state. Publishing opens a review that lists validation problems and coverage gaps; a policy-permitted gap requires a reason.

A monthly/calendar overview may be offered for planning, but weekly scheduling is the authoritative operational workflow.

### 3. Coverage / Readiness

Purpose: show what the branch needs, what the manager planned, and what actually happened.

Use the model:

```text
Required -> Scheduled -> Checked In
```

For each role/date show at least:

- required;
- scheduled;
- schedule shortage;
- checked in;
- approved absence;
- unexpected no-show;
- late;
- actual readiness shortage.

Example:

```text
Entertainers
Required 25 | Scheduled 23 | Checked in 21
Planning shortage 2 | Approved leave 1 | Unexpected no-show 1
Actual readiness shortage 4
```

Use clear status semantics so the manager can distinguish a planning problem from an attendance problem.

### 4. Attendance Review

Purpose: let the manager review operational attendance exceptions daily.

Include:

- late arrivals and late minutes;
- unexpected no-shows;
- approved absences;
- schedule/attendance mismatches;
- correction requests;
- source shift and attendance evidence;
- excuse/decision action where policy permits.

An excusal must not erase the original attendance evidence.

The attendance workspace should provide three clearly separated tabs:

- attendance exceptions requiring evidence review;
- leave/day-off requests requiring manager approval;
- penalty review showing lateness/no-show evidence and downstream status.

The penalty review must show `Amount not calculated` while CL-013 is open and explain that an approved effective-dated policy is required before any monetary deduction can be produced.

### 5. Team Members

Purpose: provide the manager with the operational roster needed for scheduling.

Show only authorized information, such as:

- name;
- operational role;
- active branch assignment;
- rank where applicable;
- schedule status;
- authorized leave/availability indicators;
- upcoming shifts.

Do not expose private HR or financial fields merely because the user is a Branch Manager.

## Employee workforce experience

Employees and entertainers should be able to view their own published weekly schedule and attendance state in the same PWA according to permissions.

They should also be able to submit a leave or day-off request for themselves, including a date range and reason, and view Pending, Approved, or Rejected status plus the manager's decision reason. A pending request must be visually distinguished from approved leave and must not imply that the shift is cancelled.

The employee schedule view should make clear:

- date;
- shift start/end;
- branch/location;
- current attendance state;
- approved leave or schedule change;
- relevant notifications.

## Notifications

Notify the Branch Manager about material workforce exceptions, including:

- weekly roster below minimum staffing;
- published roster falling below minimum after leave/status change;
- critical unexpected no-show shortage;
- unresolved scheduling shortage approaching the affected day.

Notify the affected employee when a published schedule is created or materially changed according to notification policy.

### Executive workforce follow-up

The CEO-level view should surface schedule-management exceptions using objective evidence:

- late or missing weekly publication;
- unresolved coverage gaps;
- pending acknowledgements past the reminder threshold;
- open leave/change requests that affect coverage;
- accountable manager, latest action, next action, and due date.

Each exception should link to its schedule version and evidence, with actions to message the manager or create a tracked follow-up task. Do not present a subjective "manager doing nothing" label.

## Responsive behavior

The workforce module must work on mobile and desktop.

Desktop/tablet may use richer weekly grids and drag/drop or dense calendar interactions where appropriate.

Mobile should prioritize:

- today's/this week's shifts;
- shortage alerts;
- quick assignment/change actions;
- attendance exception review;
- clear role-based coverage counts.

## Security

The PWA must not be the only authorization layer. Every staffing-template edit, schedule query, assignment, and attendance decision must be validated server-side by branch and action permission.

## Related documents

- [Branch workforce scheduling decision](../decisions/2026-08-13-branch-workforce-scheduling.md)
- [Workforce module](../04-modules/workforce/README.md)
- [Role permission matrix](../03-roles/ROLE_PERMISSION_MATRIX.md)
- [Functional requirements](../functional-requirements.md)
