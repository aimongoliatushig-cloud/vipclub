---
type: traceability
status: active
last_reviewed: 2026-08-07
---

# Requirements Traceability

## Purpose

Map authoritative requirement families to processes, data, UX/API, controls, and verification. This is a relationship index, not a duplicate requirement source.

| Requirement family | Processes | Principal data | UX / API | Key verification |
| --- | --- | --- | --- | --- |
| FR-CALL | P17 CallPro-assisted call to reservation | Call Event, Classification, Block Decision, Customer, Reservation | Call Operator workspace, CallPro adapter | Provider idempotency, purpose separation, masking, limited CRM, booking conversion |
| FR-ENT | P10 onboarding, P12 ranking | Entertainer Service Profile, Incident, Ranking Snapshot, Recommendation/Decision | Internal/public profile serializers, Entertainer PWA/assistant | Gold start, four ranks, field allowlist, human decision, explanation |
| FR-REQ | P19 entertainer request, P38 extras | Availability, Service Request, Extra Definition/Capability/Price | Customer Assistant, operations workstation, realtime API | Separate availability/visibility, room scope, timestamps, escalation, no auto penalty |
| FR-INCOME | P13 settlement, P14 loan | Compensation Policy, Income Event, Settlement, Deduction, Loan | Entertainer statement, finance workspace | Effective dates, historical integrity, source lines, approval, reversal |
| FR-CUST / FR-OPS | P15 registration, P16 reservation, P18 session/reconciliation, P37 feedback | Customer, Consent, Room, Session, Drop-off, Reconciliation, Feedback | Reception, Customer Assistant, operations workstation | Session isolation, structured outcome, feedback review, no automatic accusation |
| FR-GOAL | P40 target/plan, P44 KPI/reward/penalty | Goal Cycle, Plan, KPI Snapshot, Reward Allocation, Penalty Review | CEO/Manager dashboards, task API, assistants | CEO-set target, plan approval, AI advisory, human reward/penalty review |
| FR-TASK | P20/P21/P22/P26 | ERPNext Project/Task, Comment, Evidence, Notification | Internal PWA, AI Tool Gateway | Hierarchy, backend permission, discussion context, reminders, reopening |
| FR-MSG | P25 internal message/feedback | Message, Feedback Submission, Protected Identity Access | Internal messaging and notification services | Recipient anonymity disclosure, reveal authorization and audit |
| FR-AI | Cross-cutting | Tool request/audit, source records | CEO, Manager, Entertainer assistant contexts | Acting-user permissions, allowlisted tools, prohibited approvals |
| FR-REPORT | P35 intelligence, P44 KPI, P45 health | KPI/Reporting Snapshot and source links | Dashboard/report APIs | Authorized drill-down, policy/formula version, freshness, missing data |
| FR-CRM | P30–P36 | Membership Account, Point Ledger, Privilege, Evaluation | Customer/CRM PWA and APIs | One status/balance, anniversary/grace, cross-branch rules, financial controls |

## Cross-module chains

~~~text
CallPro → Customer → Reservation → Branch Operations

Check-in → Session/QR → Request → Service → Bill/Drop-off → Reconciliation

Feedback → Review → Verified Incident → Ranking Evidence

Ranking Evidence → Recommendation → Human Decision → Rank
→ Compensation Policy → Settlement

CEO Target → Manager/AI Plan → ERPNext Projects/Tasks
→ KPI → Reward/Penalty Review → Next Cycle
~~~

## Test obligations

Each implementation slice needs:

- unit tests for effective policies and calculations;
- permission and field-masking tests by role/branch/ownership;
- workflow/state transition and human-approval tests;
- idempotency, retry, reconciliation, and provider-failure tests;
- realtime subscription, reconnect, stale-state, and session-isolation tests;
- audit, reversal/adjustment, and historical-policy tests;
- PWA journeys for empty, denied, offline, stale, and exception states;
- report drill-down and source-evidence tests.

## Open traceability work

Add Linear items, final DocType/API names, BPMN links, test IDs, and policy decision IDs after repository audit and business approval.
