# Knowledge-Base Gap Analysis

## Assessment

The VIP Club knowledge base now defines the target business model, four-phase roadmap, core processes, data model, technical architecture, role catalog, BPMN diagrams, PWA direction, and key financial and CRM workflows.

It is ready for structured discovery and solution design. It is **not yet ready for full implementation** because several high-risk business, legal, integration, and current-state details remain unverified.

## Critical gaps — resolve before building affected modules

| Gap | Why it matters | Required input | Owner |
| --- | --- | --- | --- |
| Current ERPNext/Frappe and VPS audit | Prevents building against an incorrect version, app structure, or deployment model. | Repository access, version inventory, custom apps, sites, databases, deployment, CI, existing code and screens. | Technical owner |
| Source-system inventory | Sales, attendance, reservation, and payment calculations need authoritative input. | POS, attendance, reservation, banking, and messaging system details; APIs, exports, IDs, samples, and owners. | Technical owner / Accounting |
| Employment and legal policy | Pay, loans, penalties, tax, contracts, and privacy cannot be safely automated without approval. | Contracts, legal classification, pay periods, penalties, loan agreement, tax/E-Barimt rules, data-retention requirements. | CEO / HR / Legal adviser / Accounting |
| Financial approval matrix | Bank payment and adjustment workflows need segregation of duties. | Who prepares, reviews, approves, initiates, and reconciles each financial action; limits and exception path. | CEO / General accountant |
| Customer privacy and consent | CRM, campaigns, and customer intelligence require approved data-use rules. | Consent text, age/ID requirement, retention, deletion, masking, opt-out, and role visibility policies. | CEO / Marketing / Legal adviser |
| Membership and cashback policy | Loyalty calculations and financial exposure depend on exact rules. | Five levels, formula, thresholds, branch scope, benefit rules, cashback value, expiry, redemption, overrides, fraud controls. | CEO / Marketing / Accounting |

## High-priority product-definition gaps

| Gap | Required decision |
| --- | --- |
| Role-permission matrix | Exact view, create, edit, approve, export, and cross-branch rights for every role. |
| Task governance | States, acknowledgement, evidence, rework, closure, escalation, and notification rules. |
| Sales goal policy | Baseline, improvement percentage, override rules, planning deadlines, approval timing, and sales refresh cadence. |
| Customer service workflow | Exact reservation, capacity, arrival, cancellation, verification, and entertainer-attribution rules. |
| Payroll rules | Final pay dates, overtime/additional-day calculation, penalty formulas, adjustment policy, and payment-failure handling. |
| Branch configuration | Default settings, branch-specific policies, activation checklist, and future-branch approval authority. |
| Customer PWA scope | Which customer workflows are self-service at launch and what requires staff support. |
| Internal PWA UX | Role home screens, task priorities, key user journeys, offline/poor-network behavior, and language details. |

## Data and migration gaps

- Sample historical monthly sales by branch, including reconciled gross/net definition.
- Existing customer, employee, entertainer, bank, attendance, reservation, and settlement data samples.
- Stable identifiers for cross-system matching.
- Data-quality rules, duplicate resolution, migration acceptance criteria, and reconciliation reports.
- Record retention, deletion, archival, and audit-evidence rules.

## Technical and operational gaps

- Final frontend framework and PWA build strategy.
- API contract, authentication/session policy, device/session management, and error-handling standard.
- Integration credentials, sandbox environments, rate limits, retries, idempotency, and reconciliation specifications.
- Encryption, secret management, backup/restore target, monitoring, logs, alerts, and incident response.
- Test strategy, seed data, accessibility baseline, performance targets, release procedure, and rollback plan.
- Pilot branch, pilot users, training plan, adoption metrics, support owner, and production acceptance criteria.

## Diagram and documentation gaps

The BPMN set covers the core happy paths. Before implementation, priority diagrams need:

- role swimlanes;
- approval and rejection gateways;
- exception and correction paths;
- notification and escalation events;
- linked data records, policy versions, KPIs, and acceptance criteria.

Detailed module documents are still needed for payroll, tasks, attendance, loyalty, campaigns, reservations, goals, roles/permissions, integrations, and reporting.

## Recommended next sequence

1. Complete the critical clarification register with CEO, managers, HR, and accounting.
2. Audit the deployed ERPNext/Frappe repository and VPS.
3. Collect source-system samples and define the canonical data sources.
4. Approve the role-permission and financial-approval matrices.
5. Convert the highest-priority workflows into detailed acceptance criteria, swimlane BPMN, data contracts, and test cases.
6. Scaffold the Frappe custom app and internal PWA against the verified current state.
7. Pilot the smallest connected Phase 1 vertical slice before broad rollout.
