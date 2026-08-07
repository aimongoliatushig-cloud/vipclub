---
type: ux-requirements
status: selected-baseline
last_reviewed: 2026-08-07
---

# Customer Assistant PWA

## Purpose

Extend the existing Customer Assistant web application. Do not design a redundant second customer app.

The PWA supports approved customer registration, consent, one membership status, points, branch privileges, reservations, room-QR context, public entertainer profiles, realtime availability and requests, extra-service display, and feedback.

## Access contexts

- **Authenticated customer:** own membership, points, privileges, reservations, communications, and feedback.
- **Room QR session:** short-lived branch/room/customer-session access to current service features.
- A room/session token must not expose another room, group, or customer.

## Membership experience

Show:

- one visible status across branches: Bronze, Silver, Gold, Diamond, or Black Diamond;
- one point balance and approved ledger history;
- branch-eligible privileges and quota usage;
- anniversary and approved retain/next-status progress;
- reservation and privilege terms.

Membership theming may use subtle tier-appropriate cues. Do not conspicuously reveal a high-status member to companions. Authorized staff may see the exact level where operationally necessary.

## Public entertainer profile

Customer-visible fields may include:

- approved photo and display identity;
- nationality/country;
- languages;
- short introduction;
- talents;
- current public Bronze/Silver/Gold/Diamond entertainer rank;
- approved realtime customer-visible availability;
- approved extra-service capability and customer price;
- other explicitly approved public attributes.

Never expose body measurements, private contacts, incidents/discipline, financials, confidential KPI calculations, or internal matching attributes.

## Realtime availability and request

Only entertainers who are both operationally available and approved for customer visibility are shown as requestable. Shift attendance alone is insufficient.

A room-aware customer may request an entertainer and receive simple status such as Requested, Confirmed, On the way, or Unavailable. The request enters the authoritative realtime service workflow.

The approximate two-minute response target is an operational measure, not an automatic punishment.

## Extra services or performances

Show only approved service types, entertainer eligibility, availability, and effective branch customer price. Do not expose internal margin or profit-sharing.

Official terminology, service categories, eligibility, payment flow, and revenue-share implications are **TBD — Business configuration required**.

## Feedback

Customers may submit:

- compliment;
- complaint/criticism;
- improvement suggestion/idea.

Feedback may optionally reference an entertainer. A compliment may become performance evidence. A complaint goes through management review and does not automatically create a penalty, KPI deduction, or verified incident.

## Point and redemption experience

- Do not present loyalty as a permanent POS discount.
- Show approved point/credit conversion and status.
- Require explicit authorized redemption confirmation.
- Show pending, completed, reversed, expired, and adjusted events.
- Do not expose unapproved example rates, thresholds, or quotas as final terms.

## Privacy and controls

- Customer communications require valid consent.
- Server-side policy and permission checks are authoritative.
- Public entertainer serialization uses an allowlist.
- Sensitive membership, spend, point, reservation, and feedback data requires authenticated or session-scoped access.
- Provide a review/help path for disputed status, transaction, redemption, privilege, request, or feedback handling.

## Open decisions

**TBD — Business configuration required:** room-QR token design, public profile fields, availability language, request states, extra-service term/payment, discreet tier theme, customer self-service scope, identity verification, notification channels, and feedback follow-up.

## Related documents

- [CRM and Loyalty Requirements](../crm-and-loyalty-requirements.md)
- [Reservations Module](../04-modules/reservations/README.md)
- [Customers Module](../04-modules/customers/README.md)
- [Field Masking](../03-roles/FIELD_MASKING.md)
- [API Architecture](../02-architecture/API_ARCHITECTURE.md)
