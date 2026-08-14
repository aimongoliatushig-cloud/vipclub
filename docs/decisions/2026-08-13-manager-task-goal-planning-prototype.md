# Decision: Manager task accountability and goal-planning prototype

**Date:** 2026-08-13
**Status:** Prototype decision; final policy still open where noted

## Context

The Branch Manager prototype already covered weekly scheduling, readiness, attendance, leave decisions, penalty evidence, team status, CRM, rankings, and active sales-goal progress. The manager documents also require task accountability and preparation of a monthly branch sales target plus action plan.

Task state governance, escalation timing, file policy, and notification delivery remain open in CL-020 and CL-021. The sales-goal calendar, baseline, and confirmation that Branch Manager and Branch Sales Manager are the same role remain open in CL-024. The prototype therefore needs testable workflows without claiming that these open policies are final.

## Decision

### Branch task accountability

The Manager PWA provides a branch-only task center with the reviewable prototype states:

```text
Assigned → Acknowledged → In progress → Submitted → Completed
                                      ↘ Rework → In progress
```

Managers can create tasks only for active members of their authorized branch, add comments, inspect execution results and image-evidence metadata, request rework with a reason, and approve a submitted result with a review note. Deadlines, overdue indicators, comments, evidence, and every transition retain an audit record.

The team-member buttons are an explicit workflow preview, not identity switching. Production must bind acknowledgement, progress, and submission actions to the authenticated assignee.

### Monthly goal proposal

The Manager PWA provides a separate next-month planning surface containing:

- Hermes recommendation version, source summary, baseline, formula, rationale, focus areas, and risks;
- the manager's proposed target and supporting explanation;
- action owners, due dates, expected impact, and versioned audit evidence;
- draft save and submission for CEO review.

Submitting locks the Manager copy in the prototype and does not activate the target. There is no Manager approve/reject action. Only CEO approval can create the active target displayed on the default Manager overview.

## Explicit boundaries

- The browser service records PWA notification intent; it does not send Slack or another external message.
- Image evidence is represented by file metadata; protected production upload and retention are not implemented.
- No task escalation is executed until notification and escalation policy is approved.
- Hermes never saves, submits, approves, or changes the manager proposal.
- The prototype does not resolve whether Branch Manager and Branch Sales Manager are distinct production roles.
- All production reads and writes require server-enforced role, branch, ownership, audit, and idempotency controls.

## Consequences

- Managers can test the missing execution and planning journeys in Mongolian.
- The UI makes the human decision boundary visible instead of implying AI or Manager approval authority.
- The service contract and audit model can be replaced by protected Frappe APIs without changing the core screen workflow.
- CL-020, CL-021, and CL-024 still govern the final state machine, reminders, escalation, timing, and role assignment.
