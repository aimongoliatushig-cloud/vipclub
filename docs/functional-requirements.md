# Functional Requirements

This is an evidence-based working draft derived from project discussions and client interviews. Values marked **TBD — Business configuration required** must remain configurable and must not be implemented as hidden constants.

## Roles

| Role | Primary responsibility |
| --- | --- |
| CEO | Company-wide oversight, cross-branch task assignment, and designated approvals. |
| Branch manager | Branch operations, team management, in-branch task assignment, branch-local workforce planning and weekly scheduling within approved scope, local configuration within approved scope, and proposing and executing monthly sales targets and action plans to improve branch sales. |
| Entertainer | Uses the workforce portal for schedule, attendance, income, rank, reservations, benefits, tasks, and communication. |
| Lead entertainer | Oversees entertainer standards, coaching, readiness, and operational follow-up; exact approval and disciplinary authority remains to be defined. |
| Server | Supports branch service operations and receives role-appropriate tasks, schedules, and notifications. |
| Bartender | Supports beverage/service operations and receives role-appropriate tasks, schedules, and notifications. |
| Host or receptionist | Finds or creates customer profiles, manages customer onboarding and consent, and supports reservations. |
| VIP customer | Has a member profile, consent preferences, reservations, membership level, approved benefits/points, and communications. |
| Marketing and content manager | Creates approved customer segments, campaigns, content, and marketing reporting. |
| General accountant | Oversees accounting records, reconciliations, financial controls, and approved reporting. |
| Transaction accountant | Records and reconciles operating transactions, settlements, and supporting financial evidence. |
| Payment accountant | Prepares and records authorized payments and maintains payment evidence and status. |
| Accounting clerk | Supports transaction entry, record maintenance, evidence collection, and assigned reconciliation work under financial controls. |
| Human resources manager | Owns employee lifecycle, people policy, staffing, personnel records, and approved HR workflows. |
| Purchasing manager | Manages approved procurement requests, suppliers, purchasing workflow, and purchasing records. |
| Technical assistant | Receives, diagnoses, updates, and closes assigned technical maintenance and equipment-support work with evidence. |
| Carpenter | Receives and completes assigned branch facilities, fixture, and repair work with progress updates and completion evidence. |
| Security Officer | Supports visitor and branch safety, incident reporting, and approved security procedures. |
| Driver | Provides approved safe transport for eligible VIP visitors and records assigned trips according to privacy and safety rules. |
| System Administrator | Manages authorized system configuration, access, integration setup, policy versions, and audit-support functions. |

### Role-design note

Role responsibility does not grant unrestricted access. The role-permission and field-masking specifications define branch, record, action, approval, export, and sensitive-field scope. All API access is enforced server-side.

## Role-aware management application

| ID | Requirement |
| --- | --- |
| FR-MGMT-001 | The internal management PWA must resolve the authenticated user's role, permissions, and authorized branch identifiers before rendering the default workspace. |
| FR-MGMT-002 | A CEO session must default to a company-wide dashboard and may view designated cross-branch sales, workforce, CRM/ranking, and approval summaries. |
| FR-MGMT-003 | A Branch Manager session must default to the manager's authorized branch overview and must not receive another branch's or company-wide data without a separately granted permission. |
| FR-MGMT-004 | Navigation, route access, service methods, and mutations must enforce the same permission model; hiding a control alone is not authorization. |
| FR-MGMT-005 | A Manager submission and the corresponding CEO approval, revision request, or rejection must update one shared versioned record with actor, time, state, and decision comment. |
| FR-MGMT-006 | The Manager workspace must show the CEO's latest decision state and comment while preserving the Manager's inability to approve or override the final decision. |
| FR-MGMT-007 | Production authentication and branch/permission checks must be enforced server-side even when the PWA also applies client-side guards. |

## Branch workforce planning and weekly scheduling

