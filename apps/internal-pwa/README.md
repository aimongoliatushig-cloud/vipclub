# Internal PWA

The internal VIP Club PWA serves all employees and team members through one application. Every user has individual credentials; the workspace adapts by role, branch, ownership scope, and permissions.

## Intended structure

- `src/` — application routes, features, components, and service clients
- `src/features/` — role-aware business capabilities such as tasks, attendance, goals, payroll, CRM, and maintenance
- `src/shared/` — shared UI, permission-aware navigation, notifications, and API utilities
- `tests/` — unit, permission, integration, and user-journey tests
- `public/` — PWA manifest, icons, and static assets

## Security

The interface must never be the only access control. Every API and data request must be authorized server-side by role, branch, ownership, action, and field sensitivity.

## Branch Manager workforce prototype

This branch starts the first runnable Manager-facing slice directly from the approved workforce Markdown:

- weekly team-member schedule grid;
- branch manager overview with live operational-status counts and data freshness;
- Required → Scheduled → Checked In coverage/readiness drill-down;
- attendance exception review with preserved source evidence and audited decisions;
- branch-only team directory, upcoming shifts, rank visibility, and reason-required availability overrides;
- role and team-member filters;
- draft assignment create/edit/remove;
- active-employment, role, overlap, leave, and coverage validation;
- publication review with a required reason for permitted shortages;
- assignment acknowledgement visibility;
- team-member own-assignment acknowledgement and reason-required change-request preview;
- manager response queue with overdue-threshold evidence and audited reminder records;
- versioned, reason-required changes after publication;
- browser-local mock persistence and audit events for prototype review.

Rank override remains intentionally locked because `docs/entertainer-ranking-policy.md` still requires formal CEO or General Manager approval. The prototype shows rank where operationally useful but does not invent authority or thresholds.

Run it with `npm install` and `npm run dev`. The browser-local service is a UI prototype only; the team-member selector is a review aid rather than identity switching. Production writes still require server-side Frappe authorization, ownership validation, idempotency, audit, and notification handling.

## Relationship to Frappe

This PWA will consume approved Frappe/ERPNext APIs from the VIP Club custom app. Framework, build tooling, and deployment details are intentionally pending the repository and VPS audit.
