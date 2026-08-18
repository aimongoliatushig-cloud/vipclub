---
type: ux-requirements
status: selected-baseline
last_reviewed: 2026-08-07
---

# Internal PWA

## Purpose

Define one role-aware internal PWA for employees and team members. Each user has individual credentials; navigation, data, actions, notifications, and AI tools adapt to backend-authorized role, branch, ownership, and field scope.

## Role workspaces

| Workspace | Primary capabilities |
| --- | --- |
| CEO | Cross-branch dashboard, targets/plans, manager history, branch health candidates, feedback, exceptions, projects/tasks, approved audits, CEO assistant |
| General Manager | Delegated cross-branch operations, subordinate work, reviews, escalations, manager assistant |
| Branch Manager | Operations workstation, rooms/sessions, reservations, entertainer availability/requests, feedback/incidents, reconciliation, staff, action plan, KPI, tasks |
| Call Operator | CallPro queue/facts, masked customer lookup/create, call purpose, reservation, VIP service indicator, current-shift entertainer availability |
| Receptionist / Host | Customer lookup/create, consent, reservation, arrival/check-in, room/session, drop-off |
| Bartender / Floor Operations | Current rooms/customers, reservations, active entertainer requests, aging alerts, masked service preferences |
| Lead Entertainer | Team readiness, schedule, coaching, authorized evidence and incidents |
| Entertainer | Own schedule, attendance, requests, tasks, messages, rank/KPI explanation, income statement, loans, personal assistant |
| HR / Accounting / Other roles | Existing role-specific workflows and evidence under permissions |

## Consolidated operations view

Managers and bartenders need one screen for immediate service operations rather than fragmented screens. It shows permission-appropriate room availability/occupancy, customer sessions, current/upcoming reservations, entertainer availability/visibility, requests, aging/unresolved requests, and reconciliation alerts.

## AI assistants

CEO, Manager, and Entertainer assistants have distinct context and tool allowlists. The assistant acts as the authenticated user through backend services and cannot broaden access or approve consequential actions.

## Notifications

Use PWA/web notifications for task deadlines, overdue items, approval requests, entertainer requests, goal progress, reconciliation exceptions, and authorized messages. Timing, escalation, branch timezone, and throttling are configurable.

## Security and privacy

- UI visibility never replaces server authorization.
- Call Operator and Bartender do not receive unrestricted CRM.
- Entertainers see only their own private operational and financial data.
- Public/customer fields and internal entertainer fields remain separate.
- Anonymous-feedback identity is hidden from normal recipients and available only through audited authority.
- Realtime events carry minimum authorized data.

## UX principles

- Mongolian-first wording.
- Three to five primary actions per workspace where practical.
- Clear empty, denied, stale, offline/reconnect, and external-provider error states.
- Obvious aging/unresolved service requests without automatic blame.
- Drill-down from summary to authorized evidence.

## Open decisions

Final navigation, role aliases, offline behavior, notification defaults, realtime reconnect, device/session policy, and operational workstation layout remain subject to UX and repository audit.

## Related documents

- [Role Permission Matrix](../03-roles/ROLE_PERMISSION_MATRIX.md)
- [Functional Requirements](../functional-requirements.md)
- [API Architecture](../02-architecture/API_ARCHITECTURE.md)
