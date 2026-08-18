# Internal PWA

The internal VIP Club PWA serves employees and team members through one application with individual credentials and backend-enforced role, branch, ownership, action, and field scope.

## Role-aware capabilities

Features include tasks/projects, attendance, goals, manager KPI, settlements, CRM service work, Call Operator, Reception, consolidated branch operations, entertainer requests, messaging/feedback, maintenance, and role-scoped AI assistants.

CEO, Manager, and Entertainer assistants use separate allowlisted tool contexts. They call the same permission-checked Frappe services as ordinary UI actions and cannot approve consequential actions automatically.

## Intended structure

- `src/` — application routes, features, components, and service clients
- `src/features/` — role-aware business capabilities such as tasks, attendance, entertainer ranking, goals, payroll, CRM, and maintenance
- `src/shared/` — shared UI, permission-aware navigation, notifications, and API utilities
- `tests/` — unit, permission, integration, and user-journey tests
- `public/` — PWA manifest, icons, and static assets

## Security

The interface is never the only access control. Every API, realtime subscription, report, export, and AI tool is authorized server-side.

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

The attendance workspace also separates leave/day-off approvals from attendance decisions and monetary penalty review. Managers can approve or reject branch leave requests with a reason. Lateness and no-show evidence is visible, but monetary amounts remain explicitly uncalculated until CL-013 supplies an approved effective-dated policy.

Rank changes remain intentionally locked. The approved Rank 1/2/3 and 14-day baseline is visible; the Manager can now prepare and submit a recommendation, but the prototype does not invent an effective policy version or thresholds and does not grant CEO decision authority.

## Branch Manager customer and ranking prototype

The same Manager workspace now includes:

- a branch-only, masked customer intelligence view with search, membership/activity filters, visits, spend, entertainer affinity, consent indicators, verified benefit use, policy-version state, and source freshness;
- an explainable entertainer-ranking evidence view using current source rank plus separate attendance, no-show, reservation, repeat-customer, sales-trend, training, complaint, and history signals;
- a customer membership-evidence view that keeps the current source level separate from eligible expenditure per completed eligible visit;
- explicit policy locks for all unapproved membership and ranking calculations or overrides.

The Manager default page now starts with the manager's own active monthly branch sales goal, including CEO approval evidence, reconciled actual sales, achievement percentage, remaining amount, source state, and refresh time. The CRM list supports branch-scoped search by name or masked phone last four digits and ordering by membership level, total expenditure, average expenditure, and latest visit.

## Branch Manager task and goal-planning prototype

The Manager workspace also includes the documented P2 execution workflows:

- branch-only task creation for active team members;
- Assigned → Acknowledged → In progress → Submitted → Rework / Completed states;
- recorded PWA notification evidence, comments, execution result, image-evidence metadata, deadlines, overdue counts, and audit history;
- manager result review with a required approval note or rework instruction;
- a team-member flow preview for acknowledgement, start, and result submission without pretending to switch authenticated identity;
- Hermes monthly-goal recommendation evidence with baseline, formula, source summary, focus areas, and risks;
- manager-owned proposed target, rationale, action owners, due dates, and expected impact;
- draft save and submission to CEO review, with the submitted version locked in the Manager UI;
- an explicit permission boundary: the Manager cannot activate, approve, or reject a sales goal.

This browser prototype records notification intent but does not send Slack or other external messages. It stores image file metadata for workflow review rather than uploading production files. Final task governance remains subject to CL-020 and CL-021, and goal-cycle timing and role mapping remain subject to CL-024.

## Branch Manager operations and governance prototype

The remaining Manager-facing document requirements are represented through:

- a reservation queue with Requested → Confirmed → Arrived → Completed / Cancelled transitions and browser-safe masked identity;
- maintenance reporting, assignment, worker progress/evidence preview, manager verification, and rework;
- safe service complaint triage plus redacted HR-case handoff;
- a PWA notification center with read/escalation evidence and no false external-delivery claim;
- formal branch instructions with audience, due date, and acknowledgement progress;
- read-only CRM communication evidence plus a request-only handoff to the CRM/marketing owner;
- entertainer-rank and customer-membership recommendation submission with explicit CEO/CRM approval locks;
- Driver and Maintenance/technical roles in the workforce requirement editor and branch team directory.

These surfaces are intentionally role-correct: the Branch Manager does not gain HR investigation access, campaign sending, rank approval, membership-level editing, or CEO sales-goal approval. Reservation/POS integration, production notification delivery, HR case APIs, maintenance service-level policy, protected file storage, and stale-evidence decision controls remain production work.

See `docs/decisions/2026-08-13-manager-crm-ranking-prototype.md` for the source reconciliation, privacy boundary, and follow-up production functions.

Run it with `npm install` and `npm run dev`. Verify it with `npm test`, `npm run lint`, and `npm run build`; the current checkpoint has 101 automated tests. The browser-local service remains available for prototype review, while the production build uses the live Frappe data source. Team-member previews are review aids rather than identity switching. Production writes require server-side Frappe authorization, ownership validation, idempotency, audit, file handling, and notification delivery.

## Relationship to Frappe

The Hostinger production audit is complete. The target is `srv1871758.hstgr.cloud`, running Frappe 16.29, ERPNext 16.30, HRMS 16.15, and the `nomad_vip` custom app. The backend already exposes authenticated branch-scoped APIs for manager context, schedules, workforce state, attendance, leave approval, penalties, customer lookup/spend context, and rankings.

The backend and role-aware PWA connection are deployed at `https://srv1871758.hstgr.cloud/manager/`. `nomad_vip.api.management` provides the server-derived role/branch session, manager CRM, penalties, paid-POS sales progress, manager goal proposal/submission, CEO goal decision, and company dashboard backed by production NextERP/Frappe data. `src/services/frappeClient.ts` and `managementApi.ts` use the same-origin session and CSRF token; no API token is embedded in browser code. The four production Branch Manager identities passed the read-only scope smoke check. `Administrator`/System Manager can verify the CEO shell, but a normal production CEO user still needs to be selected and assigned the existing `CEO` role. See `docs/02-architecture/CURRENT_STATE.md`, `docs/02-architecture/ERPNEXT_FRAPPE_MAPPING.md`, and `docs/02-architecture/HOSTINGER_NEXTERP_INTEGRATION.md`.