| ID | Requirement |
| --- | --- |
| FR-WORKFORCE-001 | A Branch Manager must be able to configure the minimum number of team members required for each approved branch role for each weekday, Monday through Sunday, within the manager's authorized branch. |
| FR-WORKFORCE-002 | Staffing requirements must support roles including entertainers, servers, bartenders, hosts/receptionists, security, drivers, maintenance/technical roles, and other approved branch roles. |
| FR-WORKFORCE-003 | Staffing requirement changes must be branch-scoped, effective-dated, and auditable with actor, previous value, new value, and timestamp. |
| FR-WORKFORCE-004 | The system must preserve separate values for Required, Scheduled, and Checked In staffing by branch, date, shift/period, and role. |
| FR-WORKFORCE-005 | The system must calculate scheduled coverage against the active minimum staffing requirement and identify shortages by role and date. |
| FR-WORKFORCE-006 | The system must calculate actual readiness from verified attendance and identify actual operational shortages separately from scheduling shortages. |
| FR-WORKFORCE-007 | Approved absence and unexpected no-show must remain distinguishable in workforce-readiness reporting. |
| FR-WORKFORCE-008 | The system must alert the authorized Branch Manager when a weekly schedule is below the minimum requirement or when a later leave/status change causes a published shift to fall below requirement. |
| FR-WORKFORCE-009 | The system must alert the authorized Branch Manager when actual attendance creates a critical role shortage during an operating shift. |
| FR-WORKFORCE-010 | CEO-level workforce oversight must show publication timing, schedule version, unresolved gaps, overdue acknowledgements or change requests, the accountable manager, last action, next action, and due date using traceable workflow evidence. |
| FR-WORKFORCE-011 | The system must support an executive drill-down to schedule evidence and an authorized message or tracked follow-up task without making the CEO the routine weekly schedule owner. |

## Weekly shift scheduling

| ID | Requirement |
| --- | --- |
| FR-SHIFT-001 | A Branch Manager must be able to create and publish a weekly shift schedule for team members in the manager's authorized branch. |
| FR-SHIFT-002 | The weekly scheduler must support filtering team members by role and assigning eligible team members to dates and approved shift types. |
| FR-SHIFT-003 | The manager must be able to see authorized leave/availability information needed to make a scheduling decision. |
| FR-SHIFT-004 | Before publication, the system must compare the proposed weekly roster to the branch's active weekday/role staffing requirements and display unresolved shortages. |
| FR-SHIFT-005 | The manager may publish a schedule with an unresolved shortage when business policy permits, but the shortage must remain visible and auditable. |
| FR-SHIFT-006 | Changes to a published shift assignment must retain an audit trail rather than silently rewriting schedule history. |
| FR-SHIFT-007 | Employees must be able to view their published schedule in the internal PWA according to role and branch permissions. |
| FR-SHIFT-008 | A longer calendar view may be provided for planning, but the published weekly roster is the authoritative operational schedule for attendance classification. |
| FR-SHIFT-009 | The system must support backfilling a shortage by assigning an eligible authorized branch team member to the affected shift. |
| FR-SHIFT-010 | Weekly rosters must use explicit Draft, Published, Closed, and Superseded states; a draft does not create an attendance expectation. |
| FR-SHIFT-011 | Publishing must validate branch scope, active employment, role eligibility, approved leave/availability, duplicate or overlapping shifts, and active minimum coverage. |
| FR-SHIFT-012 | A policy-permitted publication below minimum coverage must require a manager reason and retain an open staffing exception. |
| FR-SHIFT-013 | A material change to a published assignment must create an audited roster version, record a reason, notify the affected team member, and return the assignment to acknowledgement pending. |
| FR-SHIFT-014 | Each published assignment must record Assigned, Acknowledged, or Change requested independently from attendance status. |

## Leave and day-off requests

| ID | Requirement |
| --- | --- |
| FR-LEAVE-001 | An authenticated team member must be able to submit a leave or day-off request only for the person's own active branch assignment, with type, start date, end date, reason, submitter, and submitted timestamp. |
| FR-LEAVE-002 | Leave requests must use explicit Pending, Approved, or Rejected states. A pending or rejected request must not change schedule coverage, availability, attendance classification, or pay treatment. |
| FR-LEAVE-003 | The authorized Branch Manager must be able to view and approve or reject requests for the manager's own branch, with a required decision reason, actor, timestamp, and retained source request. Any HR co-approval required by policy remains a separate workflow. |
| FR-LEAVE-004 | Approval must mark the team member unavailable for the approved date range and recalculate affected coverage without deleting or silently rewriting a published assignment. Any resulting shortage remains visible for backfill and follow-up. |
| FR-LEAVE-005 | A leave request, manager decision, attendance evidence, and approved-absence classification must remain separate linked records. Approval alone must not fabricate check-in/out evidence. |
| FR-LEAVE-006 | The team member must be able to view the current state and manager decision reason for the person's own requests; the manager must be able to filter pending and historical requests for the authorized branch. |

