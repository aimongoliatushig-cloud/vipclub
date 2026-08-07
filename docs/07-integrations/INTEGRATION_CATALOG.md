---
type: integration-catalog
status: active
last_reviewed: 2026-08-07
---

# Integration Catalog

## Purpose

List source systems, ownership, direction, authentication discovery, reconciliation, and documentation status.

| Integration | Business purpose | Direction | Source of truth | Status/document |
| --- | --- | --- | --- | --- |
| POS | Transactions, bills, items, refunds, eligible spend, settlement evidence, and check-in/bill reconciliation | Primarily POS → ERP; controlled redemption/reference responses | POS for verified transaction facts; ERP for domain decisions | [POS](POS.md) |
| CallPro | Incoming/answered/missed calls, operator facts, customer lookup context, call classification, and reservation conversion | CallPro → ERP plus ERP-side classification/association | CallPro for provider facts; ERP for purpose, customer, block, and reservation | [CallPro](CALLPRO.md) |
| Attendance | Check-in/out and attendance evidence | Attendance system → ERP with correction workflow | Approved attendance source plus ERP adjustments | [Attendance](ATTENDANCE.md) |
| Bank | Approved payment initiation/evidence and reconciliation | Controlled bidirectional | Bank for transaction result; ERP for approved business payment | [Bank](BANK.md) |
| E-Barimt | Tax/receipt evidence | Controlled bidirectional | Provider/authority response plus ERP source transaction | [E-Barimt](EBARIMT.md) |
| Messaging providers | Consented customer campaign and delivery state | ERP → provider; status → ERP | ERP for consent/audience; provider for delivery facts | Provider **TBD** |

## Shared controls

- Credential and secret management outside business records.
- Least-privilege service identity and environment separation.
- Idempotency, correlation IDs, retries, dead-letter or failed-event review, and replay where safe.
- Source references, import/delivery timestamps, status, and reconciliation evidence.
- Versioned mappings and effective dates.
- Monitoring, alerting, retention, and incident ownership.
- Sandbox/test mode before production.
- No invented endpoint paths or payloads before provider documentation is verified.

## Open decisions

- Technical owner and business owner for each integration.
- Provider/API availability, credentials, sandbox, authentication, rate limits, retention, and support contacts.
- Reconciliation frequency, tolerance, exception authority, and recovery targets.
- PII/data-processing terms for phone, customer, employee, and payment data.
