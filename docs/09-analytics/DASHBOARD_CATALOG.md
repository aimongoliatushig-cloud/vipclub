---
type: analytics
status: selected-baseline
last_reviewed: 2026-08-07
---

# Dashboard Catalog

## Purpose

Define permission-scoped dashboards and drill-down stories without freezing final UI layout prematurely.

| Dashboard/workspace | Audience | Required information |
| --- | --- | --- |
| CEO Portal | CEO | Cross-branch sales/targets, managers, teams, entertainers, feedback, operational exceptions, KPI, branch-health candidates, tasks/projects, plan progress, reward/penalty outcomes |
| General Manager | General Manager | Delegated branch comparisons, operations, exceptions, plans, KPI, tasks, escalations |
| Branch Manager | Branch Manager | Target/actual, action plan, tasks, attendance, feedback, rooms/sessions, reservations, entertainer requests, drop-off, reconciliation, manager KPI/history |
| Operations Workstation | Branch Manager, Bartender/Floor Operations | Near-real-time room availability/occupancy, customer groups, reservations, entertainer availability/visibility, active and aging requests, service alerts |
| Call Operator | Call Operator | Calls handled, answered/missed, customer match, reservations, conversion, purposes, prank/blocked, own/operator-authorized detail |
| Reception | Receptionist/Host | Reservations, arrivals/check-ins, room/session assignment, drop-off reasons, unresolved visit outcomes |
| Entertainer | Entertainer | Own schedule, requests, attendance, KPI/rank explanation, income statement, deductions, loans, tasks, feedback visible under policy |
| CRM/Loyalty | Authorized CRM/management | Customer segments, membership, points, privileges, visit cadence, branch mix, campaigns, retention opportunity |
| Finance | Authorized accounting | Settlements, deductions, reward allocations, point liabilities, payments, reconciliation, exceptions |
| Audit | Tightly authorized roles | Rank decisions, financial rule changes, phone blocks, incidents, targets/plans, protected identity access, reconciliation resolutions |

## Drill-down dimensions

Authorized reports and dashboards support date/period, branch, manager/employee, entertainer, customer cohort, call operator, feedback category, drop-off reason, room/session, request outcome, and target period.

## Design rules

- Summary values link to authorized evidence.
- Show freshness, reconciliation state, formula/policy version, and data gaps.
- Distinguish reporting metrics from compensation metrics.
- Avoid finalizing exact tile/layout design before UX validation.
- Enforce field masking in dashboard, export, and realtime detail.
- Provide empty, denied, stale, external-provider failure, and unresolved states.

## Branch health

The CEO portal reserves a branch-health summary and drill-down, but the formula, weights, cadence, severity, colors, and alerts are **TBD — Business configuration required**.

## Related documents

- [KPI Dictionary](KPI_DICTIONARY.md)
- [Internal PWA](../08-ux/INTERNAL_PWA.md)
- [Role Permission Matrix](../03-roles/ROLE_PERMISSION_MATRIX.md)
