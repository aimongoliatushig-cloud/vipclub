---
type: module
status: selected-baseline
last_reviewed: 2026-08-07
---

# Customers Module

## Purpose

Own customer identity, normalized phone matching, minimum registration, consent, preferences, visits, service history, membership links, room/session context, and feedback.

## Service entry points

- Call Operator uses masked phone lookup and may create a minimum customer before attaching a reservation.
- Reception uses customer lookup/create, consent, reservation, check-in, room/session, and drop-off.
- Customer Assistant uses own authenticated or scoped room-session context.
- Bartender/floor operations sees only today's service-required data and a masked identifier.
- Managers and CEO receive branch or company reporting within permission scope.

## Feedback

Customers may submit compliments, complaints/criticism, and improvement suggestions, optionally referencing an entertainer. Compliments may become performance evidence. Complaints require management review and do not automatically create an incident, penalty, or KPI deduction.

## Privacy

Customer data, phone, membership, preferences, and service history follow field masking, consent, purpose limitation, and backend authorization. A room QR cannot expose another room or customer session.

## Related documents

- [Functional Requirements](../../functional-requirements.md)
- [CRM and Loyalty Requirements](../../crm-and-loyalty-requirements.md)
- [Customer PWA](../../08-ux/CUSTOMER_PWA.md)
- [Role Permission Matrix](../../03-roles/ROLE_PERMISSION_MATRIX.md)
