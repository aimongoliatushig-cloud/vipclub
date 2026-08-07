# Knowledge Base Structure

Use this folder as the maintained source of truth for VIP Club.

| Area | Purpose |
| --- | --- |
| product-overview.md | Product purpose, users, scope, and journeys |
| business-needs.md | Goals, requirements, constraints, and success measures |
| business-processes.md | Process definitions and links to BPMN diagrams |
| crm-and-loyalty-requirements.md | Canonical CRM, unified membership, point, privilege, and customer-intelligence requirements |
| stakeholder-clarification-register.md | English register of open, proposed, approved, and superseded decisions |
| stakeholder-clarification-register-mn.md | Mongolian stakeholder decision register |
| roadmap.md | Phased delivery sequence and reconciliation principles |
| knowledge-base-gap-analysis.md | Remaining policy, data, integration, and delivery gaps |
| diagrams/bpmn/ | Version-controlled BPMN source files and rendered diagrams |
| technical-architecture.md | System components, decisions, security, and operations |
| data-model.md | Domain vocabulary, entities, relationships, and rules |
| development-guide.md | Setup, delivery workflow, and quality standards |
| 01-governance/DECISIONS.md | Material product and technical decision register |
| 04-modules/loyalty/README.md | Loyalty module boundary and policy responsibilities |
| 08-ux/CUSTOMER_PWA.md | Customer-facing membership, point, privilege, and reservation experience |

## Source precedence for membership and loyalty

The unified Membership & Loyalty proposal supplied on 2026-08-07 is the preferred baseline where it conflicts with earlier documentation. The canonical interpretation is maintained in crm-and-loyalty-requirements.md.

Earlier rolling three-month membership evaluation, branch-specific visible rank, and separate cashback framing are superseded. Working earn rates, thresholds, quotas, and operating windows remain proposals until the named decision owners approve them.

## Documentation lifecycle

1. Capture or update the written requirement and identify whether each value is selected, proposed, approved, open, or superseded.
2. Update affected process, architecture, data-model, UX, module, and stakeholder-decision documents.
3. Add or revise the corresponding BPMN diagram.
4. Link requirements to acceptance criteria, tests, and delivery work.
5. Review the change with the people who own the process and policy.
6. Record material choices, rationale, effective dates, and superseded assumptions in the decision register.
