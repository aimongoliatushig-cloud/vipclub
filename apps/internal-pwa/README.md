# Internal PWA

The internal VIP Club PWA serves all employees and team members through one application. Every user has individual credentials; the workspace adapts by role, branch, ownership scope, and permissions.

## Intended structure

- `src/` — application routes, features, components, and service clients
- `src/features/` — role-aware business capabilities such as tasks, attendance, entertainer ranking, goals, payroll, CRM, and maintenance
- `src/shared/` — shared UI, permission-aware navigation, notifications, and API utilities
- `tests/` — unit, permission, integration, and user-journey tests
- `public/` — PWA manifest, icons, and static assets

## Security

The interface must never be the only access control. Every API and data request must be authorized server-side by role, branch, ownership, action, and field sensitivity.

## Relationship to Frappe

This PWA will consume approved Frappe/ERPNext APIs from the VIP Club custom app. Framework, build tooling, and deployment details are intentionally pending the repository and VPS audit.
