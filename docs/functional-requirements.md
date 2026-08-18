# Functional Requirements

This is an evidence-based working draft derived from project discussions and client interviews. Values marked **TBD — Business configuration required** must remain configurable and must not be implemented as hidden constants.

## Roles

| Role | Primary responsibility |
| --- | --- |
| CEO | Company-wide oversight, cross-branch task assignment, monthly sales-target setting, final designated approvals, and authorized audit access. |
| General Manager | Company-wide operations within delegated authority, downward task assignment, management review, and escalation to the CEO. |
| Branch Manager | Branch operations, staff and service oversight, in-branch task assignment, local configuration within approved scope, monthly action planning, KPI review, and resolution of branch exceptions. |
| Call Operator | Handles CallPro-assisted calls, limited customer lookup/creation, call classification, reservation creation, approved VIP recognition, and current-shift entertainer availability lookup. |
| Receptionist / Host | Finds or creates customer profiles, manages consent, records arrival/check-in and drop-off outcomes, assigns room/session context, and supports reservations. |
| Bartender / Floor Operations | Uses the consolidated operations workstation for current rooms, customer sessions, reservations, entertainer requests, and immediate service alerts without unrestricted CRM access. |
| Entertainer | Uses the internal PWA for own schedule, attendance, incidents, KPI evidence, rank, income, loans, customer requests, tasks, messages, and assistant coaching. |
| Lead Entertainer | Oversees entertainer standards, coaching, readiness, operational follow-up, and ranking evidence within approved authority. |
| Customer / VIP Customer | Uses the Customer Assistant PWA for approved public entertainer information, room-aware requests, feedback, reservations, membership, points, privileges, and consent choices. |
| Server | Supports branch service operations and receives role-appropriate tasks, schedules, and notifications. |
| Marketing and Content Manager | Creates approved customer segments, campaigns, content, and marketing reporting. |
| General Accountant | Oversees accounting records, reconciliations, financial controls, and approved reporting. |
| Transaction Accountant | Records and reconciles operating transactions, settlements, point events, and supporting financial evidence. |
| Payment Accountant | Prepares and records authorized payments and maintains payment evidence and status. |
| Accounting Clerk | Supports transaction entry, record maintenance, evidence collection, and assigned reconciliation work under financial controls. |
| Human Resources Manager | Owns employee lifecycle, people policy, staffing, personnel records, and authorized employment review workflows. |
| Purchasing Manager | Manages approved procurement requests, suppliers, purchasing workflow, and purchasing records. |
| Technical Assistant | Receives, diagnoses, updates, and closes assigned technical maintenance and equipment-support work with evidence. |
| Carpenter | Receives and completes assigned branch facilities, fixture, and repair work with progress updates and completion evidence. |
| Security Officer | Supports visitor and branch safety, incident reporting, and approved security procedures. |
| Driver | Provides approved safe transport for eligible VIP visitors and records assigned trips according to privacy and safety rules. |
| System Administrator | Manages authorized system configuration, access, integration setup, policy versions, and audit-support functions. |

### Role-design note

Role responsibility does not grant unrestricted access. The role-permission and field-masking specifications define branch, record, action, approval, export, and sensitive-field scope. All API access is enforced server-side.

## Workforce task management

| ID | Requirement |
| --- | --- |
| FR-TASK-001 | The system must support teams across the configured branches; the initial operating model has four branches but the number must not be hard-coded. |
| FR-TASK-002 | The CEO must be able to assign work to any authorized user in company scope. |
| FR-TASK-003 | A Branch Manager must be able to assign work within the manager's authorized branch and team. |
| FR-TASK-004 | The system must notify task assignees through approved PWA channels. |
| FR-TASK-005 | A task or project must retain contextual comments and discussion history. |
| FR-TASK-006 | An assignee must be able to update progress, submit a result, and mark work complete subject to review rules. |
| FR-TASK-007 | An assignee must be able to attach approved supporting evidence. |
| FR-TASK-008 | A task must retain execution notes, status changes, owners, and deadlines. |
| FR-TASK-009 | Dashboards must show incomplete and completed work, deadlines, overdue items, and completion statistics. |
| FR-TASK-010 | Mandatory assignment must normally flow downward through the organizational hierarchy; subordinates may comment, ask questions, submit updates, and propose work upward. |
| FR-TASK-011 | The solution must reuse ERPNext/Frappe Project and Task records where practical instead of creating duplicate core task storage. |
| FR-TASK-012 | Authorized AI assistants may propose projects, milestones, tasks, subtasks, owners, and due dates; backend permission and approval remain authoritative. |
| FR-TASK-013 | Deadline reminders must be configurable by task type, with a working expectation of approximately one or two days before due date plus controlled overdue, reassignment, and approval notifications. |
| FR-TASK-014 | Projects and tasks must retain supporting information and decisions in context rather than relying on unrelated messaging. |

