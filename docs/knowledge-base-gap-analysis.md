# Knowledge-Base Gap Analysis

## Assessment

The VIP Club knowledge base now defines the target business model, four-phase roadmap, core processes, data model, technical architecture, role catalog, BPMN diagrams, PWA direction, key financial and CRM workflows, and the preferred unified membership and point model.

It is ready for structured discovery and solution design. It is **not yet ready for full implementation** because several high-risk financial values, operating rules, legal constraints, integrations, and current-state details remain unverified.

## Critical gaps — resolve before building affected modules

| Gap | Why it matters | Required input | Owner |
| --- | --- | --- | --- |
| Current ERPNext/Frappe and VPS audit | Prevents building against an incorrect version, app structure, or deployment model. | Repository access, version inventory, custom apps, sites, databases, deployment, CI, existing code and screens. | Technical owner |
| Source-system inventory | Sales, attendance, reservation, payment, and point calculations need authoritative input. | POS, attendance, reservation, banking, and messaging system details; APIs, exports, IDs, samples, and owners. | Technical owner / Accounting |
| Employment and legal policy | Pay, loans, penalties, tax, contracts, and privacy cannot be safely automated without approval. | Contracts, legal classification, pay periods, penalties, loan agreement, tax/E-Barimt rules, data-retention requirements. | CEO / HR / Legal adviser / Accounting |
| Financial approval matrix | Bank payment, point liability, redemption, and adjustment workflows need segregation of duties. | Who prepares, reviews, approves, initiates, and reconciles each financial action; limits and exception path. | CEO / General accountant |
| Customer privacy and consent | CRM, campaigns, and customer intelligence require approved data-use rules. | Consent text, age/ID requirement, retention, deletion, masking, opt-out, and role visibility policies. | CEO / Marketing / Legal adviser |
| Membership threshold and point economics | The product framework is selected, but financial exposure depends on exact values and rules. | Eligible-spend definition, five thresholds, cross-branch normalization, earn rates, point-to-MNT value, expiry, breakage, eligible redemption, refund and fraud controls. | CEO / Marketing / Accounting |
| Privilege operations | Working quotas and reservation rules cannot be automated safely without final operating terms. | Bronze entry, transport terms, guest eligibility, reservation notice by status, hold/no-show, premium-branch eligibility, reset, abuse, and reversal rules. | CEO / Branch managers / Marketing |

## Resolved product-direction gaps

The following are now the preferred requirements baseline:

- one membership account, one visible status, and one point balance across the four branches;
- Bronze, Silver, Gold, Diamond, and Black Diamond status names;
- branch-specific privilege eligibility without branch-specific visible demotion;
- point/credit earn and redemption instead of permanent POS membership discount;
- an individual 12-month anniversary review;
- a 30-day grace period before an at-most-one-level downgrade;
- CRM as membership source of truth and POS as verified transaction source;
- launch classification from available historical spend plus manager nomination and CEO approval where data is incomplete.

These decisions supersede the earlier rolling three-month evaluation and separate cashback framing. Example rates, thresholds, quotas, and notice windows remain unapproved values.

## High-priority product-definition gaps

| Gap | Required decision |
| --- | --- |
| Role-permission matrix | Exact view, create, edit, approve, export, redemption, policy-edit, and cross-branch rights for every role. |
| Task governance | States, acknowledgement, evidence, rework, closure, escalation, and notification rules. |
| Sales goal policy | Baseline, improvement percentage, override rules, planning deadlines, approval timing, and sales refresh cadence. |
| Customer service workflow | Exact reservation, capacity, arrival, cancellation, verification, and entertainer-attribution rules. |
| Membership operations | Upgrade timing, minimum history, manual exception path, notification cadence, and policy approval flow. |
| Payroll rules | Final pay dates, overtime/additional-day calculation, penalty formulas, adjustment policy, and payment-failure handling. |
| Branch configuration | Default settings, branch-specific privilege policies, activation checklist, and future-branch approval authority. |
| Customer PWA scope | Which customer workflows are self-service at launch and what requires staff support. |
| Internal PWA UX | Role home screens, task priorities, key user journeys, offline/poor-network behavior, and language details. |

## Data and migration gaps

- Sample historical monthly sales by branch, including reconciled gross/net and eligible-spend definitions.
- Verified customer transaction history from April 2026 onward and a documented completeness assessment.
- Existing customer, employee, entertainer, bank, attendance, reservation, and settlement data samples.
- Stable identifiers for cross-system matching.
- Data-quality rules, duplicate resolution, migration acceptance criteria, and reconciliation reports.
- Record retention, deletion, archival, and audit-evidence rules.

## Technical and operational gaps

- Final frontend framework and PWA build strategy.
- API contract, authentication/session policy, device/session management, and error-handling standard.
- POS transaction/refund contract, point-redemption integration, reconciliation, and sandbox evidence.
- Integration credentials, sandbox environments, rate limits, retries, idempotency, and reconciliation specifications.
- Encryption, secret management, backup/restore target, monitoring, logs, alerts, and incident response.
- Test strategy, seed data, accessibility baseline, performance targets, release procedure, and rollback plan.
- Pilot branch, pilot users, training plan, adoption metrics, support owner, and production acceptance criteria.

## Diagram and documentation gaps

The BPMN set covers the original happy paths. Before implementation, the membership and legacy benefit/cashback diagrams must be revised for the unified status, anniversary review, grace period, point ledger, privilege quota, launch approval, and reconciliation rules. Priority diagrams also need:

- role swimlanes;
- approval and rejection gateways;
- exception and correction paths;
- notification and escalation events;
- linked data records, policy versions, KPIs, and acceptance criteria.

Detailed module documents are still needed for payroll, tasks, attendance, campaigns, reservations, goals, roles/permissions, integrations, and reporting. The loyalty module now links to the canonical requirements baseline.

## Recommended next sequence

1. Approve the remaining membership economics and privilege-operation items in the clarification register.
2. Audit the deployed ERPNext/Frappe repository and VPS.
3. Collect POS and historical transaction samples and define canonical eligible-spend data.
4. Approve the role-permission and financial-approval matrices.
5. Revise the membership, point, and privilege BPMN flows and convert them into detailed acceptance criteria and tests.
6. Scaffold the Frappe custom app and internal PWA against the verified current state.
7. Pilot the smallest connected Phase 1 vertical slice before broad rollout.
