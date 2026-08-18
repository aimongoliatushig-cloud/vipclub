---
type: architecture
status: selected-baseline
last_reviewed: 2026-08-18
---

# API Architecture

## Purpose

Define permission-checked service boundaries, authentication, versioning, idempotency, realtime events, external adapters, and error/reconciliation contracts.

## Principles

- Frappe backend services are authoritative; clients and AI tools never submit trusted totals or bypass workflow.
- Every command enforces user, role, branch, ownership, action, and field permissions.
- Public/customer APIs use explicit response allowlists.
- High-impact commands record policy version, source evidence, actor, reason, approval state, and correlation ID.
- External imports and client retries use idempotency keys.
- Corrections use reversal/adjustment commands, not silent record mutation.
- API and realtime payloads avoid sensitive fields unless explicitly authorized.

## Service boundaries

| Service | Responsibilities |
| --- | --- |
| Identity and Access | Authentication, session/device policy, roles, branches, field scope, room/session authorization |
| Customer and Consent | Lookup, minimum creation, identity matching, consent, preferences, public/service serializers |
| Calls | CallPro normalization, call purpose, customer association, block decisions, reporting facts |
| Reservations and Rooms | Reservation, room inventory, check-in, customer session, drop-off, bill reconciliation |
| Entertainer Operations | Profile visibility, schedule, operational availability, customer visibility, service requests, extra capabilities |
| Ranking and Incidents | Evidence, recommendation, human decision, incident review, appeal, public rank serializer |
| Income and Settlement | Compensation policy, income events, deductions, three-day statement, loans, payment evidence |
| Goals, KPI, and Tasks | CEO target, manager plan, ERPNext Project/Task commands, progress, KPI, reward/penalty review |
| Messaging and Feedback | Direct messages, upward feedback, customer feedback, recipient anonymity, audited identity reveal |
| Reporting | Permission-filtered aggregates and drill-down evidence |
| AI Tool Gateway | Allowlisted role-context tools that call the same domain services as normal clients |

## CallPro adapter contract

Do not invent endpoint paths or payload schemas. The adapter specification remains provider-dependent.

Expected normalized facts, only where the provider supports them:

- provider call/reference ID;
- direction and answered/missed outcome;
- caller phone number or provider identity;
- start, answer, and end times;
- operator/queue metadata;
- duration;
- raw event/reference metadata;
- delivery/retrieval time and reconciliation state.

ERP-side data includes call purpose, optional note, customer association, reservation, prank/abusive/block decision, and audit history.

**TBD — Business configuration required:** CallPro authentication, exact fields, webhooks versus polling, history API, pagination, rate limits, retry semantics, signature verification, sandbox, retention, and data-processing terms.

## Customer and room-session authorization

- Customer accounts access only their own records.
- A room QR establishes a short-lived, scoped branch/room/customer-session context.
- A QR/session token cannot enumerate another room or customer.
- Customer Assistant endpoints return only approved public entertainer fields and customer-visible availability.
- Membership theming must not reveal a high-status customer conspicuously to companions.

## Realtime events

Use Frappe realtime/websocket/event mechanisms already selected by the architecture.

Event families may include:

- room occupancy changed;
- customer checked in or session outcome changed;
- reservation changed;
- entertainer operational availability changed;
- entertainer customer visibility changed;
- entertainer request created or status changed;
- reconciliation exception created/resolved;
- task or approval changed.

Events carry entity ID, authorized status, relevant timestamps, branch scope, and correlation ID. Clients refresh authoritative details when required.

## AI tool authorization

CEO, Manager, and Entertainer assistants receive separate allowlisted tools. Every tool call executes as the acting authenticated user through domain services.

AI may draft or request records; it cannot approve its own target, plan, rank, deduction, reward, termination, policy, or payment.

## Error contract

Errors should distinguish:

- validation or missing business input;
- permission denied;
- stale/version conflict;
- duplicate/idempotent replay;
- unavailable external provider;
- reconciliation required;
- required business configuration is not completed.

Do not expose secrets, private fields, or raw stack traces to end users.

## Observability and reconciliation

Record correlation IDs across CallPro, POS, reservation, customer session, point, request, settlement, and payment flows. Track delivery state, retries, last error, source reference, and reconciliation outcome.

Reports must drill from aggregates to authorized source records.

## Open decisions

- API versioning and deprecation policy.
- Authentication/session/device standards.
- Room QR token lifetime and binding.
- Realtime subscription authorization and reconnect behavior.
- Provider-specific CallPro and POS contracts.
- Error codes, rate limits, and data-retention policy.
- AI tool allowlists per role.
