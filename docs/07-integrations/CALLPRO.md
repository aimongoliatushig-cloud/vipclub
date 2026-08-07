---
type: integration-specification
status: discovery-required
last_reviewed: 2026-08-07
---

# CallPro Integration

## Purpose

Integrate verified CallPro call-center facts with ERPNext/Frappe customer lookup, call classification, reservation, blocking, and operator reporting.

This specification defines required business capabilities without inventing CallPro endpoint paths or payload schemas.

## Provider facts to retrieve or associate

Only where supported by verified CallPro documentation:

- incoming calls;
- answered and missed/unanswered outcome;
- caller phone number or provider identity;
- start, answer, and end timestamps;
- operator/queue handling metadata;
- call duration;
- provider call/reference ID;
- other useful provider metadata;
- event retrieval/delivery and reconciliation status.

## ERP-side responsibilities

CallPro is not assumed to provide semantic business purpose. ERPNext/Frappe provides:

- normalized phone/customer identity matching;
- limited customer lookup and minimum customer creation;
- call-purpose classification;
- optional operator note;
- call-to-reservation association;
- prank/abusive/block decision and history;
- operator and management reporting;
- branch, customer, reservation, and audit links.

## Call purpose

Initial configurable categories:

- reservation/booking;
- general inquiry;
- address/location inquiry;
- menu/service inquiry;
- entertainer availability inquiry;
- prank/abusive call;
- other.

Routine reservations do not require unnecessary commentary. Other allows optional free text under policy.

## Customer and reservation flow

~~~text
Call event
→ Normalize caller identity
→ Match customer or create minimum record
→ Show permission-limited VIP/service context
→ Classify purpose
→ Check configured branch and current-shift entertainer availability when needed
→ Create reservation with customer, branch, time, guest count, and relevant note
→ Link call and reservation
~~~

The initial business has four branches, but branch selection uses configured branch records rather than a hard-coded list.

## Prank/abusive and blocking controls

A permitted operator may mark a call/number as prank, abusive, or blocked according to policy. Store actor, reason, evidence/reference, start/end, status, reviewer where required, and unblock history.

Blocking must not silently delete call or customer history. Access to full caller identity remains permission-controlled.

## Reporting

Authorized reporting supports:

- total calls by day/night and date range;
- answered versus unanswered;
- calls handled per operator;
- call answer rate;
- reservation conversion;
- call-purpose distribution;
- prank/abusive/blocked calls;
- drill-down to authorized call, customer, and reservation evidence.

## Reliability and security

- Use idempotent provider-event handling.
- Store provider reference and correlation ID.
- Separate raw provider facts from operator classification.
- Mask phone data in views and logs where full value is unnecessary.
- Record import/webhook failures, retry, reconciliation, and last success.
- Do not expose secrets in Markdown, logs, or business records.

## Provider discovery

**TBD — Business configuration required:**

- official CallPro API documentation and product/version;
- authentication and credential rotation;
- exact endpoint/event coverage and fields;
- webhook versus polling behavior and signature verification;
- history retrieval, pagination, and missed-event recovery;
- rate limits, retry semantics, and outage behavior;
- call recording/audio availability and whether it is in scope;
- sandbox/test account;
- retention, consent, privacy, and data-processing rules;
- blocking API availability versus ERP-only block list;
- technical and provider support owners.

## Related documents

- [Integration Catalog](INTEGRATION_CATALOG.md)
- [API Architecture](../02-architecture/API_ARCHITECTURE.md)
- [Functional Requirements](../functional-requirements.md)
- [Role Permission Matrix](../03-roles/ROLE_PERMISSION_MATRIX.md)
