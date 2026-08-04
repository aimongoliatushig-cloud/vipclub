# Functional Requirements

This is an evidence-based working draft derived from project discussions. Items marked **Open question** need confirmation before implementation.

## Roles

| Role | Primary responsibility |
| --- | --- |
| CEO | Company-wide oversight, cross-branch task assignment, and designated approvals. |
| Branch manager | Branch operations, team management, in-branch task assignment, local configuration within approved scope, and proposing and executing monthly sales targets and action plans to improve branch sales. |
| Entertainer | Uses the workforce portal for schedule, attendance, income, rank, reservations, benefits, tasks, and communication. |
| Lead entertainer | Oversees entertainer standards, coaching, readiness, and operational follow-up; exact approval and disciplinary authority remains to be defined. |
| Server | Supports branch service operations and receives role-appropriate tasks, schedules, and notifications. |
| Bartender | Supports beverage/service operations and receives role-appropriate tasks, schedules, and notifications. |
| Host or receptionist | Finds or creates customer profiles, manages customer onboarding and consent, and supports reservations. |
| VIP customer | Has a member profile, consent preferences, reservations, loyalty level, benefits, cashback, and communications. |
| Marketing and content manager | Creates approved customer segments, campaigns, content, and marketing reporting. |
| General accountant | Oversees accounting records, reconciliations, financial controls, and approved reporting. |
| Transaction accountant | Records and reconciles operating transactions, settlements, and supporting financial evidence. |
| Payment accountant | Prepares and records authorized payments and maintains payment evidence and status. |
| Accounting clerk | Supports transaction entry, record maintenance, evidence collection, and assigned reconciliation work under financial controls. |
| Human resources manager | Owns employee lifecycle, people policy, staffing, personnel records, and approved HR workflows. |
| Purchasing manager | Manages approved procurement requests, suppliers, purchasing workflow, and purchasing records. |
| Technical assistant | Receives, diagnoses, updates, and closes assigned technical maintenance and equipment-support work with evidence. |
| Carpenter | Receives and completes assigned branch facilities, fixture, and repair work with progress updates and completion evidence. |
| Security officer | Supports visitor and branch safety, incident reporting, and approved security procedures. |
| Driver | Provides approved safe transport for eligible VIP visitors and records the assigned trip according to privacy and safety rules. |
| System administrator | Manages authorized system configuration, access, policy setup, and audit-support functions. |

### Role-design note

A role responsibility describes what a person owns. Individual capabilities—such as an entertainer requesting a loan—belong in the relevant workflow requirements, not in this role catalog.

The final role-permission matrix must define branch scope, data visibility, approval rights, and segregation of duties for each role. Job titles do not automatically grant unrestricted financial or customer-data access.

## Workforce task management

| ID | Requirement |
| --- | --- |
| FR-TASK-001 | The system must support teams across four branches. |
| FR-TASK-002 | The CEO must be able to assign a task to any employee. |
| FR-TASK-003 | A branch manager must be able to assign tasks within the manager's own branch and team. |
| FR-TASK-004 | The system must notify task assignees. |
| FR-TASK-005 | A task must retain comments and conversation history. |
| FR-TASK-006 | An assignee must be able to mark a task complete and enter an execution result. |
| FR-TASK-007 | An assignee must be able to attach images as completion evidence when needed. |
| FR-TASK-008 | A task must retain execution notes. |
| FR-TASK-009 | Dashboards must show incomplete and completed work, deadlines, and completion statistics. |


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

## Open questions with material delivery impact

- What task states are required beyond open and complete?
- Can managers assign across branches, or only within their own branch?
- Who verifies or accepts a submitted result?
- Can a completed task be reopened, and who can do so?
- Which notification channels, escalation rules, and reminder timing are required?
- What image size, retention, privacy, and access rules apply?
- What exact dashboard metrics are required for employees, managers, and the CEO?
