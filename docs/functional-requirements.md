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

## Customer membership evaluation and approval

| ID | Requirement |
| --- | --- |
| FR-CRM-017 | Every eligible completed visit and relevant financial correction must trigger membership reevaluation. |
| FR-CRM-018 | Eligibility must use eligible net expenditure divided by eligible completed visits in the effective branch-policy window. |
| FR-CRM-019 | The system must store an immutable calculation snapshot with source records, policy version, and explanation. |
| FR-CRM-020 | When calculated and current approved levels differ, the system must create or refresh a manager recommendation. |
| FR-CRM-021 | No upgrade or downgrade takes effect without an authorized manager decision. |
| FR-CRM-022 | Managers must be able to approve, keep current, or review later within branch and approval scope. |
| FR-CRM-023 | Keep current applies only to that evaluation and must not suppress later calculations or renewed recommendations. |
| FR-CRM-024 | Pending recommendations must not change effective benefits, cashback rules, or customer-visible level. |
| FR-CRM-025 | Recommendation history, repeated calculations, decisions, reasons, escalation, and level assignments must remain auditable. |
| FR-CRM-026 | Authorized managers must configure versioned branch-specific membership thresholds and policy controls. |

## Internal team complaints and compliments

| ID | Requirement |
| --- | --- |
| FR-MSG-001 | Every active employee or team member, including an entertainer, must be able to create an internal message of type Complaint or Compliment about/to a selected team member. |
| FR-MSG-002 | A complaint submission must require the selected subject and non-empty text explaining what happened and why the complaint is made. |
| FR-MSG-003 | Complaint content must be delivered to and visible only in the central message center for the CEO and branch managers authorized for the selected subject's relevant branch. |
| FR-MSG-004 | The employee named as complaint subject must not receive, view, or respond to the complaint. |
| FR-MSG-005 | The complaint sender receives a submission confirmation but must not receive management-only moderation, investigation, or review data unless a later rule explicitly allows it. |
| FR-MSG-006 | A compliment submission must require the selected recipient and non-empty positive text, deliver the compliment to that recipient, and make it visible to the CEO and managers authorized for the relevant branch. |
| FR-MSG-007 | CEO reads have company-wide scope; manager reads must be restricted server-side to records for branches/teams within the manager's current authorization. |
| FR-MSG-008 | Each record must retain sender, selected subject/recipient, message type, branch, text, creation time, delivery/read states, moderation/review status, attachment references if later enabled, and immutable audit/correction history. |
| FR-MSG-009 | Internal employee complaints are distinct from the 15% customer-complaints ranking factor and must never automatically reduce customer complaints, attitude, or any other score. |
| FR-MSG-010 | A branch manager may reference an internal complaint as evidence in the separate attitude-incident workflow, but only a branch-manager finding of substantiated and a recorded discretionary incident-day deduction may change attitude. |
| FR-MSG-011 | Message APIs, notifications, lists, search, reports, exports, and deep links must enforce the same type-specific delivery and field-level visibility; complaint subjects must not infer content from counts, previews, notifications, or access-error differences. |
| FR-MSG-012 | Sender anonymity/confidentiality controls, retention, appeals/escalation, compliment response rights, and attachment enablement remain open policy decisions and must not be implemented as hidden defaults. |

### Customer portal entertainer complaints and praise

