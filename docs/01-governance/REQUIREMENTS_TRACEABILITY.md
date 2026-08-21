---
type: governance-specification
status: required
last_reviewed: 2026-08-16
---

# Requirements Traceability

## Purpose

Map every approved requirement to process, data, UI, API, permission, test, GitHub change, and Linear delivery work.

GitHub Markdown is the business and technical source of truth. Linear is the execution tracker. Linear must link to requirements; it must not silently replace or redefine them.

## Required traceability fields

| Field | Required content |
| --- | --- |
| Requirement ID | Stable ID such as FR-CRM-017 |
| Source document | Exact GitHub MD path and heading |
| Decision status | Confirmed, proposed, or open |
| Linear issue | Issue identifier and URL |
| Owner | Responsible implementer |
| Process | BPMN/process ID |
| Data | DocTypes/tables and migrations |
| API | Query/command/event contracts |
| UI | Route, screen, component, and states |
| Permission | Roles, branches, fields, actions |
| Tests | Unit, integration, E2E, permission, audit |
| Pull request | Implementation PR |
| Evidence | Test run, screenshot, staging link, or log |
| Status | Not started, in progress, blocked, verified, released |

## Linear work structure for Customer 360

Create or reuse one Customer 360 project/initiative and track at least these bounded workstreams:

1. Repository and current-state audit
2. Customer/POS identity and data-quality foundation
3. Membership policy and versioning
4. Per-visit evaluation engine
5. Recommendation and manager approval workflow
6. CEO intelligence dashboard
7. Branch manager intelligence dashboard
8. Insight drill-down framework
9. Customer Explorer
10. Canonical Customer 360 Profile and timeline
11. Benefits and cashback
12. Consent, segmentation, campaigns, and outcomes
13. Permissions, masking, export, and audit
14. Data migration and reconciliation
15. Automated tests and full-flow verification
16. Deployment, monitoring, rollback, and runbook

Each issue must contain acceptance criteria, dependencies, relevant requirement IDs, source-document links, test expectations, and evidence of completion.

## Codex operating rule

Before code changes, Codex must:

1. Read the relevant GitHub MD documents completely.
2. Audit current code and production behavior.
3. Link the task to an existing Linear issue or create the authorized issue.
4. Record requirement IDs and acceptance criteria in the Linear issue.
5. Mark material blockers instead of inventing policy.

During implementation, Codex updates Linear status and records important findings. After implementation, Codex attaches PR/test/staging evidence and updates the traceability mapping and MD documents when behavior or an approved decision changes.

A task is not complete because code exists. It is complete only when requirements, Linear work, code, tests, evidence, and documentation agree.

## Change control

- Business rules are changed in approved GitHub MD/decision records first.
- Linear tracks delivery of the approved rule.
- Code and tests reference stable requirement IDs.
- A Linear description or comment cannot silently override an approved GitHub rule.
- Conflicts are documented and escalated before implementation.
