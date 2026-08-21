# Business Needs

## Business context

VIP Club operates a multi-branch VIP entertainment business. It needs one controlled operational platform that connects workforce management, entertainer performance and income, customer relationships, reservations, loyalty, finance controls, and management execution.

The business currently needs to reduce fragmented data, manual calculation risk, inconsistent accountability, missed work, and lost customer insight while remaining flexible as new branches and teams are added.

## Strategic outcomes

| Outcome | Why it matters | Primary measure |
| --- | --- | --- |
| Increase total and branch sales | Sales growth funds the business and validates branch action plans. | Actual sales versus approved monthly target |
| Improve repeat visits and loyalty | Retained customers create more stable revenue and lower acquisition cost. | Repeat-visit rate, active members, status movement and retention |
| Improve contact and service conversion | Calls, check-ins, rooms, requests, drop-offs, and bills must form an explainable service funnel. | Answer rate, booking conversion, visit conversion, drop-off, reconciliation exceptions |
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

Call Operators need CallPro-assisted call facts, masked customer lookup/create, purpose classification, reservations, VIP service recognition, and current-shift entertainer availability without full CRM. Reception needs registration, consent, reservation, arrival/check-in, room/session, and structured drop-off. Managers and bartenders need a consolidated realtime service view. VIP customers need the existing Customer Assistant extended for approved public entertainer profiles, room-aware requests, feedback, membership, points, privileges, reservations, and consent.

### Entertainer profile, service, ranking, and income

The business needs configurable internal entertainer traits and measurements with strict public-field separation; four public ranks; new entertainers starting at Gold; four-dimension evidence and human rank decisions; realtime room requests; optional branch-priced extra services; personal performance coaching; and a transparent three-day income statement with effective-dated compensation rules.

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

The CEO sets each relevant monthly branch/manager target. The Branch Manager reviews it, builds an AI-assisted action plan, submits it for CEO approval, and executes approved ERPNext/Frappe projects/tasks. The system shows target, actual, attainment, plan progress, historical outcomes, and configurable human-reviewed reward/penalty evidence. AI remains advisory.

### 7. Security, governance, and integration

The business needs deny-by-default permissions, field masking, segregation of duties, audit logs, effective-dated policies, correction by reversal/adjustment, Frappe realtime operations, and reliable integration with CallPro, POS, attendance, corporate banking, messaging, and E-Barimt as approved.

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