| ID | Requirement |
| --- | --- |
| FR-CMSG-001 | The separate customer helper portal must let an authenticated, identified customer select a specific entertainer and submit either a Complaint or Praise with required experience text. Anonymous submission is not allowed. |
| FR-CMSG-002 | Submission must require the applicable VIP room and at least one validated visit, reservation, or session reference, and must preserve customer, room, branch, experience context, selected entertainer, type, text, source portal, and timestamps. |
| FR-CMSG-003 | A customer complaint must route into the shared management message center and be visible only to the CEO and managers authorized for the relevant branch; the selected entertainer must receive no delivery, view, preview, or response route. |
| FR-CMSG-004 | Customer praise must be delivered to the selected entertainer's internal messaging center and also be visible to the CEO and relevant authorized branch managers. |
| FR-CMSG-005 | The shared message center and all reports/APIs must distinguish `customer_portal` messages from `internal_team` employee-submitted messages. |
| FR-CMSG-006 | Customer PII, VIP-room context, and visit/reservation/session references must be protected with server-side branch/role authorization, masking, and field-level policy. Authorized management has scoped oversight; a praised entertainer sees only customer/room fields explicitly allowed by the approved field-level policy. |
| FR-CMSG-007 | Customer-message records must retain delivery/read/review states and immutable audit/correction history. |
| FR-CMSG-008 | A customer complaint is only potential evidence for the 15% customer-complaints component. Submission must not change any score until an approved verification/review and normalization rule is applied. |
| FR-CMSG-009 | Customer praise has no automatic ranking effect unless a later approved policy explicitly defines one. |
| FR-CMSG-010 | Exact customer/room fields visible to a praised entertainer, retention, and escalation/appeal treatment remain open policy decisions. |

## Entertainer performance and ranking