## Attendance relationship to schedule

| ID | Requirement |
| --- | --- |
| FR-ATT-001 | A team member must not be classified as late or no-show for a shift unless a valid published shift assignment or other approved authoritative schedule record establishes that attendance was expected. |
| FR-ATT-002 | Late minutes must be calculated from verified clock-in time against the scheduled shift start time. |
| FR-ATT-003 | If a scheduled team member does not attend and no approved absence applies according to policy, the system must create an unexpected/unapproved no-show record. |
| FR-ATT-004 | Branch Managers must be able to review branch attendance exceptions including lateness, unexpected no-show, approved absence, schedule/attendance mismatch, and correction requests. |
| FR-ATT-005 | When policy permits a manager to excuse an incident, the system must retain the original attendance evidence and record a separate audited manager decision controlling downstream penalty treatment. |
| FR-ATT-006 | Branch Managers must be able to inspect every branch lateness and no-show candidate with scheduled time, verified arrival where available, late minutes, source evidence, attendance decision, and downstream penalty-review state. |
| FR-ATT-007 | The system must not calculate a penalty amount, create a deduction, or claim a payable outcome unless an approved effective-dated penalty policy version defines category, formula, evidence, authority, appeal path, and effective date. |
| FR-ATT-008 | Attendance review states and penalty/deduction records must remain separate. Excused or rejected incidents are excluded from downstream penalty processing while confirmed incidents remain policy-pending until an authorized policy workflow acts. |

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

## Monthly sales goal approval

| ID | Requirement |
| --- | --- |
| FR-GOAL-001 | Each branch sales manager must be able to prepare a monthly sales target and action plan before the new month. |
| FR-GOAL-002 | Hermes must generate evidence-based planning recommendations approximately three days before the new month, including focus areas and suggested actions. |
| FR-GOAL-003 | The CEO must be able to review, question, return for revision, approve, or reject a submitted plan. |
| FR-GOAL-004 | Only the CEO’s approval can activate the monthly branch sales target. |
| FR-GOAL-005 | The system must keep each proposal, review comment, revision, approval, and source-data summary in an audit trail. |
| FR-GOAL-006 | The system must display actual sales against the approved target as an achievement percentage and progress bar. |
| FR-GOAL-007 | Hermes may advise, summarize, and remind; it must not approve or silently change a sales target or action plan. |
| FR-GOAL-008 | The Branch Manager's default landing page must show the active CEO-approved monthly target, reconciled actual sales, remaining amount, achievement percentage, approval version, and source freshness for the manager's authorized branch only. |
| FR-GOAL-009 | A draft, submitted, rejected, missing, or expired target must not be presented as an active sales goal or silently compared with actual sales. |
| FR-GOAL-010 | The Branch Manager must not receive company-wide or another branch's target or sales progress unless separately granted an explicit cross-branch permission. |

## Branch Manager customer intelligence

| ID | Requirement |
| --- | --- |
| FR-MCRM-001 | A Branch Manager must be able to search own-branch customer records by name or a permitted phone identifier while the result remains masked and field-projected. |
| FR-MCRM-002 | The manager CRM must show the current source membership level, total confirmed expenditure, average eligible expenditure per completed eligible visit, latest visit, and data freshness. |
| FR-MCRM-003 | The customer directory must support ordering by membership level, total expenditure, average expenditure, and latest visit. |
| FR-MCRM-004 | Full phone numbers must not be included in the browser read model; production full-number lookup must normalize and match server-side, then return only authorized masked fields. |
| FR-MCRM-005 | Search, filtering, sorting, and customer detail access must remain restricted to the manager's authorized branch and must not grant membership-level editing or approval authority. |

## Branch Manager operational service workspace

