# Development Guide

## Purpose

This guide defines how the VIP Club system should be built and changed safely. The target platform is ERPNext with a dedicated custom Frappe app for VIP Club logic, user experiences, policies, integrations, and reports.

## Architecture guardrails

- Reuse ERPNext and Frappe foundation records where they fit: Company, Employee, User, Shift, Attendance, Leave, Customer, Task, Workflow, File, Notifications, reports, and accounting evidence.
- Build club-specific behavior in a custom Frappe app; do not modify ERPNext core.
- Keep business domains separate: organization, workforce, tasks, attendance, customers, loyalty, reservations, ranking, income, loans, messaging, audit, integrations, and reports.
- Enforce role and branch permissions on the server for every query and command.
- Treat GitHub Markdown as the business knowledge base and Linear as delivery tracking.
- Never silently alter financial, policy, rank, loyalty, or status records; use auditable reversal or adjustment flows.

## Delivery workflow

1. Read the relevant knowledge-base documents and linked Linear work item.
2. Confirm whether each rule is confirmed, proposed, or an open decision.
3. Map the change to ERPNext reuse, custom records, integration, workflow, user interface, reports, security, and tests.
4. Implement the smallest complete vertical slice.
5. Add or update unit, integration, permission, workflow, audit, and user-journey tests.
6. Update documentation, diagrams, decision records, and the Linear item.
7. Validate in staging/UAT before production release.

## Quality and safety standards

- Validate calculations and authorization server-side; never trust client totals.
- Every consequential calculation must expose its source records, policy version, and human-readable explanation.
- Use effective-dated policy versions for percentages, thresholds, penalties, benefits, and membership rules.
- Use idempotency keys, retries, reconciliation, and monitoring for external integrations.
- Record actor, time, branch, reason, policy version, and before/after summary for critical actions.
- Build mobile workflows with three to five primary actions per screen, large controls, clear statuses, and Mongolian-first wording.
- Use coherent seed data across workspaces, portals, reports, and tests.
- Do not create disconnected mock screens; test full workflows through the real domain and permission layers.

## Environment model

The solution requires local development, staging/UAT, and production environments. Each must define:

- controlled migrations and fixtures;
- secret management;
- database backup and restore testing;
- worker and scheduler health;
- monitoring and logging;
- integration test or sandbox mode;
- rollback procedure and disaster-recovery runbook.

## Automation and background jobs

Expected scheduled work includes POS and attendance reconciliation, reservation synchronization, rank and loyalty evaluation, goal snapshots, reminders, settlement calculation, loan repayment posting, campaign delivery, integration retries, and audit integrity checks.

Every background job must be idempotent, observable, replayable where safe, and linked to source evidence.

## Pull-request readiness checklist

- Scope is linked to a documented requirement and acceptance criteria.
- Open decisions were not implemented as hidden constants.
- Branch, role, ownership, and field-level permissions were tested.
- Error, empty, loading, denied, and stale-data states are handled.
- Audit events and correction paths exist where needed.
- Documentation and diagrams match the behavior.
- Tests, migrations, and release notes are included.
- No unrelated changes are included.

## Repository-specific setup — pending audit

The exact Frappe/ERPNext versions, custom-app name, bench or container commands, database topology, deployment process, current integrations, test commands, and CI workflow must be documented after the repository and environment audit. This guide intentionally does not invent those details.


## PWA experience decision

Build one internal PWA for all internal roles, with individual credentials and role- and branch-aware workspaces. Reuse shared components and workflows, but present only the actions and data appropriate to each role. Keep the customer-facing PWA separate.

Test permissions server-side for every role, branch, record, and sensitive field. UI visibility tests complement but never replace permission tests.
