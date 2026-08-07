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
| CL-014 | Confirm which verified sales records and share rates determine entertainer three-day settlements. | General accountant / Branch managers | High | Open |
| CL-015 | Confirm whether every employment type is loan-eligible and define minimum tenure, income history, maximum amount, repayment range, and departure treatment. | CEO / HR / General accountant | High | Open |
| CL-016 | Confirm loan approval authority, bank/payment evidence requirements, and adjustment or reversal process. | CEO / Payment accountant | High | Open |
| CL-017 | **CEO or General Manager confirmation required:** approve the selected entertainer ranking lifecycle—four levels, rolling evaluation, repeated no-show hard gate/benefit suspension, sustained sales-decline demotion, grace rule, benefits, and appeal process. | CEO / General Manager / Lead entertainer | High | Open |

## 3. Tasks, maintenance, and management goals

| ID | Question or data needed | Decision owner | Risk | Status |
| --- | --- | --- | --- | --- |
| CL-020 | Confirm task states, acknowledgement rule, result-acceptance rule, rework and reopening authority. | CEO / Branch managers | High | Open |
| CL-021 | Confirm deadline reminders, escalation timing, notification channels, and manager/CEO visibility for overdue tasks. | Branch managers / CEO | Medium | Open |
| CL-022 | Confirm whether all staff use daily work plans and the required level of evidence for task completion. | CEO / Branch managers | Medium | Open |
| CL-023 | Confirm technical-maintenance and carpenter request categories, urgency levels, approval rule, and service-level targets. | Branch managers | Medium | Open |
| CL-024 | Confirm monthly sales target baseline, branch-manager proposal process, CEO approval, and review calendar. | CEO / Branch managers | High | Open |

## 4. Customer onboarding, CRM, and messaging

| ID | Question or data needed | Decision owner | Risk | Status |
| --- | --- | --- | --- | --- |
| CL-030 | Confirm required customer registration fields, duplicate matching and merge authority, age/identity requirements, and retention policy. | CEO / Reception / Legal adviser | High | Open |
| CL-031 | Approve customer terms, marketing-consent wording, channel preference wording, consent versioning, and opt-out procedure. | CEO / Marketing / Legal adviser | High | Open |
| CL-032 | Confirm which channels are available at launch: Viber, Telegram, email, SMS, Messenger, or in-app. | Marketing / Technical owner | High | Open |
| CL-033 | Confirm campaign creation and broadcast approval authority, message-review rule, and delivery/outcome metrics. | CEO / Marketing | High | Open |
| CL-034 | Confirm what customer information, reservations, and entertainer-affinity insight each role may view. | CEO / Legal adviser | High | Open |
| CL-035 | Confirm whether eligible VIP transport is a loyalty benefit, its qualification rules, booking process, and privacy safeguards. | CEO / Branch managers | Medium | Open |

## 5. Membership, points, and privileges

The supplied unified Membership & Loyalty proposal is the preferred requirements baseline. “Proposed” below means selected for the working baseline but still awaiting the named business owner's formal policy approval where required.

| ID | Question or data needed | Decision owner | Risk | Status |
| --- | --- | --- | --- | --- |
| CL-040 | Confirm customer-facing descriptions and translations for the selected five names: Bronze, Silver, Gold, Diamond, and Black Diamond. | CEO / Marketing | High | Proposed |
| CL-040A | Earlier New/Provisional plus rolling three-month average lifecycle. Superseded by the 12-month anniversary model in the preferred proposal. | CEO / General Manager | High | Superseded |
| CL-041 | Approve the 12-month individual qualification/anniversary model and define eligible spend, upgrade timing, minimum history, refunds, cancellations, discounts, complimentary items, and corrections. | CEO / General accountant / Marketing | High | Proposed |
| CL-043 | Confirm the five spend-threshold values and how branch inputs and multi-branch spend are normalized into one company-wide visible status. | CEO / Branch managers / General accountant | High | Open |
| CL-044 | Approve the 30-day grace period, at-most-one-level downgrade, shortfall notification cadence, manual exception authority, and review/appeal process. | CEO / Marketing | High | Proposed |
| CL-045 | Validate the working privilege matrix: annual transport quotas, monthly non-carrying entry quotas, reservation priority/notice, guest rules, premium-branch eligibility, hold/no-show, abuse, reset, and reversal rules. | CEO / Branch managers / Marketing | High | Open |
| CL-046 | Confirm point economics: final earn rates, point-to-MNT conversion, liability treatment, expiry, balance limits, eligible redemptions, breakage, refund behavior, fraud controls, approvals, and reversals. | CEO / General accountant | High | Open |
| CL-047 | Confirm how point earn/redemption and privilege use are verified at each branch and reconciled with POS transaction/refund records. | Branch managers / Transaction accountant / Technical owner | High | Open |
| CL-048 | Approve launch migration: use verified history from April 2026 onward; allow manager nomination when data is incomplete; require reason, source tag, and CEO approval; then move all members to the same automatic rules. | CEO / General Manager / Branch managers | High | Proposed |
| CL-049 | Confirm which roles may view or edit status, points, privileges, spend shortfall, branch rules, entertainer affinity, and manual assignment evidence. | CEO / Legal adviser | High | Open |

## 6. Integrations, security, and implementation

| ID | Question or data needed | Decision owner | Risk | Status |
| --- | --- | --- | --- | --- |
| CL-050 | Identify the current POS, attendance, reservation, messaging, bank, and E-Barimt systems and their API, export, or credential availability. | Technical owner / General accountant | High | Open |
| CL-051 | Confirm ERPNext/Frappe versions, existing custom apps, hosting, database, environments, source repository, and deployment workflow. | Technical owner | High | Open |
| CL-052 | Confirm backup, recovery, monitoring, access-review, incident-response, and audit-retention requirements. | CEO / Technical owner | High | Open |
| CL-053 | Confirm data privacy, retention, deletion, field masking, and export controls for employee, customer, and financial data. | CEO / Legal adviser / Technical owner | High | Open |
| CL-054 | Confirm pilot branches, pilot users, training owner, release criteria, and support ownership. | CEO / Branch managers | Medium | Open |

## Approval record template

When a clarification is decided, add a dated note below it:

- **Decision:**
- **Decision owner:**
- **Approved date:**
- **Rationale:**
- **Affected documents and Linear work:**
- **Policy or configuration effective date:**
