---
type: architecture
status: verified
last_reviewed: 2026-08-13
---

# Current-State Architecture

## Purpose

Capture the verified ERPNext/Frappe, VPS, custom-app, data, and integration inventory.

## Verified production state

The target system is the Hostinger VPS `1871758` (`srv1871758.hstgr.cloud`), not the older Mongolica ERP environment. The VPS runs Ubuntu 24.04 LTS with Docker Compose. Public HTTPS terminates at the `vipclub-web` Nginx container and routes the Frappe root/API plus the `/staff`, `/staff-api`, `/vip-entry`, and `/vip-entry-api` applications.

| Layer | Verified state |
| --- | --- |
| Frappe | 16.29.0 |
| ERPNext | 16.30.0 |
| HRMS | 16.15.0 |
| Custom app | `nomad_vip` 0.0.1, bind-mounted read-only into the Frappe containers |
| Production site | `nomad.local`; scheduler active, two workers online |
| Test site | `bat116-test.local`; scheduler disabled and paused |
| Database/cache | MariaDB 11.8 and Redis 8.6 containers |
| Public origin | `https://srv1871758.hstgr.cloud` |
| Backups | Hostinger weekly backup plus current Frappe database backups; pre-deployment production backup verified at 2026-08-13 18:44 |

The production site contains 611 Customers, 247 Employees (236 active), 4 Branches, 2,539 imported VIP POS Bills, 25 VIP Entertainer Profiles, and 2,432 branch-specific customer profiles. Four Branch Manager users are linked to active Employee and Branch records. A 2026-08-13 identity audit confirmed that all four users are enabled, hold only the expected management role, resolve to the correct active Employee and Branch, and pass branch-scoped management-session, sales-progress, CRM, penalty, weekly-schedule, leave-request, and workforce-dashboard read smoke tests. The `CEO` role exists but is assigned to no named production user. Administrative identities receive the company workspace through System Manager authority, but an accountable CEO identity must still be provisioned for routine CEO use.

Finex intentionally creates one customer-profile shell per customer per branch, including zero-activity shells. Management CRM therefore excludes zero-activity shells from branch lists and counts, scopes phone/name search to customers with activity in the selected branch, and reports the CEO company total as distinct active customers rather than summing branch profiles. Phone-only customer names and embedded phone numbers are masked in the browser projection.

## Application boundary

The `nomad_vip` backend already provides authenticated, branch-scoped APIs for manager dashboards, schedules, attendance, correction requests, emergency leave approval, lateness/absence penalties, customer phone lookup, customer spending/rank context, and entertainer ranking evidence. Role and branch scope are resolved from the authenticated Frappe User → Employee → Branch relationship rather than client input.

The production backend now also exposes `nomad_vip.api.management` for a server-derived management session, branch-scoped CRM list with masked phone, branch penalty list, paid-POS sales progress, manager goal proposal/submission, and CEO goal decision. `VIP Branch Sales Goal` was migrated to the test and production sites on 2026-08-13. The four production Branch Manager identities passed a branch-scoped read-only smoke test.

The same manager/CEO PWA is deployed at `/manager/`. The production build uses `VITE_DATA_SOURCE=frappe`, derives the role and authorized branch from the authenticated Frappe session, and uses the same-origin session cookie plus a CSRF header for writes. It contains no role picker or browser-embedded API secret. A Branch Manager receives the branch workspace; a `CEO` or System Manager receives the company workspace.

The live Branch Manager workspace includes the own-branch sales goal on the default page, weekly/monthly scheduling for every active Employee assigned to the branch, an Employee-based team directory enriched with entertainer rank where available, unified standard HRMS and emergency-leave decisions, lateness/no-show penalty review, masked customer CRM search and spending context, customer/team rankings, and goal proposal/submission. The live CEO workspace includes the company overview, branch comparison, goal approvals, cross-branch CRM/workforce/penalty oversight, and permission-controlled links to the broader NextERP finance, task, message, Hermes, and report modules. Its workforce data-quality queue lets the CEO search active Employees missing a Branch, select one of the four confirmed VIP branches, enter a required source/reason, and apply an audited one-time mapping. It does not auto-assign or silently reassign an Employee.

## Confirmed gaps

- No named production CEO user currently holds the `CEO` role; company-wide access is still using administrative authority instead of an accountable CEO identity.
- The production Branch Sales Goal DocType/API is live, but no goal rows exist yet; a manager must submit the first target and the assigned CEO must approve it.
- `get_rank_settings` and the legacy `get_branch_customers` remain admin-only. Managers use the new branch-derived `get_manager_customers`, which is rendered by the live PWA with masked phone data.
- The production app source is not a Git working tree. Repository-controlled source and deployment provenance must be established before routine production changes.
- Production has 236 active Employees: 75 have a confirmed VIP Branch assignment and appear in the corresponding manager team/schedule; 161 have no Branch value. The PWA reports those 161 to CEO as a searchable data-quality queue and never guesses their branch; a human must confirm each mapping before the Employee enters the corresponding manager scope.

## Related documents

- [Knowledge-base gap analysis](../../knowledge-base-gap-analysis.md)
- [Stakeholder clarification register](../../stakeholder-clarification-register.md)
