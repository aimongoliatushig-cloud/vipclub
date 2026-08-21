---
type: permissions
status: selected-baseline
last_reviewed: 2026-08-07
---

# Field Masking and Data Visibility

## Purpose

Define customer-visible, staff-visible, internal-only, and tightly audited fields. Backend serializers, reports, exports, realtime events, and AI tools must apply the same policy.

## Entertainer profile classes

| Class | Example fields | Visibility |
| --- | --- | --- |
| Customer-visible | Approved photo, display identity, nationality, languages, short introduction, approved talents, current public rank, approved availability, approved extra-service capability and customer price | Customer Assistant and authorized staff |
| Staff/service-visible | Operational availability reason/state, schedule needed for service, branch/team, approved matching tags, request status | Only staff roles that need the field |
| Internal sensitive | Height, weight, chest, waist/belly, hip, body type, internal distinguishing attributes, verified incidents, disciplinary records, confidential feedback/KPI evidence | Authorized management/HR or approved matching services only |
| Private/financial | Personal contact details, bank information, contracts, income, deductions, loans, confidential scores | Owner and explicitly authorized HR/accounting/management roles |

Internal matching or recommendation may use authorized internal fields without returning them to the customer client or model response.

## Customer data classes

| Role/context | Visible data | Masking/restriction |
| --- | --- | --- |
| Customer | Own authorized profile, membership, points, privileges, reservations, feedback, and room session | Never another customer/session |
| Call Operator | Normalized lookup result, service name/identifier, VIP indicator, reservation-relevant data | No unrestricted CRM history; caller number masked where full value is unnecessary |
| Receptionist | Registration, consent, reservation, check-in, room/session, approved service preferences | No unrelated financial/marketing export |
| Bartender/Floor Operations | Today's service customer/group, membership level, favorite entertainer/drink where approved, room/session | Full phone generally hidden; use last four digits or approved partial identifier |
| Branch Manager | Authorized branch service history, feedback, exceptions, and operational customer information | Sensitive contact/export limited by policy |
| CEO | Authorized cross-branch executive/audit data | Purpose and audit controls still apply |

Phone masking format is **TBD — Business configuration required**. It must be configurable and consistent across UI, reports, logs, exports, and realtime payloads.

## Membership discretion

Customer Assistant theming may indicate tier through subtle approved visual cues. Do not conspicuously reveal a high-status tier to companions. Authorized staff may see the exact membership status where needed for service.

## Anonymous employee feedback

Recipient-anonymous feedback hides the sender from the normal recipient interface. The sender remains technically traceable for tightly permissioned CEO/audit authorities.

Every reveal of the true identity records viewer, time, submission, purpose/reason, and result. Product wording must not promise absolute anonymity.

## AI and API rules

- AI assistants receive only fields already authorized for the acting user and task.
- Prompting cannot expand role or field access.
- Customer-facing APIs use explicit allowlists rather than serializing internal entertainer/customer records.
- Realtime events contain the minimum fields needed by the subscribed authorized workspace.
- Logs must avoid unmasked phone, measurements, private feedback identity, and financial data unless operationally necessary and protected.
- Exports apply the same field policy as interactive screens.

## Open decisions

- Final public entertainer attributes and staff-visible matching fields.
- Who may view body measurements, incidents, confidential KPI evidence, and feedback details.
- Approved phone and identity masking pattern.
- Customer room/session authentication and companion-discretion design.
- Anonymous sender identity authority, disclosure wording, and retention.
- Export and log-redaction rules.

## Related documents

- [Role Permission Matrix](ROLE_PERMISSION_MATRIX.md)
- [Functional Requirements](../functional-requirements.md)
- [Customer PWA](../08-ux/CUSTOMER_PWA.md)
