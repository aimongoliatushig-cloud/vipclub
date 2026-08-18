# Requirements Reconciliation

## Merge outcome

The ERPNext/Frappe package is now the detailed blueprint. The live project conversations add immediate priorities and CRM specifics. They are compatible when organized as the unified delivery roadmap.

## Duplicate ideas consolidated

| Topic | Unified treatment |
| --- | --- |
| Customer registration and consent | Phase 1: reception/host registration, consent, and preferred channels |
| CRM, visits, reservations, and entertainer affinity | Phase 3: customer 360 and intelligence |
| Five-level loyalty | Phase 3: configurable policy, levels, benefits, and cashback |
| Task management and accountability | Phase 2: tasks, evidence, comments, approval, notifications, dashboards |
| Policies and configurable thresholds | Versioned, auditable configurations with role and branch scope |
| Analytics and dashboards | Phase-specific dashboards backed by source evidence |
| GitHub and Linear | GitHub Markdown is the knowledge base; Linear is execution tracking |

## New details from live conversations

- Managers can configure branch-specific membership thresholds.
- CRM requires segmentation and consent-aware rich-media campaigns.
- Per-member communication history must be retained.
- Benefits vary by membership level, and their use must be tracked.
- Cashback is a monetary-value ledger with credit, redemption, expiry, adjustment, and notification events.
- Customer intelligence includes visit frequency, visit cadence, spend ranges, entertainer affinity, and lifetime value.
- Phase 2 workforce tasks require execution notes, images, and results.

## Conflicts or decisions to resolve

| Decision | Why it matters |
| --- | --- |
| Membership evaluation window and eligible-spend details | The authoritative metric is now average eligible expenditure per eligible completed visit, recalculated after each eligible completed visit. Final visit/date window, minimum visit count, eligible-spend exclusions, rounding, and boundary rules require approval. |
| Branch-specific versus company-wide membership | Branch managers set thresholds, but multi-branch member classification is not yet defined. |
| Five membership names and benefits | The package proposes some names and examples; final names, thresholds, eligibility, and expiry require approval. |
| Customer lifetime value | Confirm whether this is total customer spend or net revenue after discounts, benefits, and cashback. |
| Benefit and cashback controls | Confirm point value, eligible items, expiry, approvals, reversal rules, and budget ownership. |
| Task completion governance | Confirm task states, result acceptance, rework, reopening, notification channels, and escalation rules. |
| Customer data and communications privacy | Confirm consent wording, channel provider capabilities, opt-out handling, retention, and role visibility. |

## Source priority

1. Approved decision records and production behavior.
2. Confirmed business decisions in project conversations.
3. The existing Phase 1 master specification.
4. The ERPNext/Frappe knowledge package.
5. Proposed defaults and new assumptions.


## Additions confirmed after the initial merge

### Organization and roles

The role catalog now includes CEO, branch manager, lead entertainer, entertainer, server, bartender, host/receptionist, VIP customer, marketing and content manager, general accountant, transaction accountant, payment accountant, accounting clerk, human resources manager, purchasing manager, technical assistant, carpenter, security officer, driver, and system administrator.

The generic Employee login role was removed. Personnel records may still use employee data, but access is granted through specific job roles.

### Employment, pay, and loans

Three pay models are now recognized:

1. Performance-based entertainer subcontractor, settled every three days from verified sales and approved adjustments.
2. Day-based contract worker, paid from approved worked days and additional approved days.
3. Main fixed-salary employee, paid from fixed salary plus approved additional workdays.

Each model may apply approved lateness/no-show penalties, loan repayments, and audited adjustments.

### Monthly sales goals and Hermes

- Each branch sales manager prepares a monthly sales target and action plan.
- Hermes prepares evidence-based recommendations roughly three days before the new month.
- The CEO reviews, asks questions, returns for revision, and alone approves the active goal.
- Approved target progress is tracked through actual sales, achievement percentage, and a progress bar.
- Hermes sends configurable afternoon reminders through the PWA only; it cannot approve or silently change targets.

### CRM, loyalty, and communication

- Customer intelligence includes member segmentation, visit cadence, spend ranges, entertainer affinity, lifetime value, and campaign outcomes.
- Membership thresholds are branch-specific, versioned, and configurable by authorized users; cross-branch classification remains open.
- Every eligible completed visit and relevant financial correction triggers evaluation using eligible net expenditure divided by eligible completed visits in the effective policy window.
- A calculation produces a recommendation only. An authorized manager must approve before an upgrade or downgrade takes effect.
- Managers can Keep current for one evaluation; later visits continue evaluation and may refresh the recommendation.
- Benefits and cashback require an auditable entitlement and ledger model.
- Customer communications remain consent-based and channel-preference-aware; internal operational notifications use the PWA.

## Remaining reconciliation gaps

The reconciliation is now current for documented conversation decisions, but it cannot be final until the existing ERPNext/Frappe repository, the Phase 1 master specification, current integrations, and approved policy documents are audited. Any future business decision must be reflected in the relevant module document and in this register if it changes scope, conflicts with an earlier rule, or introduces an implementation risk.
