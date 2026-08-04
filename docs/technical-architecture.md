# Technical Architecture

## Architecture decision

VIP Club will use ERPNext for stable enterprise foundations and a dedicated custom Frappe application for club-specific workflows, policies, portals, integrations, reports, and AI-assisted capabilities.

Do not modify ERPNext core. Extend it with custom DocTypes, server-side domain services, Frappe Workflows, background jobs, reports, APIs, portal/PWA pages, fixtures, and migrations.

## System context

```text
User channels
  Entertainer PWA | Employee PWA | Manager / CEO web
  Reception web | Accounting web | Customer registration PWA
  Hermes assistant
        ↓
Frappe application and API
  Authentication | Role and branch permissions | Domain services
  Workflows | Jobs | Notifications | Audit
        ↓
ERPNext foundation + VIP Club custom app
  Company | Employees | Customers | Accounting | Custom DocTypes
        ↓
MariaDB | Redis queues/cache | File/evidence storage
        ↓
POS | Attendance | Messaging | Bank | E-Barimt adapters
```

## User channels

| Channel | Main users | Primary purpose |
| --- | --- | --- |
| Entertainer PWA | Entertainers, lead entertainers | Schedule, attendance, rank, income, settlements, loan requests, tasks, reservations, and benefits. |
| Employee PWA | Servers, bartenders, maintenance, security, drivers, and other staff | Tasks, schedules, notices, evidence, and role-appropriate operational work. |
| Manager / CEO web | CEO, branch managers, sales managers | Goals, approvals, tasks, dashboards, workforce, customer, and branch performance. |
| Reception web | Hosts and receptionists | Customer registration, consent, profile lookup, reservations, and service workflows. |
| Accounting web | General, transaction, payment accountants, and accounting clerks | Settlements, salary, payments, reconciliation, and financial evidence. |
| Customer registration PWA | VIP customers and hosts/receptionists | Registration, consent, membership, benefits, cashback, and approved customer interactions. |

Internal notifications use the PWA. Customer marketing communications are consent-based and use the member's approved channel preferences.

## ERPNext and Frappe responsibilities

| Need | Reuse or custom approach |
| --- | --- |
| Legal entity and accounting structure | Reuse ERPNext Company, Cost Center, and approved accounting dimensions. |
| User and role access | Reuse Frappe User, Role, Role Profile, and User Permission; add branch and action/field scope where needed. |
| Workforce records | Reuse ERPNext Employee, Shift Type, Shift Assignment, Employee Checkin, Attendance, and Leave Application; extend through custom domain records. |
| Customer records | Reuse Customer carefully; add identity matching, consent, channel preferences, visits, reservation, loyalty, and privacy controls. |
| Tasks and approvals | Reuse or wrap Task, Project, Workflow, Notification, Communication, and File where they meet required UX and permission rules. |
| Finance evidence | Reuse Payment Entry, Journal Entry, attachments, and reports where appropriate; add settlement, loan, and policy explanation records. |
| VIP Club domain | Build as custom Frappe modules and DocTypes. |

## Custom domain boundaries

```text
organization | workforce | tasks | attendance | goals
customers | loyalty | reservations | ranking | income
payroll | loans | complaints | surveys | maintenance
transfers | messaging | audit | integrations | reports | hermes
```

Each domain owns its business rules and validates commands server-side. Cross-domain actions use explicit services and auditable events.

## Data and policy principles

- One company with four branches is the proposed default, pending legal/accounting confirmation.
- Operational custom records carry branch scope.
- Permissions are deny-by-default and enforced by role, branch, ownership, action, and field sensitivity.
- Policies, thresholds, percentages, penalties, benefits, and formulas are versioned and effective-dated.
- Financial, rank, loyalty, and status changes are corrected by reversal or adjustment, never silent deletion.
- Calculations retain source evidence, policy version, actor, time, and explanation.

## Workflows and background jobs

Use human approval workflows for attendance corrections, loan decisions, settlement review, sales-goal approval, loyalty adjustments, complaint handling, maintenance approval, payroll approval, and policy publication.

Use server-enforced state machines for technical lifecycle states and invariants.

Expected scheduled jobs include:

- POS, attendance, and reservation reconciliation;
- daily performance and loyalty evaluation;
- monthly sales-goal planning recommendations before month-end;
- afternoon PWA goal reminders;
- settlement calculation and loan repayment posting;
- campaign delivery and outcome collection;
- integration retries, data-retention tasks, and audit-integrity checks.

All jobs must be idempotent, observable, and replayable where safe.

## Integration and API rules

- Validate calculations and permissions on the server; never trust client totals.
- Use idempotency keys, version checks, correlation IDs, retries, and reconciliation for integrations.
- Record source-system references and delivery states.
- Do not expose generic unrestricted data access to Hermes.
- Hermes can summarize, explain, recommend, draft, and remind using authorized data; it cannot approve consequential decisions or silently change business records.

## Environments and operations

Required environments are local development, staging/UAT, and production. Each needs controlled migrations, secret management, backups and restore tests, monitoring/logging, worker/scheduler health checks, integration test mode, rollback, and disaster-recovery procedures.

## Repository audit required

The exact app name, ERPNext/Frappe versions, bench/container commands, database topology, deployment workflow, CI pipeline, and currently available integrations must be verified from the real repository and environment before implementation.
