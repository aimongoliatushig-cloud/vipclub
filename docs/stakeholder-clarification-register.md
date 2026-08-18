# Stakeholder Clarification Register

Use this register to collect decisions and missing data from the CEO, branch managers, HR, accounting, marketing, and technical owners. Do not implement an **Open** item as a hidden assumption.

## How to use this register

- **Status:** Open, Proposed, Approved, Deferred, or Superseded.
- **Decision owner:** The person or group accountable for the answer.
- **Risk:** High means the item can affect finance, legal compliance, permissions, or core data design.
- Once approved, link the decision to the affected requirements, process, data-model, and Linear work item.

## 1. Organization, roles, and authority

| ID | Question or data needed | Decision owner | Risk | Status |
| --- | --- | --- | --- | --- |
| CL-001 | Confirm the legal-company structure and the official names and codes of all four branches. | CEO / General accountant | High | Open |
| CL-002 | Confirm which roles may access more than one branch and what cross-branch data they may see. | CEO | High | Open |
| CL-003 | Confirm final responsibilities and approval limits for CEO, branch manager, lead entertainer, HR, and each accountant role. | CEO | High | Open |
| CL-004 | Confirm the purchasing manager's authority, approval path, supplier access, and spending limits. | CEO / General accountant | High | Open |
| CL-005 | Confirm whether the Driver and Security Officer use the system for assignments, trip records, incidents, or only notifications. | Branch managers | Medium | Open |

## 2. Employment, attendance, salary, penalties, and loans

| ID | Question or data needed | Decision owner | Risk | Status |
| --- | --- | --- | --- | --- |
| CL-010 | Confirm the legal and contract treatment for entertainer subcontractors, day-based contract workers, and main fixed-salary employees. | CEO / HR / Legal adviser | High | Open |
| CL-011 | Confirm the pay period for day-based contract workers and main fixed-salary employees. | HR / General accountant | High | Open |
| CL-012 | Define how extra workdays are approved and calculated for day-based and fixed-salary workers. | HR / General accountant | High | Open |
| CL-013 | Approve lateness, no-show, **гарааны торгууль**, and other penalty categories, formulas, evidence requirements, appeal path, and effective dates. | CEO / HR / Legal adviser | High | Open |
| CL-013A | Approve leave/day-off categories, notice periods, attachments, emergency handling, leave-balance validation, Branch Manager versus HR approval boundary, withdrawal/cancellation, and overlap rules. The operational baseline permits own-request submission and an audited own-branch manager decision without implying final HR/pay approval. | CEO / HR / Legal adviser / Branch managers | High | Operational baseline; policy open |
| CL-014 | Confirm which verified sales records and share rates determine entertainer three-day settlements. | General accountant / Branch managers | High | Open |
| CL-015 | Confirm whether every employment type is loan-eligible and define minimum tenure, income history, maximum amount, repayment range, and departure treatment. | CEO / HR / General accountant | High | Open |
| CL-016 | Confirm loan approval authority, bank/payment evidence requirements, and adjustment or reversal process. | CEO / Payment accountant | High | Open |
| CL-017 | **Approved baseline (2026-08-11):** Rank 1/2/3, 14-day cadence, Branch Manager recommendation, and CEO final decision. BAT-96 must still publish the effective metric weights, thresholds, hard gates, benefits, missing-data treatment, and appeal/manual-adjustment rules. | CEO / General Manager / Lead entertainer | High | Approved baseline; parameters open |

## 3. Tasks, maintenance, and management goals

| ID | Question or data needed | Decision owner | Risk | Status |
| --- | --- | --- | --- | --- |
| CL-020 | Confirm task states, acknowledgement rule, result-acceptance rule, rework and reopening authority. | CEO / Branch managers | High | Open |
| CL-021 | Confirm deadline reminders, escalation timing, notification channels, and manager/CEO visibility for overdue tasks. | Branch managers / CEO | Medium | Open |
| CL-022 | Confirm whether all staff use daily work plans and the required level of evidence for task completion. | CEO / Branch managers | Medium | Open |
| CL-023 | Confirm technical-maintenance and carpenter request categories, urgency levels, approval rule, and service-level targets. | Branch managers | Medium | Open |
| CL-024 | Confirm the latest monthly cycle: CEO sets the target; Branch Manager prepares the action plan; CEO approves the plan; configure early-month deadlines, source baseline, review timing, and history. | CEO / Branch Managers | High | Proposed |

## 4. Customer onboarding, CRM, and messaging

