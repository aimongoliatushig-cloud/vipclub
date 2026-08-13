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

### Schedule lifecycle

The weekly roster uses an explicit lifecycle:

```text
Draft -> Published -> Closed
          |
          -> Audited revision -> Published (new version)
```

- **Draft** may be changed by the authorized Branch Manager and is not an attendance expectation.
- **Published** is visible to affected team members and becomes the authoritative attendance expectation.
- A material change to a published assignment creates a new version, records the manager's reason, and returns the affected assignment to acknowledgement pending.
- **Closed** preserves the final roster and attendance relationship after the operating week; it is not silently editable.

Each assignment records `Assigned`, `Acknowledged`, or `Change requested` as the team-member response. Acknowledgement confirms receipt only; it does not replace attendance evidence or turn a schedule into an employee approval workflow.

Before publication the system must validate branch scope, active employment, role eligibility, approved leave/availability, duplicate or overlapping shifts, and minimum coverage. A roster with a permitted shortage requires a manager reason and keeps the shortage open for follow-up.

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

### Leave and day-off requests

A team member can submit a leave or day-off request only for the person's own active branch assignment. The request stores type, start/end date, reason, submitter, branch, and submitted time, and uses `Pending`, `Approved`, or `Rejected` state.

The authorized Branch Manager can approve or reject an own-branch request with a required reason. Pending and rejected requests do not change schedule coverage, attendance, or pay treatment. Approval marks the member unavailable for the approved period and recalculates coverage. If approval overlaps a published shift, retain the original shift/version, expose the resulting gap, and allow an auditable backfill; never silently delete the source assignment. HR co-approval, balance, category, notice-period, attachment, and emergency rules remain subject to approved HR policy.

### Lateness and penalty review

The manager can inspect every lateness and no-show candidate with scheduled time, verified arrival where available, late minutes, source evidence, attendance decision, and downstream review state. Attendance and penalty treatment remain separate records.

CL-013 is still open. Therefore the system may display `Attendance decision pending`, `Penalty policy pending`, or `Excluded from penalty processing`, but it must display `Amount not calculated` and must not create a monetary penalty or deduction. A future authorized penalty record must reference the source evidence, manager decision, effective policy version, approver, and appeal result.

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
- own-branch leave/day-off approval with an audited reason, subject to any separate HR co-approval;
- visibility of lateness/no-show penalty-review evidence without authority to invent a monetary amount.

HR remains the owner of formal employee lifecycle records such as employment activation, termination/offboarding, contract/employment type, and company-wide personnel policy unless separately delegated.

The manager must not gain unrestricted HR authority merely because the manager can schedule an employee.

## 10. Manager PWA requirements

The internal PWA should provide the Branch Manager with a Workforce area containing at least:

1. **Staffing Requirements** — Monday-Sunday role minimums.
2. **Weekly Schedule** — employee-to-shift planning calendar.
3. **Coverage / Readiness** — Required vs Scheduled vs Checked In.
4. **Attendance and Leave** — separate tabs for attendance exceptions, leave/day-off approval, and penalty-review evidence.
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

### CEO oversight and the management-action link

CEO-level oversight must show objective workflow evidence rather than infer that a manager is inactive. At minimum, the executive view should expose:

- roster publication due date and actual publication time;
- draft, published, revised, or closed state and version;
- unresolved coverage gaps by branch, date, and role;
- team-member acknowledgements still pending after the configured reminder threshold;
- open leave/change requests affecting published coverage;
- the accountable Branch Manager, last schedule action, next action, and due date;
- shortage resolution notes or an explicitly recorded decision to operate with a permitted gap.

The CEO can drill into evidence, message the manager, or create an accountable follow-up task. The CEO is not the routine weekly scheduler, and the system must not label a manager as "doing nothing" without an approved, measurable breach such as late publication or an overdue unresolved exception.

## 12. Audit requirements

Retain audit history for:

- staffing-template changes;
- weekly schedule creation/publication;
- schedule changes after publication;
- manager attendance decisions;
- leave/day-off submissions and manager decisions;
- any later penalty-policy evaluation, approval, appeal, and deduction linkage;
- shortage events and resolution where available.

At minimum record branch, actor, timestamp, previous value, new value, and effective date where applicable.
