# Internal PWA

The internal VIP Club PWA serves employees and team members through one application with individual credentials and backend-enforced role, branch, ownership, action, and field scope.

## Role-aware capabilities

Features include tasks/projects, attendance, goals, manager KPI, settlements, CRM service work, Call Operator, Reception, consolidated branch operations, entertainer requests, messaging/feedback, maintenance, and role-scoped AI assistants.

CEO, Manager, and Entertainer assistants use separate allowlisted tool contexts. They call the same permission-checked Frappe services as ordinary UI actions and cannot approve consequential actions automatically.

## Intended structure

- src — routes, features, components, and service clients
- src/features — role-aware business capabilities
- src/shared — UI, permission-aware navigation, realtime, notifications, and API utilities
- tests — unit, permission, integration, realtime, and user-journey tests
- public — PWA manifest, icons, and static assets

## Security

The interface is never the only access control. Every API, realtime subscription, report, export, and AI tool is authorized server-side.

## Relationship to Frappe

The PWA consumes approved Frappe/ERPNext APIs from the VIP Club custom app and reuses ERPNext/Frappe Project and Task records where practical. Use the selected Frappe realtime/event mechanism for rooms, check-in, reservations, availability, and entertainer requests.

Framework, build tooling, and deployment details remain pending repository and VPS audit.

See [Internal PWA requirements](../../docs/08-ux/INTERNAL_PWA.md).
