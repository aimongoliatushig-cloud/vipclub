---
type: module
status: selected-baseline
last_reviewed: 2026-08-07
---

# Reservations and Real-Time Service Module

## Purpose

Own reservation, room inventory, arrival/check-in, customer session, entertainer availability/request, drop-off, bill reconciliation, and operational exceptions.

## Entry channels

Reservations may originate from Reception, Call Operator, approved customer self-service, or authorized management. All use the same reservation record and configured branch catalog.

## Visit lifecycle

~~~text
Reservation → Check-in → Room/Customer Session
→ Service → Bill → Reconciled
or
→ Drop-off reason → Reconciled
or
→ Missing outcome → Reconciliation Exception
~~~

Reservation, arrival, service, drop-off, and billing are distinct evidence.

## Entertainer requests

- Operational availability and customer visibility are separate.
- A room/session may request only an eligible visible entertainer.
- Request, acknowledgement, arrival, completion, outcome, and escalation timestamps are retained.
- The working response target is approximately two minutes and is not an automatic penalty.
- Unresolved requests appear in entertainer, resting-area, and manager/bartender channels as configured.

## Operations workstation

One consolidated branch screen shows rooms, occupancy, reservations, active sessions, entertainer availability/requests, aging requests, and reconciliation exceptions.

## Open decisions

**TBD — Business configuration required:** room/QR/session identity, exact request states and SLA, escalation, drop-off taxonomy, bill matching, reconciliation authority, capacity rules, and customer self-service scope.

## Related documents

- [Business Process Catalog](../../business-processes.md)
- [State Catalog](../../06-data/STATE_CATALOG.md)
- [Customer PWA](../../08-ux/CUSTOMER_PWA.md)
- [API Architecture](../../02-architecture/API_ARCHITECTURE.md)
