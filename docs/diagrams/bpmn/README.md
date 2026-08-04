# BPMN Diagrams

Store each business-process diagram here as a version-controlled `.bpmn` file. Keep a rendered `.svg` or `.png` file beside it for easy viewing.

## Naming

Use lowercase kebab case:

`<process-name>.bpmn`
`<process-name>.svg`

Example:

`member-onboarding.bpmn`
`member-onboarding.svg`

## Diagram standards

- One diagram represents one business process.
- Show the trigger, outcome, responsible roles, system handoffs, exceptions, and key decisions.
- Use swimlanes for roles or systems when that makes ownership clearer.
- Link to the matching section in `../business-processes.md`.
- Update the written process and diagram together.


## Current BPMN catalog

- `process-00-branch-setup.bpmn`
- `process-11-attendance.bpmn`
- `process-13-entertainer-settlement.bpmn`
- `process-15-customer-onboarding.bpmn`
- `process-16-reservation.bpmn`
- `process-20-task-lifecycle.bpmn`
- `process-31-membership-evaluation.bpmn`
- `process-32-benefit-cashback.bpmn`
- `process-33-customer-campaign.bpmn`
- `process-40-monthly-sales-goal.bpmn`
- `process-43-payroll-bank-transfer.bpmn`

These are the first core workflow diagrams. As decisions are approved, they will be expanded with exception paths, role swimlanes, and supporting detailed process documents.
