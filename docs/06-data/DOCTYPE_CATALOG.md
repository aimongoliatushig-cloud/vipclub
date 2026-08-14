---
type: data-catalog
status: verified
last_reviewed: 2026-08-13
---

# DocType Catalog

## Purpose

Map ERPNext and custom Frappe records to business purpose and implementation ownership.

## Core ERPNext/HRMS records

| DocType | Business ownership/use | Production note |
| --- | --- | --- |
| Branch | Authoritative branch identity | 4 records; used by Employee and branch-scoped VIP records. |
| Employee | Staff identity, user and branch link | 247 records, 236 active; 26 active employees have linked users. |
| User / Has Role | Authentication and coarse role | 4 Branch Managers; CEO role exists but has no user. |
| Shift Type / Shift Assignment | Shift template and dated assignment | 15 assignments at audit time; custom schedule API manages branch entertainers. |
| Employee Checkin | Authoritative IN/OUT evidence | 12 records at audit time; fed by QR attendance flow. |
| Attendance | HRMS attendance result | No records at audit time; current custom manager logic derives operational state from shifts/check-ins. |
| Leave Application | General HRMS leave workflow | No records at audit time; retain for standard/multi-day leave policy. |
| Customer / Contact | Customer master and contact identity | 611 Customers and 34 Contacts. Phone fields include Finex synchronized values. |
| Sales Invoice / Sales Order | ERPNext accounting/sales documents | Small current dataset (5 each); not yet the main Finex actual-sales source. |

## `nomad_vip` custom records

| DocType | Purpose | Audit-time count |
| --- | --- | ---: |
| VIP Entertainer Profile | Active entertainer identity, branch, human rank and points | 25 |
| VIP Entertainer Branch Assignment | Effective branch assignment history | 25 |
| VIP Availability Event | Immutable work availability/day-state event | 4 |
| VIP Emergency Leave Request | Night-shift emergency day-off request and manager decision | 1 |
| VIP Attendance Scan | QR/geolocation scan evidence | 3 |
| VIP Attendance Correction Request | Employee correction request and manager decision | 1 |
| VIP Attendance Policy | Singleton thresholds and penalty policy | Singleton |
| VIP Attendance Penalty | Late/absence assessment and review trail | 0 |
| VIP Branch Attendance QR | Per-branch QR/location configuration | 4 |
| VIP Daily Readiness Check | Supervisor readiness decision | 0 |
| VIP Performance Event / VIP Point Ledger | Verified performance evidence and immutable point posting | 1 / 1 |
| VIP Ranking Policy / VIP Rank Definition / VIP Rank History | Effective ranking policy, rank catalog and human decisions | 1 / 4 / 1 |
| VIP Customer Branch Profile | Branch-specific rank, visits, bill count, total and average spend | 2,432 |
| VIP Customer Rank Rule | Branch membership thresholds | 20 |
| VIP Customer Point Ledger | Customer cashback/point ledger | 79 |
| VIP POS Bill | Imported Finex POS sale and component evidence | 2,539 |
| VIP Customer Entry Event | Reception/door visit event | 10 |
| VIP Phone Reservation / VIP Reservation | Phone and entertainer reservation workflows | 4 / 1 |
| VIP API Audit Event | Security/audit record for custom API actions | 36 |

## VIP Branch Sales Goal

The authoritative goal record was added to `nomad_vip` and migrated to `bat116-test.local` and `nomad.local` on 2026-08-13. It replaces browser storage as the production source of truth once the PWA adapter is activated.

Fields include branch, goal month, state, version, proposed and approved target, actual-sales source, baseline period/amount, manager rationale/action JSON, submission and decision evidence, and effective dates. The API enforces one record per branch/month, manager-derived branch scope, CEO/System Manager activation, stale-write protection, idempotency replay, and append-only API audit. Actual progress is calculated from paid Finex `VIP POS Bill` evidence and is not accepted from the browser.

## Related documents

- [Knowledge-base gap analysis](../../knowledge-base-gap-analysis.md)
- [Stakeholder clarification register](../../stakeholder-clarification-register.md)
