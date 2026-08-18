---
type: analytics-specification
status: approved-direction
last_reviewed: 2026-08-18
---

# Dashboard Catalog

## Customer Intelligence Dashboard

The CRM landing page is an intelligence dashboard. It is not the Customer Explorer and must not reproduce the previous list-left/detail-right layout.

### Shared metrics

- Total, new, active, returning, at-risk, dormant, and reactivated customers
- Customer-base growth
- Returning-customer rate and revenue
- Average expenditure per visit
- Lifetime customer value
- Membership distribution and movement
- Pending, repeated, kept-current, overdue, and escalated membership recommendations
- Cashback liability and benefit usage/cost
- Campaign-attributed reservations, visits, and revenue
- Identified-customer revenue percentage
- Data freshness and integration health

Each metric must define formula, grain, source, reconciliation state, date semantics, permitted roles, comparison logic, and drill-down destination before implementation.

### CEO view

Company-wide scope across Nomad, Sapphire, Neva, and Monarch with branch comparison and Company → Branch → Segment → Customer drill-down.

### Branch manager view

Authorized branch only, emphasizing management attention, retention, membership decisions, VIP reservations, expiring value, campaign outcomes, identity gaps, and local data quality.

## Drill-down contract

Every dashboard KPI, chart element, alert, and customer item must define:

- Target screen
- Applied filters
- Preserved branch/date/comparison context
- Underlying record population
- Empty and permission-denied behavior
- Link from customer names to the canonical Customer 360 Profile

Required detail families:

- Growth
- Retention
- Risk and dormancy
- Returning revenue
- Average expenditure per visit
- Membership distribution and movement
- Membership recommendation queue
- Branch comparison
- Campaign outcomes
- Benefits and cashback
- Customer identity and data quality

## Performance and trust

- Aggregate server-side at the correct grain.
- Do not calculate authoritative financial totals in the browser.
- Display data freshness and partial/reconciliation warnings.
- Paginate underlying records.
- Use traceable KPI snapshots or reproducible queries.
- Restrict export and sensitive drill-down server-side.

## Related documents

- [Internal PWA Customer 360 architecture](../08-ux/INTERNAL_PWA.md)
- [CRM and loyalty requirements](../crm-and-loyalty-requirements.md)
- [KPI dictionary](KPI_DICTIONARY.md)
