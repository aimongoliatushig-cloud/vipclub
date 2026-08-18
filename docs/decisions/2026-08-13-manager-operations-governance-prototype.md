# Manager Operations and Governance Prototype

## Status

Accepted for the browser-local Manager prototype on 2026-08-13. Production integrations and open policies listed below are not implied to be complete.

## Context

The Manager PWA already covered the default sales-goal view, CRM discovery, customer/team rankings, weekly scheduling, coverage, attendance, leave/day-off approval, penalty evidence, task execution, and monthly goal proposal. The remaining Manager-facing documents called for reservation support, maintenance closure, formal instruction acknowledgement, notifications/escalation evidence, safe complaint routing, and manager recommendations in governed rank/membership workflows.

Several neighboring capabilities belong to other roles. CRM/marketing owns segments and campaign sending. HR owns restricted people complaints. Technical/facilities workers execute maintenance. The CEO owns final entertainer-rank decisions and sales-goal activation. Customer membership changes require the authorized CRM/CEO policy workflow.

## Decision

1. Add an own-branch operations center for reservations, maintenance, and service feedback.
2. Keep HR-restricted complaint content redacted; the Branch Manager can only hand the case to HR and observe safe status metadata.
3. Add a Manager information center for internal PWA notifications, formal instruction acknowledgement, and read-only customer communication evidence.
4. Represent escalation as an internal audited record. Do not claim Slack, SMS, email, or other delivery without provider evidence.
5. Allow a Branch Manager to request CRM/marketing review of a segment or communication idea. Do not expose campaign send, consent override, customer export, or cross-branch data.
6. Allow the Manager to prepare and submit entertainer-rank and customer-membership recommendations while keeping the effective source value unchanged.
7. Preserve CEO/CRM decision authority and display policy locks when weights, thresholds, hard gates, branch ranges, or effective versions are unavailable.
8. Add Driver and Maintenance/technical roles to the workforce template and team directory. Their default minimum is zero until the branch configures an approved requirement.

## Prototype behavior

- Business state is persisted in browser local storage and resettable for tests.
- Reservation transitions validate their current state and store only a masked phone identifier.
- Maintenance work separates manager request/assignment/review from worker progress/result evidence.
- Notifications retain read and escalation timestamps; formal instructions retain recipient acknowledgement.
- Manager recommendations support Draft and Submitted states only from the Manager interface.
- All visible UI copy is Mongolian.

## Production work still required

- authenticated, field-projected, branch-scoped Frappe APIs;
- POS/reservation identity matching and reconciliation;
- notification provider delivery and approved escalation timing from CL-021;
- maintenance categories, urgency, approval rules, and service levels from CL-023;
- protected evidence files and retention/privacy policy;
- HR case-level authorization and anti-retaliation controls;
- consent-safe CRM campaign workflow owned by CRM/marketing;
- effective entertainer-rank and membership policy versions plus stale-evidence protection;
- idempotency, audit, observability, and integration failure/retry handling.

## Verification

Service tests cover branch guards, reservation lifecycle, maintenance verification, HR complaint redaction, acknowledgement/escalation evidence, CRM handoff limits, and recommendation submission without approval. Manager UI tests cover the new navigation and representative reservation, notification, and recommendation journeys.
