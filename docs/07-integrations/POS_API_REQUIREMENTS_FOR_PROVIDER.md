# POS Integration API Requirements for Third-Party Provider

## Purpose

VIP Club needs a secure integration with the third-party point-of-sale system to import verified customer, visit, reservation, entertainer, bill, room, and item data. This data supports customer history, reservations, entertainer attribution, settlement calculation, membership evaluation, benefits, cashback, sales targets, and reporting.

This document is a request for the provider’s available API, webhook, export, authentication, sandbox, and reconciliation capabilities. Equivalent provider endpoints are acceptable.

## Required business data

### Branches

| Required field | Description |
| --- | --- |
| branch_id | Immutable POS branch identifier |
| branch_name | Human-readable branch name |
| timezone | Branch-local timezone |
| active | Whether the branch is active |

### Customers

| Required field | Description |
| --- | --- |
| customer_id | Immutable POS customer identifier |
| phone | Normalized phone number, if collected |
| name | Customer name, if collected |
| created_at | POS customer creation time |
| updated_at | Last modification time |

### Visits and reservations

| Required field | Description |
| --- | --- |
| visit_id | Immutable visit identifier |
| reservation_id | Reservation identifier, when available |
| customer_id | POS customer identifier |
| branch_id | Branch identifier |
| room_id / room_name | Room, table, or service area |
| started_at | Visit or reservation start time |
| ended_at | Visit end/completion time |
| status | Requested, confirmed, arrived, completed, cancelled, no-show, or provider equivalent |
| source | Reception, online, phone, walk-in, or provider equivalent |
| entertainer_allocations | Associated entertainer(s) and attribution where available |
| updated_at | Last modification time |

### Entertainer attribution

| Required field | Description |
| --- | --- |
| entertainer_id | Immutable provider identifier |
| entertainer_name | Display name, when available |
| employee_id | Internal employee identifier, if available |
| attribution_type | Reservation, service, commission, tip, referral, or provider equivalent |
| allocation_amount / allocation_percent | Amount or percentage attributed |
| linked_visit_id / bill_id | Related source record |

### Bills, payments, and refunds

| Required field | Description |
| --- | --- |
| bill_id | Immutable bill or invoice identifier |
| bill_number | Human-readable receipt or invoice number |
| branch_id | Branch identifier |
| customer_id | Customer identifier, when available |
| visit_id / reservation_id | Related visit or reservation |
| opened_at / closed_at | Bill opening and final closure time |
| status | Open, paid, voided, refunded, corrected, or provider equivalent |
| currency | ISO currency code |
| gross_amount / discount_amount | Amount before discounts and total discounts |
| service_charge / tax_amount | Service charge and tax, if applicable |
| net_amount | Final eligible paid amount |
| payment_methods | Cash, card, transfer, wallet, or provider equivalent |
| refunded_amount | Refunded amount |
| updated_at | Last modification time |

### Bill items

| Required field | Description |
| --- | --- |
| bill_item_id / bill_id | Immutable line identifier and parent bill |
| item_id / item_name / category | Product or service identity |
| quantity / unit_price | Quantity and price |
| discount_amount / net_amount | Final line amounts |
| entertainer_id | Attributed entertainer, if applicable |
| room_id / room_name | Related room, if available |

## Required integration capabilities

### Historical import

The provider must support retrieval of historical records by branch and date range, including prior years of monthly sales.

### Incremental synchronization

The provider must support REST filtering by last-update time or cursor, webhooks for created/updated/completed/voided/refunded records, or ideally both.

### Suggested API capabilities

| Capability | Suggested request pattern |
| --- | --- |
| Branch list | GET /branches |
| Customers changed since a time | GET /customers?updated_since=timestamp |
| Visits changed since a time | GET /visits?updated_since=timestamp |
| Reservations changed since a time | GET /reservations?updated_since=timestamp |
| Bills changed since a time | GET /bills?updated_since=timestamp |
| Bill items | GET /bills/{bill_id}/items |
| Entertainer list | GET /entertainers?updated_since=timestamp |
| Historical sales export | GET /sales?branch_id=value&from=date&to=date |
| Webhook registration | Provider-specific subscription mechanism |

## Technical requirements

- Secure HTTPS/TLS and documented server-to-server authentication.
- Sandbox or test account before production access.
- Stable immutable IDs, pagination, rate limits, timestamps with timezone, and last-updated cursor.
- Explicit void, refund, correction, and partial-payment records.
- Error codes, retry guidance, availability expectations, signed webhooks, and webhook replay where available.
- No payment-card data or unnecessary sensitive data.

## Data quality and reconciliation

VIP Club will reconcile imported totals against approved POS reports by branch and period. The provider should support daily/monthly totals, final bills and refunds, receipt numbers, correction status, re-fetch by source identifier, and identification of delayed or corrected records.

## Acceptance test

Before production launch, provide a sandbox or controlled sample with:

1. A customer, completed visit, and reservation.
2. A bill with items, discounts/tax/service charge, room, and entertainer attribution.
3. A refund or void.
4. An updated record delivered through incremental synchronization.
5. Branch-level monthly totals that reconcile to detailed bills.

## Provider response checklist

Please return API documentation and base URL, authentication process, sandbox details, endpoints or exports, webhooks, data dictionary and samples, rate limits, historical availability, data availability by entity, refund/void handling, support contact, and integration timeline.
