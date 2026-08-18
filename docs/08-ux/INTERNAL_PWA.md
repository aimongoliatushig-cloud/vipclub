---
type: ux-specification
status: approved-direction
last_reviewed: 2026-08-16
---

# Internal PWA — Customer 360 Information Architecture

## Purpose

Define the role-aware Customer 360 navigation, screens, drill-down behavior, and UI acceptance rules for CEO and branch managers.

## Mandatory layout decision

The existing CRM master-detail layout—customer directory on the left and a selected-customer summary on the right—must not be retained or incrementally extended.

Preserve reusable brand tokens, typography, accessible components, navigation patterns, and Mongolian-first wording where useful. Replace the CRM page structure with an intelligence-dashboard-first information architecture.

The landing page answers **what is happening**. Insight details explain **why**. Filtered lists show **who is involved**. Customer 360 shows **complete evidence and available action**.

## Primary destinations

1. Customer Intelligence Dashboard
2. Insight Detail
3. Customer Explorer
4. Membership Recommendations
5. Customer Segments
6. Campaigns and Communications
7. Benefits and Cashback
8. Data Quality
9. Membership Policy Settings
10. Individual Customer 360 Profile

Suggested routes, adapted to repository conventions:

- `/crm`
- `/crm/insights/[insight-type]`
- `/crm/customers`
- `/crm/customers/[customer-id]`
- `/crm/recommendations`
- `/crm/segments`
- `/crm/campaigns`
- `/crm/loyalty`
- `/crm/data-quality`
- `/crm/settings/membership`

## Required navigation journeys

- Dashboard → Insight Detail → Filtered Customer Explorer → Customer 360 → Source visit/bill/evaluation
- Dashboard → Recommendation Queue → Recommendation Detail → Customer 360
- Dashboard → Data Quality Insight → Reconciliation Queue → Customer 360
- Any visible customer name → the canonical full-page Customer 360 Profile

Preserve filter, date, branch, and comparison context through drill-down. Provide breadcrumbs and reliable back navigation. No dashboard element may end at a placeholder or dead link.

## CRM landing dashboard

The first CRM page is an intelligence dashboard, not a customer directory. It must not contain the old left-list/right-detail composition or a large primary customer table.

### Header controls

- Company or branch scope
- Permission-aware branch selector
- Date range
- Comparison period
- Data freshness and last successful synchronization
- Search
- Permission-controlled export

### Management attention queue

Show urgent, clickable items near the top:

- Membership decisions awaiting approval
- Repeated or urgent downgrade recommendations
- High-value customers becoming at risk
- VIP customers outside their normal visit interval
- Expiring benefits
- Identity-resolution work
- POS/CRM synchronization or data-quality failures

### Key insight cards

Use a limited set of decision-relevant cards. Each contains value, comparison, direction, short explanation, freshness, and a drill-down target.

Recommended cards:

- Total customers
- Active customers
- Returning-customer rate
- Returning-customer revenue
- Average expenditure per visit
- At-risk high-value customers
- Pending membership decisions
- Identified-customer revenue rate

### Visualizations and insight lists

Support customer growth, new versus returning, membership distribution and movement, retention, average expenditure per visit, branch comparison, campaign outcomes, and at-risk value.

Charts are interactive evidence navigation, not decoration. A meaningful card, chart segment, point, legend, alert, or customer row must open the related filtered detail.

## Role-aware landing state

### CEO

Default scope is all four branches: Nomad, Sapphire, Neva, and Monarch. Show company totals, four-branch comparison, customer growth, returning revenue, retention, membership movement, pending/overdue decisions, at-risk high-value customers, cross-branch behavior, benefits/cashback exposure, campaign outcomes, identified-customer revenue, and integration health.

Support Company → Branch → Segment → Customer drill-down.

### Branch manager

Default and maximum customer-data scope is the authorized branch. Show local customer growth, returning customers, dormancy/risk, average expenditure per visit, membership distribution, pending/repeated recommendations, upcoming VIP reservations, expiring benefits, unused cashback, campaign outcomes, incomplete identities, and data freshness.

## Insight Detail

Each detail screen includes:

- Insight name and human-readable definition
- Current branch/date/comparison filters
- Trend or distribution
- Contributing customer list
- Source totals and freshness
- Permission-controlled export
- Links to Customer 360 and authorized source records

Required insight families include growth, retention, risk, dormancy, returning revenue, average expenditure per visit, membership movement, branch comparison, campaigns, benefits/cashback, and data quality.

## Customer Explorer

The complete searchable customer list is a separate screen. Support server-side pagination, sorting, saved filters, branch/date filters, current and calculated levels, recommendation status/severity, customer status, last visit, visit count, average expenditure per visit, lifetime value, risk, and data quality.

Every customer name and row opens the canonical Customer 360 Profile. Do not trap full customer details in a side panel. A quick preview may exist only as an optional convenience.

## Canonical Customer 360 Profile

Use one full-page profile reachable from every dashboard, insight, recommendation, segment, campaign, and customer list.

Sections:

1. Profile summary
2. Management insights and recommended action
3. Unified chronological timeline
4. Visit and spending analytics
5. Membership calculation, recommendation, and decision history
6. Benefits and cashback
7. Consent and communications
8. Notes, tasks, complaints, reservations, transfers, and authorized actions
9. Source evidence and audit links

The profile shows current approved level separately from calculated level. Pending recommendations never appear as effective customer status.

## Membership Recommendations

Provide a dedicated queue with All Pending, Upgrades, Downgrades, Repeated, Kept Current, Review Later, Escalated, Recently Approved, and No Longer Applicable filters.

Each row shows customer, branch, current/calculated level, average expenditure per visit, threshold difference, consecutive count, first/latest evaluation dates, severity, prior decision, and pending age.

Customer name opens Customer 360. Recommendation opens its full calculation, source, and decision history.

## UX states and concurrency

Every major screen implements loading, empty, no result, denied, partial, stale, integration unavailable, calculation pending, recommendation pending, decision processing, success, validation error, retry-safe failure, and superseded/stale-decision conflict.

If a newer evaluation supersedes an open recommendation, block approval of the stale view and reload the current state.

## Design-before-code deliverables

Before implementation, create and review:

1. CRM sitemap
2. Role-based dashboard content map
3. Dashboard-to-detail navigation map
4. Low-fidelity wireframes for primary screens
5. Reusable component inventory
6. API/data dependency map for every dashboard component
7. State matrix
8. Permission map

## UX acceptance criteria

- CEO or manager understands the most important customer situation without opening the customer directory.
- Every actionable insight reaches a filtered evidence view.
- Every displayed customer name reaches the same canonical Customer 360 Profile.
- Branch/date/comparison context survives drill-down and back navigation.
- No old master-detail CRM layout remains.
- No decorative dashboard card or chart lacks a defined drill-down action.
- No required detail screen is a placeholder.
- Mongolian wording, privacy masking, responsive behavior, keyboard access, and accessible states are verified.

## Related documents

- [CRM and loyalty requirements](../crm-and-loyalty-requirements.md)
- [Dashboard catalog](../09-analytics/DASHBOARD_CATALOG.md)
- [Development guide](../development-guide.md)
- [Requirements traceability](../01-governance/REQUIREMENTS_TRACEABILITY.md)
