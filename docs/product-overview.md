# VIP Club Product Overview

## Product purpose

VIP Club is a multi-branch business-operations platform for a four-branch VIP entertainment club. It connects workforce operations, customer relationships, reservations, revenue, loyalty, finance controls, and management intelligence in one permission-controlled system.

The target platform is ERPNext with a dedicated custom Frappe application and mobile-first PWA experiences.

## Business outcomes

- Improve branch revenue, sales-plan execution, and management accountability.
- Increase customer retention, repeat visits, reservation conversion, and loyalty value.
- Give customers one recognized membership identity and one point balance across all four branches.
- Protect premium branch positioning through branch-specific privilege eligibility rather than permanent discounts.
- Make attendance, income, settlements, loans, rewards, points, and privileges transparent and explainable.
- Reduce fragmented data, manual calculation errors, missed tasks, and operational follow-up gaps.
- Give the CEO and managers timely cross-branch visibility with evidence-backed insights.
- Provide simple, Mongolian-first workflows for staff and entertainers.

## Primary users

| User | Product value |
| --- | --- |
| CEO | Cross-branch sales, goals, risk, financial, workforce, customer, membership, and approval visibility. |
| Branch manager / sales manager | Team operations, sales-target planning, action plans, tasks, customer insights, membership proposals, and branch performance. |
| Lead entertainer | Entertainer standards, coaching, readiness, and operational follow-up. |
| Entertainer | Schedule, attendance, rank, income, settlement, loan request, reservations, tasks, and benefits. |
| Host / receptionist | Fast customer onboarding, consent, profile lookup, reservations, membership recognition, and branch service support. |
| VIP customer | One membership status, points, branch-eligible privileges, reservations, and consent-based communications. |
| Server / bartender | Role-appropriate schedules, tasks, notifications, and branch operational work. |
| HR manager | Employee lifecycle, people policies, staffing, attendance, and HR workflow. |
| Accountants | Settlement, salary, payment, transaction, point-economics validation, reconciliation, and financial-control workflows. |
| Marketing and content manager | Customer segments, approved campaigns, membership communications, content, and performance reporting. |
| Purchasing manager | Approved procurement, supplier, and purchasing workflows. |
| Technical assistant / carpenter | Assigned repair and maintenance work with evidence. |
| Security officer / driver | Safety procedures, approved transport privileges, and role-appropriate operational records. |

## The two connected business cores

### Workforce and entertainer operations

This core manages people, access, roles, schedules, attendance, tasks, standards, rank, income, settlements, salary, penalties, loans, maintenance, and internal operations.

### Customer, revenue, and loyalty operations

This core manages customer identity, consent, visits, reservations, eligible spend, entertainer affinity, segments, one five-level membership status, one cross-branch point balance, branch-specific privileges, campaigns, and customer intelligence.

## Selected membership and loyalty direction

- Use one membership account, one visible status, and one point balance across the four branches.
- Use Bronze, Silver, Gold, Diamond, and Black Diamond as the five status names.
- Keep the status name identical at every branch; vary only privilege eligibility by branch.
- Use point/credit earn and redemption instead of a permanent or dynamic POS membership discount.
- Review status on each member's 12-month anniversary, with a 30-day grace period before a downgrade of at most one level.
- Treat CRM as the source of truth for status, points, privileges, redemptions, anniversary reviews, and approvals; POS supplies verified transaction facts.
- Keep working earn rates, spend thresholds, quotas, notice periods, and exact operating rules provisional until financial and operational validation.

See [CRM and Loyalty Requirements](crm-and-loyalty-requirements.md) for the complete baseline.

## Hermes assistant

Hermes is an authorized assistant and advisor. It can analyze approved data, explain results, prepare summaries, recommend actions, generate planning drafts, and send PWA reminders. It cannot silently approve finance, discipline, termination, policy changes, membership overrides, or sales targets.

## Phased scope

1. **Foundation operations and customer onboarding:** workforce identity, attendance, entertainer settlements and loans, customer registration, consent, and reservations.
2. **Workforce task management:** role-based assignment, evidence, approval, reminders, dashboards, and accountability.
3. **CRM, membership, points, privileges, and intelligence:** customer 360, unified membership status, point ledger, branch-specific privileges, campaigns, and insights.
4. **Goal Engine and management intelligence:** monthly sales planning, CEO approval, Hermes assistance, and progress tracking.
5. **Finance, compliance, and production readiness:** expanded financial operations, controls, pilot, training, and rollout.
6. **Cross-branch optimization:** capacity, transfers, attribution, and forecasting.

## Product principles

- ERPNext/Frappe is the operational source of truth; GitHub Markdown is the business knowledge base.
- Use a dedicated custom app; do not modify ERPNext core.
- Apply deny-by-default role, branch, ownership, action, and field-level authorization.
- Make policy, threshold, percentage, privilege, point, and penalty rules configurable, effective-dated, and auditable.
- Explain every consequential calculation from source evidence.
- Correct financial, point, rank, or status records with reversal or adjustment, not invisible deletion.
- Use the PWA for internal notifications.
- Keep customer communications consent-based and privacy-aware.
- Keep user interfaces simple, mobile-first, and focused on the next action.

## Key dependencies and open decisions

The membership framework is selected, but eligible-spend rules, thresholds, point economics, final privilege terms, approval authority, and cross-branch threshold normalization still require accountable-owner validation. Legal, employment, payroll, privacy, security, integration, and data-retention rules must also be confirmed before related automation is released. See the stakeholder clarification register for the active decision list.
