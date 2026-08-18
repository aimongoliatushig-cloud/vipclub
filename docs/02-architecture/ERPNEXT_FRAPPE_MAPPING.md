---
type: architecture
status: verified
last_reviewed: 2026-08-13
---

# ERPNext/Frappe Mapping

## Purpose

Map each requirement to ERPNext reuse, custom Frappe logic, integrations, and UI.

## Verified mapping

| Business capability | Production record/API | Status and rule |
| --- | --- | --- |
| Authenticated role and branch | Frappe User, Has Role, Employee.user_id, Employee.branch; `nomad_vip.api.workforce.get_context` | Ready. The server derives role and branch; the browser must not select or send an arbitrary authorized branch. |
| Manager overview and team state | VIP Entertainer Profile, Shift Assignment, Employee Checkin, VIP Availability Event; `get_manager_dashboard` | Ready for entertainer workforce. Manager sees only the linked Employee branch. |
| Weekly schedule | Shift Assignment and Shift Type; `get_manager_schedule`, `set_manager_schedule` | Ready. Writes include stale-version and idempotency/audit controls in the custom API. |
| Team availability | VIP Availability Event; `transition_availability`, `manager_override_availability` | Ready. Latest immutable event is authoritative. |
| Day-off/emergency leave | VIP Emergency Leave Request; `submit_emergency_leave`, `get_manager_leave_requests`, `decide_emergency_leave` | Ready for the current night-shift emergency-leave policy. HRMS Leave Application remains appropriate for broader multi-day/statutory leave. |
| Attendance and corrections | Employee Checkin, VIP Attendance Scan, VIP Attendance Correction Request; workday and attendance APIs | Ready. QR/geolocation and correction evidence are stored server-side. |
| Lateness/absence penalty | VIP Attendance Policy, VIP Attendance Penalty; `record_late_penalty`, `finalize_absences`, `decide_penalty`, `reverse_penalty` | Logic exists and is scheduled. A Branch Manager can read and decide/reverse only their own branch penalty proposals; every decision keeps the evidence, reason, concurrency guard, idempotency replay guard, and audit event. |
| Customer phone search | Customer plus branch profile; `lookup_customer_by_phone`, `get_customer_detail` | Ready for Branch Manager/Reception with server-derived branch scope. |
| Customer ranking and expenditure | VIP Customer Branch Profile, VIP Customer Rank Rule, VIP POS Bill; `nomad_vip.api.management.get_manager_customers` | Live. Name/phone search, rank, total spend, average bill, visit/bill count, masked phone, pagination and branch scope are enforced by the server. |
| Entertainer ranking | VIP Ranking Policy, VIP Rank Definition, VIP Rank History, VIP Performance Event, VIP Point Ledger; workforce/entertainer APIs | Ready for evidence and human rank decisions. Branch Manager may submit/override only where the backend policy explicitly permits it. |
| Branch sales actual | VIP POS Bill (Finex sync every 15 minutes); `get_branch_sales_progress` | Live. Paid Finex `VIP POS Bill` totals are the declared actual source for the first production version. |
| Monthly sales goal | `VIP Branch Sales Goal`; `save_sales_goal_proposal`, `submit_sales_goal_proposal`, `decide_sales_goal` | Live backend. Manager draft/submission is branch-derived; CEO/System Manager decides; one branch/month record, versions, stale-write check, idempotency replay, and audit are enforced. No production goal row has been entered yet. |
| CEO company-wide view | Existing CEO permissions across multiple VIP records plus new executive aggregation endpoints | Partially ready. CEO role exists but no production user is assigned; several manager-only APIs need explicit CEO aggregation rather than bypassing branch checks. |

## PWA connection design

The production PWA should be served from the same `srv1871758.hstgr.cloud` origin and use Frappe session-cookie authentication. All custom reads/writes should go through whitelisted `nomad_vip` methods. Token credentials are acceptable only for a server-to-server adapter and must never be shipped in Vite variables or browser JavaScript.

The role bootstrap endpoint must return the server-derived user, roles/mode, branch, and permission capabilities. The PWA then selects the CEO or Branch Manager shell from that response. Route hiding improves usability, but Frappe role/branch enforcement remains authoritative for every request.

Independent dashboard reads should run concurrently. Mutations must carry expected version/modified timestamps and idempotency keys where supported, then reconcile from the server response.

## Related documents

- [Knowledge-base gap analysis](../../knowledge-base-gap-analysis.md)
- [Stakeholder clarification register](../../stakeholder-clarification-register.md)
