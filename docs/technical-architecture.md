# Technical Architecture

## Architecture decision

VIP Club will use ERPNext for stable enterprise foundations and a dedicated custom Frappe application for club-specific workflows, policies, portals, integrations, reports, and AI-assisted capabilities.

Do not modify ERPNext core. Extend it with custom DocTypes, server-side domain services, Frappe Workflows, background jobs, reports, APIs, portal/PWA pages, fixtures, and migrations.

## System context

~~~text
User channels
  Entertainer PWA | Employee PWA | Manager / CEO web
  Reception web | Accounting web | Customer PWA
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
~~~

## User channels

| Channel | Main users | Primary purpose |
| --- | --- | --- |
| Entertainer PWA | Entertainers, lead entertainers | Schedule, attendance, rank, income, settlements, loan requests, tasks, reservations, and benefits. |
| Employee PWA | Servers, bartenders, maintenance, security, drivers, and other staff | Tasks, schedules, notices, evidence, and role-appropriate operational work. |
| Manager / CEO web | CEO, branch managers, sales managers | Goals, approvals, tasks, dashboards, workforce, customer, membership, and branch performance. |
| Reception web | Hosts and receptionists | Customer registration, consent, profile lookup, reservations, membership recognition, privilege checks, and service workflows. |
| Accounting web | General, transaction, payment accountants, and accounting clerks | Settlements, salary, payments, point economics, reconciliation, and financial evidence. |
| Customer PWA | VIP customers and hosts/receptionists | Registration, consent, one membership status, points, branch-eligible privileges, reservations, and approved interactions. |

Internal notifications use the PWA. Customer communications are consent-based and use the member's approved channel preferences.

## ERPNext and Frappe responsibilities

| Need | Reuse or custom approach |
| --- | --- |
| Legal entity and accounting structure | Reuse ERPNext Company, Cost Center, and approved accounting dimensions. |
| User and role access | Reuse Frappe User, Role, Role Profile, and User Permission; add branch and action/field scope where needed. |
| Workforce records | Reuse ERPNext Employee, Shift Type, Shift Assignment, Employee Checkin, Attendance, and Leave Application; extend through custom domain records. |
| Customer records | Reuse Customer carefully; add identity matching, consent, channel preferences, visits, reservation, membership, points, privileges, and privacy controls. |
| Tasks and approvals | Reuse or wrap Task, Project, Workflow, Notification, Communication, and File where they meet required UX and permission rules. |
| Finance evidence | Reuse Payment Entry, Journal Entry, attachments, and reports where appropriate; add settlement, loan, point-liability, and policy explanation records. |
| VIP Club domain | Build as custom Frappe modules and DocTypes. |

## Custom domain boundaries

~~~text
organization | workforce | tasks | attendance | goals
customers | loyalty | reservations | ranking | income
payroll | loans | complaints | surveys | maintenance
transfers | messaging | audit | integrations | reports | hermes
~~~

Each domain owns its business rules and validates commands server-side. Cross-domain actions use explicit services and auditable events.

## Membership and loyalty architecture

CRM owns the membership state. POS must not be asked to calculate dynamic membership discounts.

~~~text
POS verified transaction/refund
  → idempotent transaction import
  → eligible-spend classification
  → point earn/reversal ledger
  → member qualification balance

Anniversary scheduler
  → 12-month policy evaluation
  → retain / upgrade decision or 30-day grace
  → at most one-level downgrade after grace
  → status history + explanation + notification

Branch service request
  → read one company-wide status
  → evaluate branch-specific privilege policy
  → check/reset quota
  → redeem or reject with reason
~~~

Architecture invariants:

- one membership account, one visible Bronze-to-Black-Diamond status, and one point account per member;
- the same visible status is returned for every branch;
- branch-specific policy evaluates privilege eligibility separately from status;
- every point event is an immutable ledger entry; balances are derived or safely cached and reconcilable;
- transaction imports and point awards are idempotent;
- refunds, cancellations, expiry, and corrections create reversals or adjustments rather than editing history;
- the policy version used for status, point, and privilege decisions is retained;
- manual launch assignments require recorded reason and CEO approval;
- point rates, thresholds, conversion, expiry, quotas, and notice windows are effective-dated configuration, not code constants.

## Data and policy principles

- One company with four branches is the proposed default, pending legal/accounting confirmation.
- Operational custom records carry branch scope.
- Permissions are deny-by-default and enforced by role, branch, ownership, action, and field sensitivity.
- Policies, thresholds, percentages, penalties, privileges, points, and formulas are versioned and effective-dated.
- Financial, rank, point, loyalty, and status changes are corrected by reversal or adjustment, never silent deletion.
- Calculations retain source evidence, policy version, actor, time, and explanation.

## Workflows and background jobs

Use human approval workflows for attendance corrections, loan decisions, settlement review, sales-goal approval, manual membership assignments, loyalty adjustments, complaint handling, maintenance approval, payroll approval, and policy publication.

Use server-enforced state machines for technical lifecycle states and invariants.

Expected scheduled jobs include:

- POS, attendance, and reservation reconciliation;
- transaction-based point earn, reversal, expiry, and liability reconciliation;
- membership anniversary review, 30-day grace monitoring, and shortfall notifications;
- monthly and annual privilege-quota reset;
- daily customer intelligence refresh;
- monthly sales-goal planning recommendations before month-end;
- afternoon PWA goal reminders;
- settlement calculation and loan repayment posting;
- campaign delivery and outcome collection;
- integration retries, data-retention tasks, and audit-integrity checks.

All jobs must be idempotent, observable, and replayable where safe.

## Integration and API rules

- POS supplies verified customer identifier, branch, transaction amount, timestamp, line or category data needed for eligibility, source reference, and refund/correction events.
- CRM returns status, point balance, eligible privileges, quota availability, and authorized redemption results to role-appropriate clients.
- Validate calculations and permissions on the server; never trust client totals.
- Use idempotency keys, version checks, correlation IDs, retries, and reconciliation for integrations.
- Record source-system references and delivery states.
- Do not expose generic unrestricted data access to Hermes.
- Hermes can summarize, explain, recommend, draft, and remind using authorized data; it cannot approve consequential decisions or silently change business records.

## Environments and operations

Required environments are local development, staging/UAT, and production. Each needs controlled migrations, secret management, backups and restore tests, monitoring/logging, worker/scheduler health checks, integration test mode, rollback, and disaster-recovery procedures.

## Repository audit required

The exact app name, ERPNext/Frappe versions, bench/container commands, database topology, deployment workflow, CI pipeline, and currently available integrations must be verified from the real repository and environment before implementation.

## PWA application decision

Use one internal role-aware PWA for all employees and internal team members. Every person has an individual username and password. After sign-in, the PWA adapts its workspace, dashboard, navigation, tasks, and permitted actions based on the user's assigned role, branch, and ownership scope.

This is one application and codebase, not separate apps per internal role. Permission enforcement remains server-side; hiding a screen or menu is never a security control.

Use a separate customer-facing PWA for customer registration, one membership status, points, branch-eligible privileges, reservations, and consent-based interactions. It has distinct user experience and privacy boundaries.

## Branch scalability decision

The system starts with four branches but must support future branches without code changes. An authorized administrator can create a branch and configure its company/cost-center mapping, timezone, managers, team assignments, role access, operational settings, notification configuration, reporting scope, and branch privilege policy.

New branches inherit approved default policies and configuration templates. A branch may vary privilege eligibility where policy permits, but it must not create a second visible membership status or point balance for the same member. Historical records remain associated with the branch that owned them at the time of the event.