| ID | Question or data needed | Decision owner | Risk | Status |
| --- | --- | --- | --- | --- |
| CL-030 | Confirm required customer registration fields, duplicate matching and merge authority, age/identity requirements, and retention policy. | CEO / Reception / Legal adviser | High | Open |
| CL-031 | Approve customer terms, marketing-consent wording, channel preference wording, consent versioning, and opt-out procedure. | CEO / Marketing / Legal adviser | High | Open |
| CL-032 | Confirm which channels are available at launch: Viber, Telegram, email, SMS, Messenger, or in-app. | Marketing / Technical owner | High | Open |
| CL-033 | Confirm campaign creation and broadcast approval authority, message-review rule, and delivery/outcome metrics. | CEO / Marketing | High | Open |
| CL-034 | Confirm what customer information, reservations, and entertainer-affinity insight each role may view. | CEO / Legal adviser | High | Open |
| CL-035 | Confirm whether eligible VIP transport is a loyalty benefit, its qualification rules, booking process, and privacy safeguards. | CEO / Branch managers | Medium | Open |

## 5. Membership, benefits, and points

| ID | Question or data needed | Decision owner | Risk | Status |
| --- | --- | --- | --- | ---|
| CL-040 | **Approved baseline (2026-08-11):** Bronze, Silver, Gold, Diamond, and Black Diamond. Customer-facing descriptions and provisional entry presentation still require content approval. | CEO / Marketing | High | Approved baseline; content open |
| CL-040A | The rolling three-month/inactive-month-zero proposal is superseded by the completed-eligible-visit average in CL-041. | CEO / General Manager | High | Superseded |
| CL-041 | **Approved baseline (2026-08-11):** average eligible expenditure per completed eligible visit, compared with the active branch-specific range. Exact eligible-spend treatment remains in CL-042. | CEO / General accountant / Marketing | High | Approved baseline |
| CL-042 | Define what counts as eligible spend and how refunds, cancellations, discounts, complimentary items, and corrections affect it. | General accountant / CEO | High | Open |
| CL-043 | Confirm branch-specific thresholds, who can change them, effective dates, audit rule, and how multi-branch customers are classified. | CEO / Branch managers | High | Open |
| CL-044 | Confirm membership-evaluation frequency, upgrade/downgrade, grace period, manual override, and review process. | CEO / Marketing | High | Open |
| CL-045 | Define benefits for each level, including free-entry allowances, VIP transport, reservation priority, and branch scope. | CEO / Branch managers / Marketing | High | Open |
| CL-046 | A standalone cashback balance is not approved. Confirm whether any points, privilege, or monetary-value ledger will launch and define earn/use/expire/adjust/reverse, limits, fraud controls, approvals, and financial treatment. | CEO / General accountant | High | Open |
| CL-047 | Confirm how benefit or approved ledger use is verified at the branch and reconciled with sales/POS records. | Branch managers / Transaction accountant | High | Open |

## 6. Integrations, security, and implementation

| ID | Question or data needed | Decision owner | Risk | Status |
| --- | --- | --- | --- | --- |
| CL-050 | Identify the current POS, attendance, reservation, messaging, bank, and E-Barimt systems and their API, export, or credential availability. | Technical owner / General accountant | High | Open |
| CL-051 | Confirm ERPNext/Frappe versions, existing custom apps, hosting, database, environments, source repository, and deployment workflow. | Technical owner | High | Open |
| CL-052 | Confirm backup, recovery, monitoring, access-review, incident-response, and audit-retention requirements. | CEO / Technical owner | High | Open |
| CL-053 | Confirm data privacy, retention, deletion, field masking, and export controls for employee, customer, and financial data. | CEO / Legal adviser / Technical owner | High | Open |
| CL-054 | Confirm pilot branches, pilot users, training owner, release criteria, and support ownership. | CEO / Branch managers | Medium | Open |

## 7. Call operations and CallPro

| ID | Question or data needed | Decision owner | Risk | Status |
| --- | --- | --- | --- | --- |
| CL-055 | Obtain and approve official CallPro API documentation: product/version, authentication, call fields, history, webhook/polling, signatures, rate limits, retry, sandbox, retention, and support owner. | Technical owner / Call Operations | High | Open |
| CL-056 | Confirm Call Operator permissions, minimum customer fields, VIP indicator, phone masking, call-purpose categories, optional-note rule, and current-shift entertainer visibility. | CEO / Call Operations / Legal adviser | High | Proposed |
| CL-057 | Approve prank/abusive/block/unblock policy, reason/evidence, duration, review/appeal, and whether CallPro or ERP enforces the block. | CEO / Call Operations / Legal adviser | High | Open |

