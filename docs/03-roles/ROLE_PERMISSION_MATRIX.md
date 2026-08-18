---
type: permissions
status: selected-baseline
last_reviewed: 2026-08-07
---

# Role Permission Matrix

## Purpose

Define minimum role, branch, record, action, approval, export, and field-level access. This is a deny-by-default baseline; final DocType actions and sensitive fields require implementation mapping and approval.

All permissions are enforced in Frappe/backend APIs. Menu or field hiding is not a security control.

## Baseline matrix

| Role | Scope | Allowed capabilities | Restricted capabilities |
| --- | --- | --- | --- |
| CEO | Company-wide | Executive dashboards; all-branch targets and approved audits; downward task assignment; designated rank, plan, reward, policy, and exception decisions | Must not bypass financial segregation or silently edit finalized history |
| General Manager | Delegated company scope | Cross-branch operations, subordinate assignment, review, escalation, approved dashboards | No undelegated CEO-only or accounting approval |
| Branch Manager | Assigned branches | Branch operations, staff schedule/availability, customer feedback, incidents, reconciliation exceptions, local tasks, action plans, approved configuration proposals | No other-branch private data; no unilateral high-risk financial policy activation unless explicitly delegated |
| Call Operator | Call-handling scope | CallPro call list/metadata, masked caller lookup, minimum customer creation, reservation, current-shift entertainer availability, VIP service indicator, purpose classification, block proposal/action per policy | No unrestricted CRM, full customer history, entertainer private/financial/disciplinary data, or confidential KPI |
| Receptionist / Host | Assigned branch and current service | Customer lookup/create, consent, reservation, arrival/check-in, room/session association, drop-off reason, approved preferences | No unrelated finance, confidential entertainer data, or unrestricted exports |
| Bartender / Floor Operations | Assigned branch and current day/shift | Operations workstation, rooms, active sessions, reservations, entertainer requests, service-required membership and preference data, masked customer identifier | No full phone number, unrestricted CRM history, marketing export, or private entertainer records |
| Lead Entertainer | Assigned branch/team | Entertainer schedule/readiness, coaching, assigned evidence and incidents, authorized ranking review input | No other-branch/private finance unless separately granted; no final rank decision unless approved |
| Entertainer | Own records plus assigned operational work | Own schedule, attendance, incidents visible under policy, feedback, KPI evidence, rank, income statement, loan, requests, tasks, messages, assistant | No other entertainer private data, manager confidential notes, or unrestricted customer CRM |
| Customer / VIP Customer | Authenticated or room-scoped service context | Own membership/points/privileges; approved public entertainer profiles; current visible availability; room request; feedback; own reservation/consent | No body measurements, private contacts, incidents, financials, KPI calculations, or another customer/session |
| HR Manager | Authorized people scope | Employment records, attendance/discipline workflows, approved employment review, policy administration | No unrelated customer CRM or accounting approval |
| General Accountant | Authorized financial scope | Financial policy review, settlements, reconciliation, liabilities, reports, approvals under segregation | No unreviewed self-approval where separation is required |
| Transaction Accountant | Assigned transaction scope | Source transaction, settlement, point, reward, and reconciliation evidence | No final policy approval unless delegated |
| Payment Accountant | Assigned payment scope | Authorized payment preparation/posting and payment evidence | No unauthorized calculation or self-approved policy |
| Marketing / Content Manager | Approved customer/campaign scope | Segments, consented campaigns, customer-visible content, aggregate reporting | No unrestricted sensitive customer or entertainer internal profile data |
| System Administrator | Technical administration | Users, roles, integration/configuration setup, policy deployment, audit support | Cannot grant self business approval or alter finalized records outside correction workflow |

Other existing roles retain their authorized module scope and inherit the same branch, ownership, field, and audit controls.

## Sensitive-action controls

| Action | Minimum control |
| --- | --- |
| Rank change | Explainable recommendation/evidence plus authorized human decision and audit |
| Financial-rule change | Effective-dated version, previous/new value, reason, and approved segregation |
| Manual deduction | Source evidence, proposer, approver, reason, and adjustment path |
| Reward allocation | Policy calculation, manager proposal where permitted, CEO visibility/review, and audit |
| Customer-phone block/unblock | Policy reason, actor, time, status history, and review/appeal rule |
| Verified incident | Structured evidence, review status, resolution, and restricted visibility |
| Monthly target/plan | CEO-set target, manager plan, CEO approval, full version history |
| Anonymous sender identity access | CEO/audited authority only, explicit reason, and immutable access log |
| Reconciliation exception resolution | Branch-scoped investigation, reason/evidence, manager action, and CEO visibility |

## Assignment hierarchy

- CEO may assign downward within authorized company scope.
- General Manager may assign to delegated subordinate scope.
- Branch Manager may assign within authorized branch/team.
- Subordinates normally cannot assign mandatory work upward.
- Any authorized user may comment, ask questions, submit updates, request clarification, or propose changes within a task/project.

## Open decisions

- **TBD — Business configuration required:** exact create/read/update/delete/submit/approve/export permissions by DocType.
- Confirm separate Sales Manager and Host role mappings.
- Confirm final rank, financial policy, reward, block/unblock, incident, and reconciliation approval authorities.
- Confirm cross-branch access for General Manager, accounting, HR, marketing, and technical support.
- Confirm customer/session authentication and room-QR authorization lifetime.
- Confirm data export, audit-log, and anonymous-identity access retention.

## Related documents

- [Functional Requirements](../functional-requirements.md)
- [Field Masking](FIELD_MASKING.md)
- [Segregation of Duties](SEGREGATION_OF_DUTIES.md)
- [Technical Architecture](../technical-architecture.md)