## Monthly sales goals and manager performance

| ID | Requirement |
| --- | --- |
| FR-GOAL-001 | The CEO must set the monthly sales target for each relevant branch or manager at the beginning of the planning cycle. |
| FR-GOAL-002 | The Branch Manager must review the target and prepare an editable action plan, projects, tasks, owners, and proposed deadlines. |
| FR-GOAL-003 | The Manager assistant may analyze the previous cycle and propose evidence-based actions; the manager chooses, edits, rejects, or supplements them. |
| FR-GOAL-004 | The CEO must approve the submitted monthly action plan or request changes before it becomes active. |
| FR-GOAL-005 | The system must retain target, plan versions, AI recommendations, manager decisions, review comments, approvals, and source-data summaries. |
| FR-GOAL-006 | The system must display current sales, target, attainment percentage, forecast when supported, and plan execution throughout the month. |
| FR-GOAL-007 | AI may advise, explain, forecast, and remind; it must not approve a target, compensation, penalty, or termination action. |
| FR-GOAL-008 | CEO and managers must be able to review historical targets, actuals, attainment, target reached/missed months, reward/penalty outcome, and trend. |
| FR-GOAL-009 | Configured underperformance thresholds may calculate and flag proposed salary deductions or employment review, but termination and other employment decisions require authorized human action. |
| FR-GOAL-010 | Above-target performance may create a configurable reward pool with manager share, proposed team allocation, recipient amounts, explanation, review, and final status visible to the CEO. |
| FR-GOAL-011 | The planning deadline and reminder timing must be configurable; a fixed three-day-before-month rule must not be hard-coded. |

## Branch setup and scalability

| ID | Requirement |
| --- | --- |
| FR-BRANCH-001 | An authorized administrator must be able to create and activate a new branch without a software deployment. |
| FR-BRANCH-002 | Branch setup must support company/cost-center mapping, timezone, managers, team assignments, role access, operational settings, notification configuration, pricing, and reporting scope. |
| FR-BRANCH-003 | New branches must inherit approved default policies and templates while preserving authorized branch-specific configuration. |
| FR-BRANCH-004 | Historical records must retain the branch and effective policy associated with the event when it occurred. |

## Call Operator and CallPro

| ID | Requirement |
| --- | --- |
| FR-CALL-001 | The system must integrate with CallPro through verified available APIs without inventing unsupported endpoints or semantic classification. |
| FR-CALL-002 | Where supported, store or associate incoming, answered, missed, or unanswered calls, caller number, timestamps, operator, duration, provider reference, and useful metadata. |
| FR-CALL-003 | An operator must classify call purpose as reservation, general inquiry, location, menu/service, entertainer availability, prank/abusive, other, or an authorized configurable category, with an optional note. |
| FR-CALL-004 | Routine reservations must not require unnecessary commentary. |
| FR-CALL-005 | An authorized operator may mark a number as prank, abusive, or blocked according to policy; blocking and unblocking require reason and audit history. |
| FR-CALL-006 | An operator may search an existing customer by normalized phone identity but must not receive unrestricted CRM access. |
| FR-CALL-007 | The operator view may show service-required customer details and an operational VIP/member indicator while masking unrelated sensitive data. |
| FR-CALL-008 | If no match exists, the operator may create a minimum customer/contact record and attach a reservation. |
| FR-CALL-009 | A call-created reservation must capture customer, configured branch, date/time, guest count, source call, and relevant notes. |
| FR-CALL-010 | The operator may view tonight/current-shift entertainer schedule and operational availability without unrelated private entertainer data. |
| FR-CALL-011 | Call reporting must support calls handled, answer rate, booking conversion, purpose distribution, prank/blocked calls, and authorized operator drill-down. |
| FR-CALL-012 | CallPro authentication, endpoint coverage, webhook/polling model, retention, rate limits, sandbox, and reconciliation remain **TBD — Business configuration required** pending provider documentation. |

## Entertainer profile, ranking, and assistance

