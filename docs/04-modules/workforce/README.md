---
type: module
status: selected-baseline
last_reviewed: 2026-08-07
---

# Workforce Module

## Purpose

Own employee and entertainer identity, role/branch assignment, schedule, attendance, internal entertainer profile, operational availability, incident evidence, ranking inputs, and personnel lifecycle.

## Entertainer profile boundary

- Structured internal measurements and configurable traits/talents belong to the internal service profile.
- Public profile fields are explicitly approved and serialized separately.
- Body measurements, private contacts, incidents, financials, and confidential KPI evidence are never customer-visible.
- Operational availability and customer visibility are separate effective states.

## Ranking boundary

The module supplies verified sales/performance, attendance/reliability, repeat-customer loyalty, and reviewed incident evidence. The ranking domain creates an explainable recommendation; an authorized human decides the rank.

New entertainers start at Gold under the latest client direction.

## Personal assistant

The Entertainer assistant may explain the acting entertainer's own authorized schedule, attendance, incidents visible under policy, feedback, KPI evidence, rank, income, loans, and requests. It cannot access another entertainer's private records.

## Policy boundaries

**TBD — Business configuration required:** public fields, internal matching fields, ranking weights/thresholds, work-night expectation, Diamond conditions, incident authority, availability transitions, and final rank approver.

## Related documents

- [Functional Requirements](../../functional-requirements.md)
- [Entertainer Ranking Policy](../../entertainer-ranking-policy.md)
- [Field Masking](../../03-roles/FIELD_MASKING.md)
- [Data and Domain Model](../../data-model.md)