| ID | Requirement |
| --- | --- |
| FR-MOPS-001 | A Branch Manager must be able to view the manager's own-branch reservation queue and distinguish Requested, Confirmed, Arrived, Completed, and Cancelled states. |
| FR-MOPS-002 | A Branch Manager may create or support an own-branch reservation using a permitted masked customer identifier, visit date/time, party size, and special request; production full-phone matching remains server-side. |
| FR-MOPS-003 | Reservation transitions must validate the current state and preserve branch, actor, source, and update timestamps rather than silently rewriting the lifecycle. |
| FR-MOPS-004 | A Branch Manager must be able to report a maintenance issue with category, location, urgency, description, and created time; final categories, urgency rules, and service-level targets remain governed by CL-023. |
| FR-MOPS-005 | The manager must be able to assign a maintenance request to an authorized technical or facilities role with a due date, while the assigned worker retains responsibility for diagnosis, progress, result, and completion evidence. |
| FR-MOPS-006 | The manager may verify and close submitted maintenance work or return it for rework with a reason; verification must not erase the original request, result, or evidence. |
| FR-MOPS-007 | The manager may receive and triage own-branch service/customer feedback and route it to the accountable owner. |
| FR-MOPS-008 | A people-related or HR-restricted complaint must expose only safe routing metadata to a Branch Manager unless a separate case permission exists; the manager must not view or resolve restricted case content merely because it concerns the branch. |
| FR-MOPS-009 | Branch operations must expose open reservation requests, submitted maintenance work, and unresolved service issues in the Manager's default decision queue. |

## Manager notifications, orders, and CRM handoff

| ID | Requirement |
| --- | --- |
| FR-MNOT-001 | The internal PWA must provide a Manager notification center for material workforce, task, reservation, maintenance, and decision events within the authorized branch. |
| FR-MNOT-002 | Notification records must preserve severity, category, created time, related workflow, read state, and any recorded escalation action. |
| FR-MNOT-003 | A browser-local or PWA notification record must not claim that Slack, SMS, email, or another external channel delivered a message unless provider delivery evidence exists. |
| FR-MNOT-004 | A Branch Manager may issue an own-branch formal instruction to authorized team members with content, audience, due date, and per-recipient acknowledgement evidence. |
| FR-MNOT-005 | Formal instruction acknowledgement is evidence that the recipient received/read the instruction; it must remain separate from attendance, task completion, or disciplinary outcome. |
| FR-MNOT-006 | The Branch Manager CRM may show own-branch, field-projected communication history with masked customer identity, purpose, channel, consent state, delivery evidence, and time. |
| FR-MNOT-007 | A Branch Manager may submit an evidence-based segment or communication request to the authorized CRM/marketing owner; this handoff must not grant the manager campaign-send, consent-override, export, or cross-branch access. |

## Branch Manager rank and membership recommendations

| ID | Requirement |
| --- | --- |
| FR-MREC-001 | The Branch Manager must be able to review the approved 14-day entertainer evaluation evidence and prepare a recommendation while keeping the current source rank separate from the proposed rank. |
| FR-MREC-002 | An entertainer recommendation must preserve the evidence summary, manager reason, policy-version state, submission state, and later authorized decision comment. |
| FR-MREC-003 | Only the CEO final-decision workflow may approve, return, or reject an entertainer rank recommendation; submission by a Branch Manager must not change the effective rank. |
| FR-MREC-004 | For customer membership evaluation, a Branch Manager may support the calculated result or record a retain-current/exception reason according to policy, but must not directly assign or approve a membership level. |
| FR-MREC-005 | Missing policy weights, thresholds, hard gates, branch ranges, or effective versions must remain visible as a decision lock and must not be invented in the client UI. |
| FR-MREC-006 | Every recommendation workflow must remain branch-scoped, auditable, source-preserving, and protected against acting on stale evidence in production. |

## Branch setup and scalability

| ID | Requirement |
| --- | --- |
| FR-BRANCH-001 | An authorized administrator must be able to create and activate a new branch without a software deployment. |
| FR-BRANCH-002 | Branch setup must support company/cost-center mapping, timezone, managers, team assignments, role access, operational settings, notification configuration, pricing, and reporting scope. |
| FR-BRANCH-003 | New branches must inherit approved default policies and templates while preserving authorized branch-specific configuration. |
| FR-BRANCH-004 | Historical records must retain the branch and effective policy associated with the event when it occurred. |

## Call Operator and CallPro

- What task states are required beyond open and complete?
- Can managers assign across branches, or only within their own branch?
- Who verifies or accepts a submitted result?
- Can a completed task be reopened, and who can do so?
- Which notification channels, escalation rules, and reminder timing are required?
- What image size, retention, privacy, and access rules apply?
- What exact dashboard metrics are required for employees, managers, and the CEO?
- Should the business require a minimum lead time before a weekly schedule is published, and what is the cutoff for ordinary schedule changes?
- Which approved roles, if any, may edit another branch's staffing template or weekly schedule?