| ID | Requirement |
| --- | --- |
| FR-ENT-001 | The internal entertainer profile may store structured height, weight, chest, waist/belly, hip, hair color, body type, nationality, languages, traits, talents, and other configured service-relevant attributes. |
| FR-ENT-002 | Traits, talents, and similar variable attributes should use authorized tag/configuration records rather than inflexible hard-coded enumerations. |
| FR-ENT-003 | Body measurements, private contact data, disciplinary data, financial data, and confidential KPI calculations must never be exposed through the Customer Assistant PWA. |
| FR-ENT-004 | An approved public entertainer profile may expose photo, display identity, nationality, languages, short introduction, talents, current public rank, operational availability, approved extra-service capability, and explicitly approved fields. |
| FR-ENT-005 | Entertainers use four ranks: Bronze, Silver, Gold, and Diamond. |
| FR-ENT-006 | New entertainers begin at Gold under the current client direction; later movement follows the approved human-controlled ranking policy. |
| FR-ENT-007 | Ranking evidence must cover four broad dimensions: sales/performance, attendance/reliability, repeat-customer loyalty, and verified behavioral incidents. |
| FR-ENT-008 | The system may calculate an explainable promotion-readiness recommendation and unmet criteria, but an authorized human makes the final rank decision. |
| FR-ENT-009 | Rank decisions must record recommendation, source evidence, approver, final decision, override reason when applicable, policy version, and effective date. |
| FR-ENT-010 | The public profile may show only the current rank, not scoring details or confidential evidence. |
| FR-ENT-011 | The Entertainer PWA must provide a permission-bound personal assistant using only the entertainer's own authorized schedule, attendance, incidents, feedback, KPI, rank, income, deduction, loan, and customer-request data. |
| FR-ENT-012 | The assistant must distinguish objective evidence from management judgment and must not expose another entertainer's private data. |
| FR-ENT-013 | Exact ranking weights, thresholds, work-night expectations, loyalty qualification, Diamond conditions, evaluation period, demotion rules, and approval authority are **TBD — Business configuration required**. |

## Entertainer requests and extra services

| ID | Requirement |
| --- | --- |
| FR-REQ-001 | A room-aware customer session may request an operationally available and customer-visible entertainer in near real time. |
| FR-REQ-002 | A request must capture branch, room, customer/session, entertainer, request time, acknowledgement and status timestamps, arrival, completion, and outcome where applicable. |
| FR-REQ-003 | Requests must be visible through the entertainer PWA, resting-area display, and authorized manager/bartender operations view as configured. |
| FR-REQ-004 | The working response target is approximately two minutes; the system records response evidence and does not apply an automatic punishment. |
| FR-REQ-005 | Unresolved and aging requests must be obvious to managers so they can physically alert an entertainer when necessary. |
| FR-REQ-006 | Operational availability and customer visibility are separate states; shift attendance alone must not determine public availability. |
| FR-REQ-007 | Extra service/performance types, entertainer capability, branch-specific price, approved customer-visible price, and availability rules must be configurable. |
| FR-REQ-008 | Customer views must not expose internal margin or profit-sharing details for extra services. |
| FR-REQ-009 | Official extra-service terminology, categories, payment flow, eligibility, and revenue-share impact are **TBD — Business configuration required**. |

## Entertainer compensation and settlement

| ID | Requirement |
| --- | --- |
| FR-INCOME-001 | Entertainer income must support customer-time/hourly share, normal tips, spreading tips, wine commission, and other approved categories. |
| FR-INCOME-002 | Customer-time share rules must be branch-scoped, effective-dated, auditable, and historically reproducible; proposed rates are Bronze 50%, Silver 60%, Gold 70%, and Diamond 80%. |
| FR-INCOME-003 | Spreading-tip unit value and entertainer share must be configurable; interview values are approximately MNT 2,000 per unit and 90% share. |
| FR-INCOME-004 | The Entertainer PWA must show a transparent three-day income statement separating earnings from deductions. |
| FR-INCOME-005 | Earnings must separately identify customer-time/hourly earnings, tips, spreading tips, wine commission, and other approved income. |
| FR-INCOME-006 | Deductions must separately identify loan repayment, lateness, no-show, approved missed-request deductions, and other approved deductions. |
| FR-INCOME-007 | Every line item must link to source evidence, policy version, calculation, effective rate, and any approval or adjustment. |
| FR-INCOME-008 | Manual deductions and financial-rule changes require authorization, previous/new value, reason, effective date, and audit history. |
| FR-INCOME-009 | Proposed percentages, tip terminology, penalty amounts, and missed-request deduction policy remain **TBD — Business configuration required** until approved. |

## Customer Assistant, feedback, visits, and reconciliation

