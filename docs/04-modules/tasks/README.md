---
type: module
status: selected-baseline
last_reviewed: 2026-08-07
---

# Tasks Module

## Purpose

Use ERPNext/Frappe Project and Task records where practical for assignment, acknowledgement, discussion, evidence, progress, review, completion, reopening, deadlines, and escalation.

## Assignment hierarchy

- CEO assigns within authorized company scope.
- General Manager assigns within delegated subordinate scope.
- Branch Manager assigns within authorized branch/team.
- Subordinates do not normally assign mandatory work upward but may comment, ask, update, clarify, and propose changes.

## AI-assisted planning

CEO and Manager assistants may translate an authorized intent into proposed projects, milestones, tasks, subtasks, owners, and deadlines. Proposed records pass through the same backend permissions and approval rules as ordinary UI commands.

## Discussion and reminders

Task discussion remains attached to the task/project. Deadline reminders are configurable, with a working expectation of one or two days before due date plus controlled overdue, reassignment, status, and approval notifications.

**TBD — Business configuration required:** final states, acknowledgement, acceptance, rework, reopening, reminder timing, escalation, evidence retention, and notification throttling.

## Related documents

- [Functional Requirements](../../functional-requirements.md)
- [State Catalog](../../06-data/STATE_CATALOG.md)
- [API Architecture](../../02-architecture/API_ARCHITECTURE.md)
