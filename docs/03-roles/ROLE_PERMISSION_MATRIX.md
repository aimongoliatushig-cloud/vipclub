---
type: permission-spec
status: partial-approved
last_reviewed: 2026-08-18
---

# Role Permission Matrix

## Purpose

Define minimum role, branch, record, action, approval, export, and field-level access. This is a deny-by-default baseline; final DocType actions and sensitive fields require implementation mapping and approval.

This document currently records the approved workforce-planning and scheduling permissions. Other domain permissions remain to be completed from approved business decisions.

## Permission principles

- Permissions are deny-by-default.
- Branch scope is enforced server-side.
- A visible menu or hidden button is never the security boundary.
- Operational scheduling authority does not imply unrestricted HR authority.
- Consequential configuration changes and post-publication schedule changes must be auditable.

## Workforce planning and scheduling

| Capability | CEO-level | Branch Manager | HR Manager | Team Member |
| --- | --- | --- | --- | --- |
| View staffing requirements | All authorized branches | Own authorized branch | All authorized branches | No, unless separately granted |
| Edit weekday/role minimum staffing template | Oversight/override only where separately authorized | Yes, own authorized branch | View/advise; edit only if separately authorized | No |
| View weekly schedule | All authorized branches | Own authorized branch | All authorized branches as required for HR work | Own published schedule |
| Create/edit unpublished weekly shift assignments | No routine operational ownership; override only where separately authorized | Yes, own authorized branch | Only if separately authorized | No |
| Publish weekly schedule | No routine operational ownership; override only where separately authorized | Yes, own authorized branch | Only if separately authorized | No |
| Change published schedule | Executive override where authorized | Yes, own branch with audit trail | HR intervention where authorized | No |
| Acknowledge published assignment | No | Own assignment only if separately assigned a shift | Own assignment only if separately assigned a shift | Yes, own assignment |
| Request change to published assignment | No | Own assignment only if separately assigned a shift | Own assignment only if separately assigned a shift | Yes, own assignment |
| View coverage/readiness | All authorized branches | Own authorized branch | All authorized branches | Own shift status only |
| Review daily attendance exceptions | Oversight/drill-down | Yes, own authorized branch | HR review/escalation according to policy | Own attendance and correction request |
| Excuse attendance incident | Only where executive policy permits | Yes where policy permits, own branch | Yes where HR policy permits | No |
| Submit leave/day-off request | Own request only if acting as a team member | Own request only if acting as a team member | Own request only if acting as a team member | Yes, own request only |
| Approve/reject branch leave request | Oversight/override only where policy permits | Yes, own authorized branch; HR co-approval remains separate where required | Yes according to HR policy | No |
| View penalty-review evidence | Oversight/drill-down | Own authorized branch | HR review according to policy | Own incident and decision only |
| Create monetary penalty/deduction | Only through approved policy workflow | No authority from branch scheduling role alone | Only where approved policy delegates | No |
| Create/terminate employment record | No routine action unless separately delegated | No | Yes, according to HR authority | No |
| Change employment type/contract | No routine action unless separately delegated | No | Yes, according to HR authority | No |

## Sales-goal and customer-intelligence visibility

| Capability | CEO-level | Branch Manager | Marketing / CRM role | Team Member |
| --- | --- | --- | --- | --- |
| View active monthly sales target and progress | All authorized branches | Own authorized branch only | As separately granted | No |
| Propose branch monthly target/action plan | Review/return/approve; not routine proposal owner | Own authorized branch | No unless separately assigned as branch sales manager | No |
| Approve or activate monthly sales target | Yes, with decision evidence | No | No | No |
| View customer membership level | Authorized company/branch scope | Own authorized branch, read-only | Authorized customer scope | Own level only where customer self-service permits |
| Search customer by phone | Authorized projected search | Own branch; masked result only | Authorized projected search | No |
| View customer total/average expenditure | Authorized analytical scope | Own branch, operationally necessary fields only | Authorized analytical scope | Own history only where separately permitted |
| Edit membership level or branch ranges | CEO approval/override according to policy | Propose/support only | Propose according to policy | No |
| Export full customer/contact data | Only if separately granted | No from manager role alone | Only if separately granted and consent/privacy controls pass | No |

A full phone number may be accepted by an authorized production search endpoint for normalized matching, but it must not be returned to or retained in the Branch Manager browser projection. The browser-local prototype therefore searches the visible last four digits only.

## Branch Manager workforce authority

A Branch Manager may, for the manager's authorized branch:

- configure minimum staffing requirements by weekday and role;
- build and publish weekly shift schedules;
- assign eligible branch team members to approved shifts;
- view authorized leave/availability information required for scheduling;
- identify and backfill staffing shortages;
- review daily attendance exceptions;
- approve or reject own-branch leave/day-off requests with an audited reason;
- view own-branch lateness/no-show evidence and downstream penalty-review state;
- make audited excusal decisions where policy allows.

The Branch Manager may not, solely because of this authority:

- activate or terminate employment;
- alter contracts or employment type;
- grant unrestricted access to private HR data;
- alter company-wide HR policy;
- access another branch's workforce configuration without explicit cross-branch authority.

## HR boundary

HR owns formal personnel lifecycle and company-wide HR policy. HR must be able to see branch staffing risk and published schedules where needed for staffing, transfer, leave, onboarding, and offboarding workflows.

## CEO-level oversight

CEO-level users may view company-wide staffing readiness and workforce risks according to executive authorization. CEO-level access should support oversight, escalation, and approved override without making the CEO the routine weekly scheduler.

Executive oversight may expose roster deadlines, publication timestamps, version history, unresolved gaps, overdue acknowledgements/change requests, the accountable manager, last action, next action, and due date. An executive may message the Branch Manager or create a tracked follow-up task. Subjective inactivity labels are not authorized without a defined measurable breach.

## Team-member scope

A team member can view the person's own published schedule and attendance information, plus submit approved leave/correction requests according to policy. Team members cannot alter branch staffing requirements or publish schedules.

## Audit-sensitive actions

Audit at minimum:

- staffing-template edits;
- weekly schedule publication;
- post-publication assignment change;
- manager attendance excusal;
- executive/HR override.

## Remaining permission gaps

The following still require broader approved decisions:

- complete customer/CRM field visibility by role;
- financial approval and export matrix;
- cross-branch task-assignment permissions;
- campaign/broadcast approval permissions;
- final cross-branch manager access model;
- exact HR override rules for operational schedules.

## Related documents

- [Branch workforce scheduling decision](../decisions/2026-08-13-branch-workforce-scheduling.md)
- [Workforce module](../04-modules/workforce/README.md)
- [Functional requirements](../functional-requirements.md)
