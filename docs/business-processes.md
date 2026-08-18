# Business Process Catalog

This catalog is the starting point for the VIP Club operating model. Each listed process requires a detailed Markdown specification and version-controlled BPMN diagram before implementation.

## Process standards

Every detailed process defines owner, roles, trigger, inputs, normal flow, exceptions, decisions, records, permissions, notifications, audit events, metrics, and acceptance criteria. Values not finalized are marked **TBD — Business configuration required**.

## Phase 0 — Foundation

| ID | Process | Purpose | Primary owner |
| --- | --- | --- | --- |
| P00 | Policy publication and versioning | Approve, publish, supersede, and apply effective-dated policies safely. | CEO / Operations |
| P01 | User, role, and branch access lifecycle | Create, change, suspend, and revoke role/branch access. | HR / System Administrator |
| P02 | Audit and correction workflow | Correct sensitive records through traceable adjustment or reversal. | System Administrator / Finance |
| P03 | Branch setup and activation | Configure and activate a future branch without code deployment. | System Administrator / CEO |

## Phase 1 — Foundation Operations and Customer Service

| ID | Process | Purpose | Primary owner |
| --- | --- | --- | --- |
| P10 | Employee and entertainer onboarding | Create identity, branch, role, schedule, bank/contract records, starting Gold entertainer rank, and acknowledgements. | HR |
| P11 | Schedule and attendance | Assign shifts, record check-in/out, classify attendance, and manage corrections. | Branch Manager |
| P12 | Entertainer ranking recommendation and decision | Convert verified four-dimension evidence into an explainable recommendation and authorized human rank decision. | Operations / Authorized Management |
| P13 | Three-day entertainer settlement | Calculate category earnings, deductions, loan repayment, review, approve, pay, and audit. | Accounting |
| P14 | Performance-based loan | Check eligibility, approve, disburse, and repay through settlements. | CEO / Accounting |
| P15 | Customer registration and consent | Find/create a customer and record consent and channel preferences. | Reception / Call Operator |
| P16 | Reservation lifecycle | Request, confirm, assign, arrive, complete, cancel, and attribute revenue. | Reception / Branch Manager |
| P17 | CallPro-assisted call to reservation | Import/record a call, match/create customer, classify purpose, check service availability, create reservation, and close/reconcile the call. | Call Operator |
| P18 | Check-in, room session, drop-off, and bill reconciliation | Record arrival, bind room/session, record service or drop-off, reconcile bill, and resolve unexplained sessions. | Reception / Branch Manager |
| P19 | Entertainer availability and room request | Publish approved availability, request an entertainer, acknowledge, escalate, arrive, complete, and measure response. | Branch Manager / Floor Operations |

## Phase 2 — Workforce, Tasks, and Internal Communication

| ID | Process | Purpose | Primary owner |
| --- | --- | --- | --- |
| P20 | Task assignment and acknowledgement | Assign work down the authorized hierarchy, notify the assignee, and record receipt. | CEO / Manager |
| P21 | Task execution and completion | Record progress, comments, evidence, result, review, rework, and closure using ERPNext/Frappe task records where practical. | Assignee / Manager |
| P22 | Deadline reminder and overdue escalation | Send configurable approaching-deadline reminders, escalate overdue/blocked work, and avoid notification spam. | Manager |
| P23 | Formal order and policy acknowledgement | Issue a required instruction and capture read/acknowledgement evidence. | CEO / Manager |
| P24 | Maintenance request and closure | Report, assign, repair, verify, and close maintenance work. | Branch Manager |
| P25 | Internal message and upward feedback | Send permission-controlled direct messages, concerns, updates, or recipient-anonymous feedback with protected audit identity. | Employee / Authorized Recipient |
| P26 | AI-assisted project/task planning | Convert an authorized idea into proposed projects, milestones, tasks, owners, and deadlines without bypassing backend permissions. | CEO / Manager |

## Phase 3 — CRM, Membership, Points, Privileges, and Intelligence