| ID | Requirement |
| --- | --- |
| FR-CUST-001 | Extend the existing Customer Assistant PWA rather than create a redundant customer application. |
| FR-CUST-002 | A room-specific QR code must establish authorized branch, room, and customer-session context without exposing another session. |
| FR-CUST-003 | The Customer Assistant must show only entertainers who are both operationally available and approved for customer visibility. |
| FR-CUST-004 | Customers may request an entertainer and receive simple status feedback such as Requested, Confirmed, On the way, or Unavailable. |
| FR-CUST-005 | Membership theming may use discreet tier cues; it must not conspicuously expose a high-status member to companions. |
| FR-CUST-006 | Customers may submit a compliment, complaint/criticism, or improvement suggestion and may optionally reference an entertainer. |
| FR-CUST-007 | Compliments may become performance evidence; complaints require management review and must not automatically create a penalty or KPI deduction. |
| FR-OPS-001 | Reception must record auditable customer/group arrival and check-in time separately from reservation, service entry, drop-off, and billing. |
| FR-OPS-002 | Reception must record a no-service/drop-off outcome using structured reasons plus optional free text; known reasons include full capacity, preferred entertainer unavailable, too few options, price concern, and Other. |
| FR-OPS-003 | Every checked-in group must reconcile to a bill/service outcome or a legitimate recorded drop-off. |
| FR-OPS-004 | An unexplained check-in/bill difference must create a Reconciliation Exception for Branch Manager review and CEO cross-branch visibility. |
| FR-OPS-005 | A reconciliation exception must not itself accuse or punish an employee; a verified resolution may become policy-approved KPI evidence. |
| FR-OPS-006 | Managers and bartenders need one near-real-time operations workstation for room occupancy, customer sessions, reservations, entertainer requests, and immediate alerts. |
| FR-OPS-007 | Bartenders may see only today's service-required customer details, membership status, approved preferences, and a masked identifier—not unrestricted CRM or full phone number. |
| FR-OPS-008 | The final branch health-score formula, weights, severity, period, and alert rules are **TBD — Business configuration required**. |

## Internal messaging and escalation

| ID | Requirement |
| --- | --- |
| FR-MSG-001 | Authorized employees must be able to send direct internal messages according to organizational and branch permissions. |
| FR-MSG-002 | Entertainers may communicate with teammates and authorized Lead Entertainer, Branch Manager, General Manager, CEO, and other staff. |
| FR-MSG-003 | Employees may submit concerns or incident-related feedback upward to a selected authorized recipient. |
| FR-MSG-004 | An approved feedback submission may hide the sender from the normal recipient while retaining the true identity for tightly permissioned CEO/audit access. |
| FR-MSG-005 | The product must clearly disclose that recipient-anonymous feedback is not technically untraceable. |
| FR-MSG-006 | Every access to a protected sender identity must be audited. |

## AI authorization and reporting

| ID | Requirement |
| --- | --- |
| FR-AI-001 | CEO, Manager, and Entertainer assistants must operate as distinct role contexts over backend-authorized data and tools. |
| FR-AI-002 | AI may summarize, explain, detect anomalies, recommend actions, estimate trajectories, identify promotion readiness, and draft projects/tasks. |
| FR-AI-003 | AI must not secretly determine compensation, ranking, punishment, termination, financial approval, or policy activation. |
| FR-AI-004 | An assistant request must not bypass backend role, branch, ownership, action, or field-level authorization. |
| FR-REPORT-001 | Reporting must support authorized drill-down by date, branch, manager/employee, entertainer, customer cohort, call operator, feedback category, drop-off reason, and target period. |
| FR-REPORT-002 | Required report families include CallPro/operator, target history, branch health, check-in/bill reconciliation, drop-off, feedback, entertainer-request response, entertainer KPI/rank review, income statement, reward allocation, and monthly plan execution. |
| FR-REPORT-003 | KPI calculations must retain formula/policy version, source records, refresh time, and drill-down evidence. |

## Governance and audit

High-impact changes and decisions—including rank, KPI override, financial rule, deduction, reward allocation, phone blocking, incident verification, target, monthly plan, protected sender-identity access, and reconciliation resolution—must record actor, timestamp, previous/new value where applicable, reason, approval state, and effective policy version.

All changing business values use effective-dated/versioned configuration where historical calculations must remain reproducible.

## Open decisions with material delivery impact

- **Entertainer ranking:** final four-dimension weights, thresholds, repeat-customer rule, late/no-show limits, work nights, evaluation period, Diamond conditions, demotion, and approval authority.
- **Manager KPI:** final components, weights, customer-experience use, task and attendance weight, penalty boundary semantics, and reward formula.
- **Branch health:** final metrics, weights, period, severity, red/amber/green thresholds, and critical alerts.
- **Extra services:** official terminology, categories, eligibility, pricing workflow, payment behavior, and revenue share.
- **CallPro:** verified API scope, authentication, event delivery, historical retrieval, retention, sandbox, rate limits, and data-processing terms.
- **Operations:** exact entertainer-request status language, two-minute SLA policy, escalation timing, room/session identity, and reconciliation resolution authority.
- **Task management:** final states, result acceptance, reopening authority, evidence retention, and notification timing by task type.