| ID | Requirement |
| --- | --- |
| FR-RANK-001 | The entertainer ranking score must use exactly eight weighted components: attendance including no-shows and lateness (10%), customer complaints (15%), sales (40%), entertaining or pole-dancing skill (5%), cleanliness and beauty (5%), shift effort (10%), personal development (5%), and entertainer attitude (10%). |
| FR-RANK-002 | The component weights must total 100%, be versioned, and be effective-dated; clients must not maintain independent weights. |
| FR-RANK-003 | A branch manager and a lead entertainer must be able to enter component scores permitted for their role within their authorized branch; attitude incident findings and deductions are branch-manager-only. |
| FR-RANK-004 | Each score entry must retain the entertainer, branch, evaluation period, component, value, source evidence, actor, actor role, and timestamp. |
| FR-RANK-005 | Corrections must preserve the original value, corrected value, reason, actor, and time; entries must not be silently overwritten. |
| FR-RANK-006 | A ranking result must expose all eight normalized component scores, weights, unrounded weighted contributions, summed and displayed total scores, policy version, and source evidence. |
| FR-RANK-007 | The system must distinguish imported or calculated source values from manually assessed values. |
| FR-RANK-008 | Missing, stale, corrected, or disputed component data must be visible and handled by an approved versioned rule rather than silently assigned a perfect or zero score or causing weight rebalancing. |
| FR-RANK-009 | Attendance, no-show, and lateness inputs must be normalized inside the single 10% attendance component; they must not receive separate weights. |
| FR-RANK-010 | Every complete evaluation must include personal development as a 5% component backed by policy-approved evidence. |
| FR-RANK-011 | The total must equal the sum of all eight unrounded `normalized score × weight / 100` contributions, with rounding applied only under the policy version's display rule. |
| FR-RANK-012 | Ranking API, PWA, dashboard, report, and export views must expose the eight-factor breakdown appropriate to the user's permissions; a total-only representation is insufficient. |
| FR-RANK-013 | Corrections, appeals, and overrides must create auditable history and preserve the original ranking snapshot. |
| FR-RANK-014 | The system must calculate and retain an explainable performance score for each entertainer for each scoring day. |
| FR-RANK-015 | The sales component must be derived from verified entertainer-attributed point-of-sale data and must not be entered as an unsupported free-form value. |
| FR-RANK-016 | A branch manager or lead entertainer must be able to enter an entertaining-skill score from 0 through 100 after auditing the entertainer's dancing or other approved entertaining skill. |
| FR-RANK-017 | An improved entertaining-skill score must be recorded as a new audited entry, capped at 100, while preserving prior score history. |
| FR-RANK-018 | Periodic rank evaluation must use the approved rolling window of daily scores and remain distinguishable from an individual daily score. |
| FR-RANK-019 | A branch manager or lead entertainer must enter cleanliness and beauty every scoring day on a 0-100 scale. |
| FR-RANK-020 | The daily calculation must use the most recently approved 0-100 level for entertaining or pole-dancing skill and personal development. |
| FR-RANK-021 | A persistent skill or personal-development level may be increased only after an audit by a branch manager or lead entertainer; the new level is capped at 100 and prior levels remain in history. |
| FR-RANK-022 | The unrounded daily weighted total must remain from 0 through 100 and is the primary quantitative input for rank movement, subject to the effective policy's gates and evaluation window. |
| FR-RANK-023 | A valid unrounded daily weighted score must classify as Level 1 when `90 <= score <= 100`, Level 2 when `80 <= score < 90`, Level 3 when `70 <= score < 80`, and Rookie/unranked when `0 <= score < 70`. |
| FR-RANK-024 | A daily weighted score below 0 or above 100 must be rejected or flagged as invalid and must not receive a rank classification. |
| FR-RANK-025 | An authorized branch manager must configure an independent entertainer sales benchmark table for only the manager's authorized branch; no company-wide shared or fallback table may be assumed. |
| FR-RANK-026 | Each branch table must be keyed by branch, calendar year, and version and contain exactly one entry for each of the 12 calendar months. |
| FR-RANK-027 | Every month must contain configurable currency minimum and maximum sales benchmarks for Level 1, Level 2, and Level 3, with explicit Rookie/unranked handling. |
| FR-RANK-028 | Monthly benchmark values must be non-negative, each minimum must not exceed its maximum, and Level 1 endpoints must not be lower than Level 2 endpoints, which must not be lower than Level 3 endpoints. |
| FR-RANK-029 | Sales benchmark configuration must retain currency, branch, year/effective period, actor, timestamp, version, before/after values, and audit history. |
| FR-RANK-030 | Daily verified entertainer-attributed POS sales must use the applicable branch/year/month/level benchmark; the normalization formula must be supplied by an approved versioned rule. |
| FR-RANK-031 | Entertainer Ranking Settings must support entering, copying, validating, reviewing, and publishing a 12-month grid for the manager's own branch and must prevent unauthorized or cross-branch edits. |
| FR-RANK-032 | Two branches may have different benchmark ranges for the same month and year, and ranking calculations must resolve the table by entertainer branch without using another branch or company-wide fallback. |
| FR-RANK-033 | Entertainer attitude must default to 100 for each scoring day when no relevant incident exists; no routine manual attitude entry is required. |
| FR-RANK-034 | Only a specific incident or complaint alleging an attitude/behavior problem may trigger an attitude review. |
| FR-RANK-035 | An authorized branch manager for the entertainer's branch must audit the incident and record a finding of substantiated or unsubstantiated; lead entertainers must not finalize the incident or deduction. |
| FR-RANK-036 | An unsubstantiated allegation must have a zero deduction and leave the attitude score at 100. |
| FR-RANK-037 | For a substantiated incident, the branch manager must record a discretionary deduction and a resulting attitude score bounded from 0 through 100. |
| FR-RANK-038 | A substantiated attitude deduction applies only to the incident/scoring day and must not carry forward; the next day returns to 100 unless a separate incident for that day is substantiated. |
| FR-RANK-039 | Every attitude decision must retain incident/evidence references, entertainer, branch, scoring/effective date, manager and role, finding, deduction, resulting score, reason, timestamp, and correction/appeal history. |
| FR-RANK-040 | The attitude deduction rubric, appeal authority, and interaction with the customer-complaints factor must be versioned and approved; clients and individual evaluators must not invent them. |
| FR-RANK-041 | Each entertainer must have exactly seven required public-performance checklist items for each branch, shift, and scoring day. |
| FR-RANK-042 | An authorized branch manager or lead entertainer for the branch must be able to submit the seven boolean item states with entertainer, branch, shift, scoring date, completed/missed counts, submitter/role, timestamp, evidence/notes where required, and correction history. |
| FR-RANK-043 | Shift checklist validation must require `completed_count + missed_count = 7` and both counts must equal the seven boolean item states. |
| FR-RANK-044 | Shift-effort component score must equal `completed_count / 7 × 100`, and its weighted contribution must equal `component score × 10 / 100`. |
| FR-RANK-045 | Shift-effort component and contribution values must remain unrounded until all eight component contributions are summed; 7/7 yields 100 and 10 points, 5/7 yields `71.428571...` and `7.142857...`, and 0/7 yields 0 and 0. |
| FR-RANK-046 | One canonical current shift checklist may exist per entertainer, branch, shift, and scoring day; corrections must preserve audited history. |
| FR-RANK-047 | Extra performances beyond seven must not add checklist items, increase the component above 100, or create extra weighted credit unless a later policy decision explicitly allows it. |
| FR-RANK-048 | Each missed one of the seven public-performance items must create a monetary penalty in addition to reducing shift effort; the two effects must remain separately displayed and stored. |
| FR-RANK-049 | An authorized branch manager must configure a non-negative currency amount per missed performance for only the manager's authorized branch in Entertainer Ranking Settings. |
| FR-RANK-050 | A per-miss setting must retain branch, currency, amount, effective-from date/time, version/status, actor, timestamp, reason, and audit history. |
| FR-RANK-051 | Monetary penalty must equal `missed_count × effective branch amount_per_miss`. |
| FR-RANK-052 | Each checklist result must retain missed count, setting/version, per-miss amount, penalty amount/currency, evidence, and correction/reversal links. |
| FR-RANK-053 | A later setting version must not retroactively change penalties already calculated and stored for earlier scoring dates. |
| FR-RANK-054 | Shift ranking score must continue to use `completed/7 × 100` independently of the branch monetary amount. |
| FR-RANK-055 | The monetary penalty must post as an itemized deduction in the entertainer's canonical three-day settlement/payout calculation built from verified attributed POS sales. |
| FR-RANK-056 | The settlement statement/paystub-equivalent line must show missed count, per-miss amount, total deduction, currency, source shift/checklist, branch setting/version, and resulting net settlement impact. |
| FR-RANK-057 | Corrections or reversals must create auditable linked settlement line items and flow into the pay calculation without rewriting historical checklist, setting, or settlement source records. |
| FR-RANK-058 | Settlement processing timing, approval/reversal authority, and legal/policy limits remain open and must not be implemented as hidden assumptions. |
| FR-RANK-059 | An authorized branch manager must configure the applicable branch/shift required ready time, non-negative per-minute lateness amount, and non-negative fixed no-show amount with currency, effective time, version/status, reason, actor/time, and audit history. |
| FR-RANK-060 | For a scheduled entertainer arriving after required ready time, lateness deduction must equal `lateness_minutes × effective branch amount_per_minute_late`. |
| FR-RANK-061 | For a scheduled shift classified no-show, only the effective fixed branch no-show penalty applies; lateness minutes must not be calculated and no lateness charge may exist for that shift. |
| FR-RANK-062 | Attendance penalty results must retain shift, branch, ready time, actual arrival/check-in, lateness minutes, no-show status, setting/version, rate/fixed amount, currency, calculation, evidence, and correction/reversal links. |
| FR-RANK-063 | Attendance settings must be branch-scoped, manager-authorized, effective-dated, audited, non-negative, and non-retroactive. |
| FR-RANK-064 | Lateness and no-show penalties must post as separate itemized three-day settlement deductions, alongside missed-performance deductions, without changing how attendance/no-show/lateness feed the 10% ranking factor. |

### Open entertainer-ranking decisions

- May a lead entertainer enter a score for themself?
- If both the branch manager and lead entertainer enter a score for the same component and period, which value is used or how are they combined?
- Who reviews and finalizes an evaluation, and who may reopen it?
- What evidence is required for each manually assessed component?
- What exact versioned formula normalizes daily verified POS sales against the applicable monthly branch benchmark?
- What exact attitude deduction/evidence rubric applies, who decides appeals, and may the same incident also affect customer complaints?

## Open questions with material delivery impact

- What task states are required beyond open and complete?
- Can managers assign across branches, or only within their own branch?
- Who verifies or accepts a submitted result?
- Can a completed task be reopened, and who can do so?
- Which notification channels, escalation rules, and reminder timing are required?
- What image size, retention, privacy, and access rules apply?
- What exact dashboard metrics are required for employees, managers, and the CEO?
- Should the business require a minimum lead time before a weekly schedule is published, and what is the cutoff for ordinary schedule changes?
- Which approved roles, if any, may edit another branch's staffing template or weekly schedule?
