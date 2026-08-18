---
type: scaffold
status: in-progress
last_reviewed: 2026-08-13
---

# Dashboard Catalog

## Purpose

Define permission-scoped dashboards and drill-down stories without freezing final UI layout prematurely.

## Branch Manager dashboard

The runnable Manager PWA currently provides these branch-scoped dashboard surfaces:

| Surface | Manager decision supported | Current source in prototype | Production boundary |
| --- | --- | --- | --- |
| Default overview | Prioritize sales, attendance, staffing, leave, and penalty exceptions | Live Frappe manager dashboard, sales progress, team, leave, and penalty APIs | Deployed at `/manager/`; role and branch are server-derived |
| Monthly sales goal | Compare paid POS actual sales with the active CEO-approved branch target | Live paid-POS reconciliation plus `VIP Branch Sales Goal` | Deployed; first real goal still needs manager submission and CEO decision |
| Goal proposal | Prepare and submit the next monthly target and rationale | Live manager save/submit and CEO decision APIs | Deployed; final cycle timing remains governed by CL-024 |
| Task center | Assign work, monitor overdue work, review evidence, request rework, and approve results | Browser-local task state, comments, image metadata, and audit | Identity-bound actions, protected file storage, notification delivery, escalation policy |
| Branch operations | Confirm reservation lifecycle, assign/verify maintenance, and triage service issues | Browser-local branch reservations, maintenance evidence, and safe complaint projections | POS/reservation integration, technical-work identity, HR case permissions, CL-023 service levels |
| Information center | Read operational notifications, track formal-instruction acknowledgements, and inspect CRM communication evidence | Browser-local PWA records, notice audience/acknowledgements, and masked communication history | Provider delivery evidence, approved escalation timing, consent enforcement, communication APIs |
| CRM handoff | Request an authorized segment or communication plan without sending it | Branch-scoped handoff record | CRM/marketing owner review and consent-safe campaign workflow |
| Decision recommendations | Submit rank or membership support evidence without changing the effective value | Browser-local recommendation state and policy locks | Stale-evidence protection, effective policy versions, CEO/CRM decision APIs |
| Workforce readiness | Compare Required → Scheduled → Checked In and find branch gaps | Live weekly/monthly schedule, branch team, and staffing APIs | Deployed; published weekly roster remains authoritative |
| Attendance and leave | Review requests and approve/reject branch leave/day-off requests | One live branch queue combining HRMS `Leave Application` for all Employees and `VIP Emergency Leave Request` for entertainers, with audited manager decisions | Deployed; HR co-approval remains policy-dependent |
| Penalty review | Inspect and decide lateness/no-show penalty candidates | Live penalty evidence and approve/reject/reverse endpoints | Deployed; monetary policy must remain effective-dated under CL-013 |
| Team directory | Find active branch members, role, rank, schedule, and availability | Active branch `Employee` roster enriched with entertainer rank/profile data; weekly/monthly schedule uses the same Employee scope | Deployed with branch permission enforcement; active Employees without Branch stay in the CEO data-quality queue |
| Customer CRM | Search by permitted name/phone input and compare membership, total spend, average spend, and visits | Live `get_manager_customers` response with masked phone output | Deployed; zero-activity cross-branch shells are excluded and full phone is never returned to the browser |
| Rankings | Review customer membership and entertainer/team rank evidence | Live branch-scoped customer/team projections | Read view deployed; effective rank changes remain policy/approval-controlled |

## CEO dashboard

The same `/manager/` application switches to the CEO/company shell only when the authenticated Frappe user has the `CEO` or System Manager authority. It provides company sales progress, branch comparison, pending monthly goal decisions, cross-branch CRM, workforce and penalty oversight, plus controlled navigation to existing NextERP finance, task, message, Hermes and reporting modules. The workforce queue supports name/Employee-ID/designation search and an audited, reason-required assignment of a previously unassigned active Employee to a confirmed VIP branch; it rejects existing assignments and profile conflicts. It does not expose a client-side role switch or infer a branch automatically.

### Default overview queue

The first Manager page shows:

- the manager's own active monthly branch sales goal and progress;
- operational team-state counts and data freshness;
- today's required, scheduled, and checked-in chain;
- open attendance/leave decisions;
- open tasks and results waiting for manager review;
- requested reservations, maintenance results, and unresolved service issues;
- unread branch notifications;
- shift acknowledgements and coverage gaps.

No company-wide total or another branch's customer, workforce, task, or sales data is part of the Branch Manager dashboard unless a separate cross-branch permission is granted.

## Remaining catalog work

- finalize task definitions, escalation timing, and completion statistics through CL-020 and CL-021;
- finalize penalty measures after CL-013;
- finalize goal calendar, baseline, and role mapping through CL-024;
- finalize maintenance categories, urgency, and service levels through CL-023;
- integrate reservation/POS, PWA notification, HR-safe complaint, and CRM handoff APIs;
- activate rank/membership recommendation decisions only after effective policy versions and stale-decision controls are available;
- define production data owners, refresh targets, and reconciliation states per widget;
- provision the named production CEO user and assign the existing `CEO` role;
- complete HR, accounting, CRM-specialist, and team-member dashboard entries.

## Related documents

- [KPI Dictionary](KPI_DICTIONARY.md)
- [Internal PWA](../08-ux/INTERNAL_PWA.md)
- [Role Permission Matrix](../03-roles/ROLE_PERMISSION_MATRIX.md)
