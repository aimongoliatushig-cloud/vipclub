---
type: ux-spec
status: partial-approved
last_reviewed: 2026-08-13
---

# Internal PWA

## Purpose

Define role-aware internal PWA user journeys, workspaces, navigation, and notification behavior.

The application is one role-aware internal PWA. Server-side permissions determine available data and actions.

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