| ID | Process | Purpose | Primary owner |
| --- | --- | --- | --- |
| P30 | Customer visit and spend attribution | Reconcile verified visits and eligible spend to customer, branch, reservation, and entertainer. | Reception / Operations |
| P31 | Unified membership evaluation | Maintain one Bronze-to-Black-Diamond customer status across all branches. | CRM Manager |
| P32 | Point earn, redemption, and correction | Maintain one cross-branch point ledger from verified POS events. | CRM Manager / Finance |
| P33 | Privilege entitlement and use | Issue branch-eligible quotas, use/reverse them, reset periods, and audit events. | CRM Manager / Branch Manager |
| P34 | Customer segmentation and campaign | Build consent-valid segments, send campaigns, and track outcomes. | Marketing / CRM Manager |
| P35 | Customer intelligence review | Analyze visit cadence, spend, points, status, service behavior, branch mix, and entertainer affinity. | Manager / CEO |
| P36 | Membership launch migration and manual approval | Classify from history or manager nomination with CEO approval and source tags. | CEO / CRM Manager |
| P37 | Customer feedback and incident review | Receive compliment/complaint/suggestion, review, resolve, and create a verified entertainer incident only when warranted. | Branch Manager / CEO |
| P38 | Extra service configuration and fulfillment | Approve service type/capability, set branch price, expose approved customer information, fulfill, bill, and reconcile. | Branch Manager / Finance |

## Phase 4 — Management, Finance, and Optimization

| ID | Process | Purpose | Primary owner |
| --- | --- | --- | --- |
| P40 | CEO target and manager monthly plan | CEO sets target; manager builds an AI-assisted action plan; CEO approves; execution and month-end review follow. | CEO / Branch Manager |
| P41 | Employee feedback, complaints, and retention | Receive, restrict, investigate, resolve, and measure employee concerns. | HR |
| P42 | Customer and entertainer branch transfer | Offer an alternate branch while preserving authorization and attribution. | Branch Manager |
| P43 | Payroll, compliance, and financial reconciliation | Apply approved statutory rules, post records, reconcile, and retain evidence. | Accounting |
| P44 | Manager KPI, reward, and penalty review | Calculate approved KPI evidence, route reward/penalty proposal through human review, allocate approved rewards, and post/audit outcomes. | CEO / HR / Accounting |
| P45 | Branch health review | Combine approved branch metrics into a configurable score or severity with drill-down and exception follow-up. | CEO / General Manager |

## Cross-module relationship flows

~~~text
CallPro → Customer lookup/create → Reservation → Branch operations

Reception check-in → Room/customer session → Customer Assistant QR
→ Entertainer request → Service completion → Bill or Drop-off → Reconciliation

Customer feedback → Management review
→ Verified incident when substantiated → Entertainer evidence

Entertainer KPI evidence → Recommendation → Human approval
→ Effective rank → Effective profit-sharing policy → Settlement

CEO target → Manager/AI action plan → ERPNext Projects/Tasks
→ Execution → Sales/KPI result → Reward/Penalty review → Next cycle
~~~

## Core process rules

- CallPro supplies only verified provider facts; ERP classifies call purpose unless provider documentation confirms otherwise.
- Customer, Call Operator, Receptionist, and Bartender access is limited to service-required data.
- Operational entertainer availability and customer visibility are distinct.
- The approximate two-minute entertainer-request target measures service response and does not automatically punish.
- A customer complaint is reviewed before becoming a verified incident.
- An unexplained checked-in session creates a reconciliation exception, not an automatic accusation.
- AI drafts and recommends; authorized humans approve rank, compensation, penalty, termination, target plan, and policy decisions.
- All financial values, KPI weights, thresholds, deadlines, prices, and formulas use effective-dated configuration.

## BPMN delivery order

1. P17 CallPro-assisted call to reservation
2. P18 Check-in, room session, drop-off, and bill reconciliation
3. P19 Entertainer availability and room request
4. P37 Customer feedback and incident review
5. P12 Entertainer ranking recommendation and decision
6. P13 Three-day entertainer settlement
7. P40 CEO target and manager monthly plan
8. P44 Manager KPI, reward, and penalty review
9. P20/P21 ERPNext task assignment and execution
10. P31/P32/P33 Membership, points, and privileges

Existing reservation, ranking, settlement, feedback, task, goal, membership, and benefit/cashback BPMN diagrams must be revised where they conflict with these latest rules.

## Open design decisions

- **CallPro:** API/auth/event model, data fields, provider limitations, retention, and reconciliation.
- **Ranking:** four-dimension weights, thresholds, Diamond conditions, cadence, demotion, and final authority.
- **Operations:** room/session identity, request SLA/escalation, drop-off reasons, bill matching, and reconciliation resolution.
- **Manager performance:** KPI/health formulas, penalty boundaries, reward allocation, and customer-experience weighting.
- **Extra services:** official term, categories, capability, pricing/payment, and revenue sharing.
- **Tasks/messaging:** final states, reminder timing, result acceptance, reopening, anonymous disclosure, and audit authority.
