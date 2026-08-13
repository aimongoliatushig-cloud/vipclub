---
type: business-decision
status: approved
decision_date: 2026-08-13
scope: branch workforce planning, weekly scheduling, and attendance readiness
---

# Branch Workforce Planning and Weekly Scheduling

## Decision

Each Branch Manager owns the operational workforce plan for the manager's authorized branch.

The system must support a recurring minimum staffing template by **weekday and role**, a **weekly employee shift schedule**, and a live comparison of required, scheduled, and actually checked-in staffing.

This decision extends the existing ERPNext/Frappe workforce model; it does not replace ERPNext core HR records.

## 1. Minimum staffing template

Each branch has its own recurring Monday-through-Sunday staffing requirements.

The Branch Manager can configure the minimum number of people required for every operational role for each weekday, including roles such as:

- entertainer;
- server;
- bartender;
- host/receptionist;
- security;
- driver;
- technical/maintenance roles;
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

The same value may be reused across several weekdays, but the manager may configure different values for each day.

Staffing-template changes are branch-scoped, effective-dated, and auditable.

## 2. Weekly shift scheduling

Branch Managers build and publish the actual team schedule on a weekly basis.

The weekly scheduler assigns specific branch team members to specific shifts and dates using approved ERPNext/Frappe employee and shift records.

The manager must be able to:

- view the branch team;
- filter by role;
- assign a team member to a shift/date;
- edit or remove an unpublished assignment;
- adjust published schedules through an audited change;
- see employee leave/availability information that the manager is authorized to view;
- publish the weekly schedule;
- see unresolved coverage shortages before publication and after later changes.

A longer calendar view may be provided for planning, but the authoritative operational roster is the published weekly schedule.

## 3. Coverage model

The system must distinguish three values:

```text
Required -> Scheduled -> Checked In
```

### Required

The minimum number of people required for that branch, weekday, and role according to the active staffing template.

### Scheduled

The number of eligible team members with published shift assignments for that date/role.

### Checked In

The number of scheduled team members who actually verified attendance for the shift.

This distinction separates a planning failure from an attendance failure.

## 4. Coverage indicators

For each branch/date/role, calculate and display at least:

- minimum required;
- scheduled count;
- schedule shortage;
- checked-in count;
- approved leave/absence;
- unexpected no-show;
- late arrivals;
- actual readiness shortage.

Example:

```text
Entertainers
Required: 25
Scheduled: 23
Schedule shortage: 2
Checked in: 21
Approved leave: 1
Unexpected no-show: 1
Actual readiness shortage: 4
```

Coverage percentage may be displayed as:

```text
Scheduled coverage = Scheduled / Required
Actual readiness = Checked In / Required
```

When `Required = 0`, the system must avoid division-by-zero and represent the role as not required for that period.

## 5. Shortage alerts

The manager must be warned when:

- a weekly schedule does not meet the branch's minimum staffing template;
- a published schedule later falls below requirement because of approved leave, transfer, suspension, or other known change;
- actual check-in falls below requirement during the operating shift;
- an unexpected no-show creates a critical shortage.

The system should make shortages visible by role and date so the manager can backfill the shift when possible.

## 6. Attendance source of expectation

The published shift assignment is the authoritative operational expectation for attendance.

A person cannot be classified as late or no-show for a shift unless the system has a valid published assignment or another approved authoritative schedule record.

### Lateness

```text
Late minutes = Verified clock-in time - Scheduled shift start time
```

### No-show

If a scheduled person does not attend and does not have an approved absence according to policy, the system creates an unapproved no-show record.

Approved leave and unexpected no-show must remain distinguishable because they have different management and Branch Health implications.

## 7. Daily exception review

The Branch Manager reviews attendance exceptions for the branch, including:

- lateness;
- unexpected no-show;
- approved absence;
- schedule/attendance mismatches;
- attendance corrections.

The manager may excuse an incident where policy allows it. Excusing the incident must not erase the source attendance evidence; it records a separate audited decision controlling downstream penalty treatment.

## 8. ERPNext/Frappe boundary

Reuse ERPNext/Frappe records where appropriate, including:

- Employee;
- Shift Type;
- Shift Assignment;
- Employee Checkin;
- Attendance;
- Leave Application.

VIP Club custom records/services should add only the branch-specific logic needed for:

- recurring staffing requirements;
- coverage calculation;
- readiness snapshots;
- shortage alerts;
- manager scheduling workflow;
- audited branch-specific configuration.

Do not duplicate ERPNext core HR records without a justified need.

## 9. Manager versus HR authority

Branch Managers own operational planning for their authorized branch:

- minimum staffing requirements;
- weekly shift assignments;
- shift coverage;
- daily attendance exception handling within policy.

HR remains the owner of formal employee lifecycle records such as employment activation, termination/offboarding, contract/employment type, and company-wide personnel policy unless separately delegated.

The manager must not gain unrestricted HR authority merely because the manager can schedule an employee.

## 10. Manager PWA requirements

The internal PWA should provide the Branch Manager with a Workforce area containing at least:

1. **Staffing Requirements** — Monday-Sunday role minimums.
2. **Weekly Schedule** — employee-to-shift planning calendar.
3. **Coverage / Readiness** — Required vs Scheduled vs Checked In.
4. **Attendance Review** — lateness, no-show, leave, and correction exceptions.
5. **Team Members** — operational team view and availability within authorized scope.

The scheduler should be mobile-friendly but may provide richer calendar interactions on larger screens.

## 11. Reporting and KPI implications

The system must preserve enough history to distinguish:

- insufficient people scheduled by the manager;
- sufficient scheduling but poor actual attendance;
- planned approved shortage;
- unexpected operational shortage.

These values may later feed:

- Branch Health Score;
- Branch Manager KPI;
- workforce-risk forecasting;
- Hermes recommendations.

## 12. Audit requirements

Retain audit history for:

- staffing-template changes;
- weekly schedule creation/publication;
- schedule changes after publication;
- manager attendance decisions;
- shortage events and resolution where available.

At minimum record branch, actor, timestamp, previous value, new value, and effective date where applicable.
