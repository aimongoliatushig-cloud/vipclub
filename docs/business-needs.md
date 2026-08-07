# Business Needs

## Business context

VIP Club operates a multi-branch VIP entertainment business. It needs one controlled operational platform that connects workforce management, entertainer performance and income, customer relationships, reservations, loyalty, finance controls, and management execution.

The business currently needs to reduce fragmented data, manual calculation risk, inconsistent accountability, missed work, and lost customer insight while remaining flexible as new branches and teams are added.

## Strategic outcomes

| Outcome | Why it matters | Primary measure |
| --- | --- | --- |
| Increase total and branch sales | Sales growth funds the business and validates branch action plans. | Actual sales versus approved monthly target |
| Improve repeat visits and loyalty | Retained customers create more stable revenue and lower acquisition cost. | Repeat-visit rate, active members, status movement and retention |
| Build cross-branch loyalty | One identity and point balance encourage members to use all four branches. | Cross-branch active members, point earn and redemption mix |
| Protect price integrity and premium positioning | Permanent discounts weaken margin and branch differentiation. | Effective point cost, redemption cost, gross margin, privilege cost |
| Improve attendance and reduce no-show | Reliable staffing protects service quality and revenue. | Attendance, punctuality, no-show rate |
| Make pay and settlements transparent | Explainable pay reduces disputes and financial errors. | Settlement accuracy, correction rate, timely payment |
| Improve manager accountability | Plans, actions, and results must be visible and reviewable. | Action completion, overdue work, goal achievement |
| Improve entertainer retention and growth | High turnover harms quality and continuity. | Retention, rank progression, internal transfer outcomes |
| Protect customer trust and privacy | Consent-based, controlled customer data use is essential. | Consent quality, opt-outs, access/audit exceptions |
| Scale to future branches | The system must support new branches without redevelopment. | Time to configure and activate a new branch |

## Core business needs

### 1. Workforce, roles, and branch operations

The business needs role- and branch-aware access for every internal user, with individual credentials and one internal PWA that adapts to the user's authorized workspace. It needs to add new branches, teams, roles, settings, policies, and reporting scope without code changes.

### 2. Attendance, pay, settlements, and loans

The business needs explainable attendance and pay calculations across three employment types:

- entertainer subcontractors paid through three-day, performance-based settlements;
- day-based contract workers;
- main fixed-salary employees.

Every calculation must use verified source records and apply approved additions, penalties, loan repayments, adjustments, approvals, payment evidence, and audit history.

### 3. Tasks, accountability, and maintenance

Managers need to assign work, receive acknowledgement, follow progress, review evidence, request rework, approve results, and monitor deadlines. Staff need simple PWA workflows for tasks, notices, repairs, comments, and completion evidence.

### 4. Customer onboarding, reservations, and service

Hosts and receptionists need fast customer lookup or registration, duplicate control, consent capture, preferred communication channels, reservation support, and service history. VIP customers need an appropriate customer-facing experience for membership status, points, privileges, reservations, and approved interactions.

### 5. CRM, membership, points, privileges, and campaigns

The business needs:

- one membership account and one visible status per member across all four branches;
- five statuses: Bronze, Silver, Gold, Diamond, and Black Diamond;
- one point balance that earns and redeems across branches;
- branch-specific privilege eligibility without showing a lower branch-specific rank;
- point/credit value instead of a permanent POS membership discount;
- a 12-month member-anniversary review and 30-day grace period before a downgrade of at most one level;
- auditable manual launch nomination and CEO approval when historical data is incomplete;
- customer 360 insights covering visits, spend, points, status, privilege use, entertainer affinity, segments, campaigns, and retention opportunity.

CRM is the source of truth for membership, points, privileges, redemptions, evaluations, and approvals. POS supplies verified transaction facts and corrections. Point economics and exact privilege rules must be financially and operationally approved before activation.

### 6. Sales goals and management intelligence

Every branch needs a monthly sales target and action plan. Sales managers propose; the CEO reviews and approves; Hermes provides data-based recommendations and PWA reminders. The system must show actual sales against target, achievement percentage, progress, risks, and actions.

### 7. Security, governance, and integration

The business needs deny-by-default permissions, privacy controls, audit logs, configurable and versioned policies, correction by reversal/adjustment, and reliable integration with POS, attendance, corporate banking, messaging, and E-Barimt systems as approved.

## Priority capability map

| Priority | Capability | Business outcome |
| --- | --- | --- |
| P1 | Branch, user, role, attendance, entertainer settlement, loan, customer registration, reservation | Establish reliable operational and customer data |
| P2 | Tasks, evidence, accountability, maintenance, sales-goal planning and PWA reminders | Improve execution and sales management |
| P3 | CRM, unified membership, point ledger, privileges, segments, campaigns, customer intelligence | Improve retention, loyalty, and targeted revenue |
| P4 | Finance expansion, cross-branch optimization, compliance, pilot, and rollout | Scale safely and sustainably |

## Business constraints and principles

- The system must be Mongolian-first and mobile-friendly for operational roles.
- Internal experiences must be simple, with only the next relevant actions visible.
- AI/Hermes is an advisor; humans retain approvals for finance, policy, discipline, termination, membership overrides, and sales goals.
- Legal, tax, employment, privacy, banking, point, and privilege rules cannot be assumed; they require recorded approval.
- Permanent or dynamic POS membership discount is not a dependency of the selected loyalty model.
- GitHub Markdown is the business knowledge base; Linear tracks execution rather than replacing approved business decisions.

## Current decision gaps

The product direction is defined in [CRM and Loyalty Requirements](crm-and-loyalty-requirements.md). Remaining decisions include eligible-spend definition, branch threshold normalization into one status, exact thresholds, upgrade timing, point-to-MNT value and expiry, final benefit terms, roles and approvals, and POS reconciliation. See the stakeholder clarification register for the full active decision list.
