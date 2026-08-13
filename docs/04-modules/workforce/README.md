---
type: module-spec
status: approved
last_reviewed: 2026-08-13
---

# Workforce Module

## Purpose

Manage branch workforce operations using ERPNext/Frappe employee and shift records, extended with VIP Club-specific staffing requirements, weekly scheduling, coverage/readiness, attendance exceptions, and manager accountability.

## Ownership

- **HR** owns formal employee lifecycle, employment status, contracts, employment type, company-wide personnel policy, and offboarding unless authority is explicitly delegated.
- **Branch Manager** owns operational workforce planning for the manager's authorized branch: staffing minimums, weekly shifts, coverage, and daily attendance exception review.
- **CEO-level users** have company-wide oversight according to executive permissions.

A Branch Manager's scheduling authority does not grant unrestricted HR authority.

## Core operating model

The workforce module separates three questions:

```text
Required -> Scheduled -> Checked In
```

1. **Required** — how many people the branch needs by weekday and role.
2. **Scheduled** — which specific people the manager assigned to published shifts.
3. **Checked In** — who actually attended according to verified attendance evidence.

This allows the system to distinguish planning shortage from attendance failure.

## Branch minimum staffing template

Each branch has a recurring Monday-through-Sunday minimum staffing template.

The Branch Manager can configure minimum headcount for each approved branch role, such as:

- entertainer;
- server;
- bartender;
- host/receptionist;
- security;
- driver;
- maintenance/technical roles;
- other approved branch roles.

Example:

```text
Monday
  Entertainer: 20
  Server: 4
  Bartender: 2
  Receptionist: 2
  Security: 2

Saturday
  Entertainer: 28
  Server: 6
  Bartender: 3
  Receptionist: 3
  Security: 3
```

The template is branch-scoped, effective-dated, and auditable.

## Weekly shift scheduling

The Branch Manager builds and publishes the actual team roster weekly.

The manager can:

- view authorized branch team members;
- filter by role;
- see authorized availability/leave information;
- assign employees to dates and shift types;
- edit unpublished assignments;
- make audited changes after publication;
- publish the weekly schedule;
- identify coverage shortages before publication;
- backfill a shortage when an eligible team member is available.

A month or longer calendar view may be provided for planning, but the published weekly roster is the authoritative operational schedule.

### Roster and assignment states

The weekly roster state is `Draft`, `Published`, `Closed`, or `Superseded`. Published changes create a new version with a reason and audit event; they do not silently replace history.

Each team-member assignment separately records `Assigned`, `Acknowledged`, or `Change requested`. Acknowledgement means the person received the schedule. Attendance is still established only by verified check-in/out or another approved attendance record.

Publication checks must cover:

- authorized branch and active employment;
- role and shift eligibility;
- approved leave/availability conflicts;
- duplicate or overlapping assignments;
- active weekday/role minimum coverage.

Where policy allows publication below minimum coverage, the manager must record a reason and the staffing exception remains open.

## Coverage and readiness

For every branch/date/role, show at least:

- required headcount;
- scheduled headcount;
- schedule shortage;
- checked-in headcount;
- approved leave/absence;
- unexpected no-show;
- late arrivals;
- actual readiness shortage.

Suggested calculations:

```text
Scheduled coverage = Scheduled / Required
Actual readiness = Checked In / Required
```

When the required count is zero, present the role as not required for that period rather than dividing by zero.

## Shortage handling

Warn the manager when:

- the weekly roster is below minimum staffing;
- a published roster later falls below minimum because of approved leave, transfer, suspension, or another known change;
- actual check-in is below minimum during the shift;
- an unexpected no-show creates a critical shortage.

Shortages must be visible by date and role.

## Attendance relationship

The published Shift Assignment or equivalent approved schedule record is the source of the employee's attendance expectation.

### Lateness

```text
Late minutes = verified clock-in time - scheduled start time
```

### No-show

A no-show can only be created when the employee was scheduled to attend and no approved absence applies according to policy.

Approved absence and unexpected no-show remain separate statuses because they have different operational, penalty, KPI, and Branch Health effects.

## Daily manager review

Branch Managers review attendance exceptions daily, including:

- late arrivals;
- unexpected no-shows;
- approved absences;
- attendance/schedule mismatches;
- correction requests.

Where policy permits, a manager may excuse an incident. The original attendance evidence remains unchanged; the excusal is a separate audited decision that controls downstream penalty treatment.

## ERPNext/Frappe reuse

Reuse standard records where appropriate:

- Employee;
- Shift Type;
- Shift Assignment;
- Employee Checkin;
- Attendance;
- Leave Application.

VIP Club custom records/services should cover only the missing business logic, including:

- branch staffing template;
- staffing requirement by weekday/role;
- coverage/readiness snapshots;
- shortage alerts;
- branch-specific configuration audit.

## Manager PWA workspace

The Branch Manager Workforce area must include:

1. **Staffing Requirements** — Monday-Sunday role minimums.
2. **Weekly Schedule** — weekly employee-to-shift planning calendar.
3. **Coverage / Readiness** — Required vs Scheduled vs Checked In.
4. **Attendance Review** — lateness, no-show, leave, and correction exceptions.
5. **Team Members** — operational roster and authorized availability information.

## Reporting and KPI use

Persist enough history to distinguish:

- manager planning shortage;
- attendance failure despite adequate planning;
- planned approved shortage;
- unexpected shortage.

These records may feed Branch Health, manager KPI, workforce forecasting, and Hermes recommendations.

CEO-level oversight should connect each exception to observable management workflow evidence: publication deadline and time, schedule version, unresolved gaps, pending acknowledgements, open change/leave requests, the accountable manager, last action, next action, and due date. Executive users may drill down, message the manager, or create a follow-up task without becoming the routine schedule owner.

## Audit

Audit at minimum:

- staffing-template changes;
- schedule publication;
- post-publication schedule changes;
- manager attendance decisions;
- shortage events and resolution where available.

Record actor, branch, timestamp, previous value, new value, and effective date where applicable.

## Related documents

- [Branch workforce scheduling decision](../../decisions/2026-08-13-branch-workforce-scheduling.md)
- [Functional requirements](../../functional-requirements.md)
- [Data model](../../data-model.md)
- [Business processes](../../business-processes.md)
- [Role permission matrix](../../03-roles/ROLE_PERMISSION_MATRIX.md)
- [Internal PWA](../../08-ux/INTERNAL_PWA.md)