## 8. Entertainer profile, ranking, compensation, and extras

| ID | Question or data needed | Decision owner | Risk | Status |
| --- | --- | --- | --- | --- |
| CL-060 | Approve the public, staff-visible, internal-only, and private entertainer fields, including who may use body measurements and matching traits. | CEO / HR / Legal adviser / Branch Managers | High | Open |
| CL-061 | Confirm final entertainer KPI definitions and weights, rank thresholds, repeat-customer rule, late/no-show limits, work nights, evaluation cadence, promotion/demotion, and final approver. | CEO / General Manager / Lead Entertainer | High | Open |
| CL-062 | Confirm Diamond inputs, including whether approximately three qualifying months and recruiting approximately nine entertainers are required and how they are evidenced. | CEO / General Manager | High | Open |
| CL-063 | Approve effective-dated rank revenue shares (interview proposal: 50/60/70/80%), tip rules, wine commission, spreading-tip terminology/value/share, branch override authority, and accounting treatment. | CEO / General Accountant / Branch Managers | High | Open |
| CL-064 | Approve deduction categories and amounts, including whether a missed/late entertainer request can ever create a deduction after human review. | CEO / HR / General Accountant / Legal adviser | High | Open |
| CL-065 | Confirm official extra-service terminology, categories, capability approval, branch pricing, customer payment/request flow, availability, and revenue-share impact. | CEO / Branch Managers / General Accountant | High | Open |

## 9. Customer Assistant and branch operations

| ID | Question or data needed | Decision owner | Risk | Status |
| --- | --- | --- | --- | --- |
| CL-070 | Confirm room QR/session authentication, token lifetime, customer/group binding, approved request statuses, availability transitions, two-minute service target, escalation, and outage fallback. | Technical owner / Branch Managers | High | Open |
| CL-071 | Confirm customer-feedback categories, visibility, review/response targets, when positive feedback becomes evidence, and when a complaint becomes a verified incident. | CEO / Branch Managers / Legal adviser | High | Open |
| CL-072 | Approve drop-off reason taxonomy, optional text, bill-linking source, reconciliation tolerance, exception aging, resolution authority, and KPI use. | CEO / Branch Managers / Accounting | High | Open |
| CL-073 | Confirm Bartender/Floor Operations service fields, customer phone masking, operations-workstation scope, room status source, and realtime freshness target. | CEO / Branch Managers / Legal adviser / Technical owner | High | Open |
| CL-074 | Approve discreet membership theming and customer/public entertainer availability wording. | CEO / Marketing / Legal adviser | Medium | Open |

## 10. Manager KPI, health, tasks, AI, and messaging

| ID | Question or data needed | Decision owner | Risk | Status |
| --- | --- | --- | --- | --- |
| CL-080 | Confirm manager KPI components/weights, attendance and task weighting, and whether any customer-experience candidates affect compensation. | CEO / HR / General Accountant | High | Open |
| CL-081 | Approve exact target-penalty boundaries, salary base, stacking, exceptions, appeal, and treatment of the interview 80/70/60/50 percent inputs. | CEO / HR / General Accountant / Legal adviser | High | Open |
| CL-082 | Approve above-target reward-pool formula, incremental-sales definition, manager share, team allocation authority, review, accounting, and payout. | CEO / General Accountant | High | Open |
| CL-083 | Define Branch Health Score metrics, weights, cadence, severity, red/amber/green thresholds, and critical alerts. | CEO / General Manager | High | Open |
| CL-084 | Confirm final Project/Task states, acceptance, rework/reopen authority, hierarchy exceptions, reminder timing, escalation, attachments, and retention. | CEO / General Manager / Branch Managers | Medium | Open |
| CL-085 | Approve direct-message retention and recipient-anonymous feedback eligibility, disclosure wording, identity-reveal authority, reason requirement, and audit review. | CEO / HR / Legal adviser | High | Open |
| CL-086 | Confirm CEO, Manager, and Entertainer assistant tool allowlists, data sources, explanation standards, and prohibited actions. | CEO / Technical owner / Legal adviser | High | Open |

## Approval record template

When a clarification is decided, add a dated note below it:

- **Decision:**
- **Decision owner:**
- **Approved date:**
- **Rationale:**
- **Affected documents and Linear work:**
- **Policy or configuration effective date:**
