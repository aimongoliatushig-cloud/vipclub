# Knowledge Base Structure

Use this folder as the maintained source of truth for VIP Club.

## Authoritative documents

| Area | Document |
| --- | --- |
| Product context | product-overview.md |
| Business needs | business-needs.md |
| Requirement IDs and role capabilities | functional-requirements.md |
| Process catalog and cross-module flows | business-processes.md |
| Technical and realtime architecture | technical-architecture.md |
| Logical entities and relationships | data-model.md |
| Workflow states | 06-data/STATE_CATALOG.md |
| Roles and backend permissions | 03-roles/ROLE_PERMISSION_MATRIX.md |
| Field visibility/masking | 03-roles/FIELD_MASKING.md |
| Sensitive approvals and segregation | 03-roles/SEGREGATION_OF_DUTIES.md |
| CRM, membership, points, privileges | crm-and-loyalty-requirements.md |
| Entertainer ranking | entertainer-ranking-policy.md |
| Compensation, settlement, and loans | loans-and-settlement-requirements.md |
| CEO targets and manager plans | monthly-sales-goal-process.md |
| Customer Assistant UX | 08-ux/CUSTOMER_PWA.md |
| Internal role-aware PWA UX | 08-ux/INTERNAL_PWA.md |
| API architecture | 02-architecture/API_ARCHITECTURE.md |
| Integrations | 07-integrations/INTEGRATION_CATALOG.md |
| CallPro | 07-integrations/CALLPRO.md |
| KPIs and reports | 09-analytics/KPI_DICTIONARY.md and 09-analytics/DASHBOARD_CATALOG.md |
| Delivery sequence | roadmap.md |
| Remaining gaps | knowledge-base-gap-analysis.md |
| English/Mongolian decisions | stakeholder-clarification-register.md and stakeholder-clarification-register-mn.md |
| Material decision history | 01-governance/DECISIONS.md |
| Documentation changes | CHANGELOG.md |

Module boundaries live under 04-modules. BPMN sources and renders live under diagrams/bpmn.

## Source precedence

- The 2026-08-07 client interview requirements delta replaces conflicting older requirements.
- The unified Membership & Loyalty proposal remains the preferred customer membership baseline.
- New entertainers start at Gold; ranking is recommendation plus human decision.
- CEO sets monthly targets; managers prepare action plans; fixed three-days-before-month timing is superseded.
- Extend the existing Customer Assistant and Frappe realtime architecture rather than create duplicates.
- Unresolved values use **TBD — Business configuration required** and effective-dated configuration.

| `product-overview.md` | Product purpose, users, scope, and journeys |
| `business-needs.md` | Goals, requirements, constraints, and success measures |
| `business-processes.md` | Process definitions and links to BPMN diagrams |
| `diagrams/bpmn/` | Version-controlled BPMN source files and rendered diagrams |
| `technical-architecture.md` | System components, decisions, security, and operations |
| `data-model.md` | Domain vocabulary, entities, relationships, and rules |
| `entertainer-ranking-policy.md` | Canonical entertainer factors, weights, calculation, audit, and approval contract |
| `development-guide.md` | Setup, delivery workflow, and quality standards |
| `decisions/` | Short records of material product or technical decisions |

## Documentation lifecycle

1. Update the established requirement ID or authoritative document; do not duplicate equivalent behavior.
2. Mark selected, proposed, approved, open, superseded, and TBD values clearly.
3. Update permissions, field masking, data, states, processes, APIs, UX, reports, and cross-references.
4. Update BPMN and acceptance criteria before implementation.
5. Review with the accountable business and technical owners.
6. Record material decisions, rationale, effective dates, and superseded assumptions.
