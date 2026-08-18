# CRM and Loyalty Requirements

This document defines the Phase 3 customer CRM, intelligence, membership, benefit, cashback, and communication requirements.

## Goals

- Maintain one explainable customer profile across visits, reservations, spending, consent, communications, benefits, and cashback.
- Develop customer intelligence from verified visit and reservation behavior, including entertainer affinity where the viewer is authorized.
- Measure loyalty using approved, branch-specific membership policies.
- Assign every eligible member to one of five membership levels.
- Recalculate membership eligibility after every eligible completed visit.
- Require an authorized manager decision before any recommended membership upgrade or downgrade takes effect.
- Preserve every calculation, recommendation, decision, policy version, and source record for audit.

## Terminology

- **Current approved level:** Membership level presently effective for the customer.
- **Calculated level:** Level produced by the current policy and verified source data.
- **Recommendation:** Proposed upgrade or downgrade when the calculated level differs from the current approved level.
- **Keep current:** Manager decision to retain the current approved level for one evaluation. It does not suppress future evaluations.
- **Eligible completed visit:** A completed visit with a paid and reconciled bill that qualifies under the effective loyalty policy.
- **Eligible net expenditure:** Policy-defined expenditure after required exclusions and reversals.
- **Evaluation window:** Approved visit/date range used in the average-spend-per-visit calculation.

## Selected membership model

- Each branch has its own versioned membership policy and numerical benchmarks.
- System administrators and authorized branch managers can configure thresholds only within their permitted branch scope.
- A policy defines five ordered levels, threshold ranges, eligible expenditure rules, evaluation window, minimum visit history, approval authority, notification behavior, and effective date.
- Threshold ranges must not overlap or leave unintended gaps.
- Policy changes must record editor, approver when required, previous/new values, reason, effective date, and policy version.
- Policy changes are prospective. Historical evaluations retain the policy version used at the time and are never silently rewritten.
- Activation of a policy may trigger a controlled preview showing how many customers would receive upgrade or downgrade recommendations.
- A policy must not become effective retroactively unless an authorized correction workflow explicitly permits it.

## Authoritative membership calculation

The authoritative metric is average eligible expenditure per eligible completed visit:

```text
Average expenditure per visit
= Sum of eligible net expenditure in the evaluation window
÷ Count of eligible completed visits in the evaluation window
```

The calculation must use decimal-safe currency arithmetic and the approved rounding rule. The evaluation snapshot must retain the unrounded result and the displayed rounded result.

### Evaluation-window policy

The exact production window remains a CEO or General Manager policy decision. The recommended default is the most recent 10 eligible completed visits, limited to the previous 12 months.

The CRM may show lifetime average expenditure per visit as customer intelligence, but membership eligibility must use only the evaluation window defined by the effective policy.

### Eligible and ineligible events

A calculation is triggered when:

- A visit becomes completed and its linked bill becomes paid and reconciled.
- A previously eligible bill is refunded, voided, corrected, or reattributed.
- A source record correction changes eligible spend or eligible visit count.
- An authorized user requests a controlled recalculation after data reconciliation.
- A new policy takes effect and its activation settings require evaluation.

The following do not count unless an approved policy explicitly says otherwise:

- Requested or confirmed reservations that have not been completed.
- Cancelled reservations and no-shows.
- Open, unpaid, voided, or fully refunded bills.
- Complimentary consumption.
- Reversed or duplicate transactions.
- Transactions not reliably linked to the customer.

Partial refunds reduce eligible net expenditure according to the effective policy. Corrections never overwrite a prior snapshot; they create a new evaluation linked to the correction or reversal.

## Per-visit evaluation lifecycle

1. Receive and reconcile an eligible visit and bill.
2. Resolve the customer, branch, visit, bill, and effective loyalty policy.
3. Load eligible visits and eligible net expenditure for the policy window.
4. Calculate average expenditure per visit.
5. Determine the calculated level from the branch thresholds.
6. Save an immutable Membership Evaluation Snapshot with source references and explanation.
7. Compare the calculated level with the current approved level.
8. If equal, close the evaluation as **No change**.
9. If different, create or refresh an active **Membership Change Recommendation**.
10. Notify the authorized branch manager in the PWA.
11. Require a manager decision before changing the effective level.
12. If approved, create a new Membership Level Assignment and update entitlements.
13. If kept current, retain the existing level and record the manager, time, reason, and evaluation.
14. Continue evaluating every later eligible visit. A keep-current decision never disables or pauses calculation.

## Recommendation behavior and de-duplication

- A customer can have at most one active recommendation for the same branch and direction.
- A later eligible visit creates a new evaluation snapshot.
- If an unresolved or previously retained recommendation still applies, the system refreshes the active recommendation rather than creating alert spam.
- The recommendation shows first-recommended date, latest-evaluation date, number of consecutive qualifying evaluations, previous calculated value, latest calculated value, and direction of movement.
- If the calculated level returns to the current approved level before approval, the recommendation closes automatically as **No longer applicable**, while history remains.
- If the calculated result crosses another threshold, the recommendation updates to the latest calculated level and severity.
- A manager's keep-current decision applies only to the referenced evaluation. If the next eligible visit still produces a different calculated level, the system must recommend again.
- Pending recommendations must not change customer benefits, cashback rules, or customer-visible level.

## Manager decisions

An authorized manager can select:

1. **Approve upgrade**
2. **Approve downgrade**
3. **Keep current level**
4. **Review later**

Rules:

- Approve changes the effective level using a new Membership Level Assignment; it never edits history.
- Keep current requires a reason and retains the existing level.
- Review later leaves the recommendation pending and may require a follow-up date.
- A manager cannot approve a recommendation outside the manager's branch scope.
- A manager cannot approve their own unauthorized manual override.
- Manual level changes that are not supported by the calculated result require a separate override workflow and the approval authority defined in policy.
- Multi-level changes and overrides may require General Manager or CEO approval.
- A downgrade decision must respect any configured grace rule and customer-notification policy.
- All decisions record actor, role, branch, timestamp, evaluation, policy version, old/current/calculated/approved level, reason, and optional note.

## Recommendation severity and escalation

Severity is configurable by policy. Recommended defaults:

- First threshold crossing: **Normal**
- Two consecutive evaluations below/above threshold: **Warning**
- Three or more consecutive evaluations: **Strong warning**
- Calculated result more than one level from current: **Urgent**
- Pending longer than the policy review SLA: escalate to General Manager or CEO

Escalation provides visibility; it does not automatically apply a level change.

## New-customer and stability controls

- A new customer starts as **New / Provisional** until the policy's minimum eligible visit count is met.
- Recommended default: three eligible completed visits before a permanent level recommendation.
- Policy may restrict a single evaluation from changing more than one level.
- Upgrade and downgrade grace rules are independently configurable.
- These rules must be displayed in the calculation explanation.

## Membership recommendation states

- No Change
- Pending Review
- Review Later
- Kept Current
- Approved
- No Longer Applicable
- Superseded
- Escalated
- Cancelled Due to Data Correction

## Customer 360 membership display

Managers must see:

- Current approved level and effective date
- System-calculated level
- Average expenditure per eligible visit
- Evaluation visit count and window
- Eligible expenditure total
- Applied branch and policy version
- Current-level threshold and next-level threshold
- Difference from the applicable threshold
- Recommended direction and severity
- First recommendation and latest recalculation dates
- Consecutive qualifying evaluation count
- Pending manager action
- Previous manager decisions and keep-current reasons
- Data freshness and reconciliation status

The list view must support filters for current level, calculated level, recommendation direction, severity, pending age, branch, recent visit date, and data-quality status.

## Customer intelligence

Managers need a searchable and filterable member view including:

- Current approved and calculated membership levels.
- Visit frequency, cadence, preferred days, and preferred time periods.
- Lifetime and policy-window average, minimum, and maximum expenditure.
- Recency and days since last visit.
- Branch behavior and cross-branch behavior where authorized.
- Entertainers the member reserves most often or shows affinity toward.
- Reservation completion, cancellation, and no-show patterns.
- Member-level and aggregate insights.

## Customer segmentation and campaigns

- Managers can define segments using authorized customer attributes and behavior.
- Recommendation status and current/calculated level may be used as segmentation criteria, but a pending recommendation must not be presented to the customer as an effective level.
- Messages may be sent only through a channel for which the customer has valid consent.
- Supported preferred channels include Viber, Telegram, and email, subject to provider availability.
- Communication history records campaign, content reference, channel, send time, delivery status, consent state, response, reservation attribution, and outcome where available.

## Benefits and cashback

- Each effective membership level can have different benefits and privileges.
- Benefits change only after the membership change is approved and becomes effective.
- Managers can create, update, retire, and associate benefits within authorized policy controls.
- Every privilege use, expiry, reversal, and adjustment is auditable.
- Cashback is maintained through an immutable monetary-value ledger.
- Pending recommendations never change cashback balance or effective entitlements.

## Functional requirements

| ID | Requirement |
| --- | --- |
| FR-CRM-001 | The system must maintain customer relationship information. |
| FR-CRM-002 | The system must associate customer reservations with entertainers. |
| FR-CRM-003 | The system must support explainable customer-loyalty measurement. |
| FR-CRM-004 | Each eligible member must have one current approved level from five configured levels, or New / Provisional status. |
| FR-CRM-005 | Membership eligibility must be calculated as eligible net expenditure divided by eligible completed visits within the effective policy window. |
| FR-CRM-006 | Authorized administrators and branch managers must configure versioned branch-specific membership thresholds. |
| FR-CRM-007 | Managers must filter customers by current level, calculated level, recommendation status, and severity. |
| FR-CRM-008 | The system must show customer visit and expenditure statistics with date range and data freshness. |
| FR-CRM-009 | The system must provide permission-controlled entertainer-affinity insights from reservation history. |
| FR-CRM-010 | Managers must create and manage customer segments. |
| FR-CRM-011 | The system must support consent-aware multimedia campaign messaging. |
| FR-CRM-012 | The system must retain per-member communication history and outcomes. |
| FR-CRM-013 | Managers must manage benefits by effective membership level within approved controls. |
| FR-CRM-014 | The system must record benefit entitlement and usage. |
| FR-CRM-015 | The system must maintain an auditable cashback credit, redemption, expiry, reversal, and adjustment ledger. |
| FR-CRM-016 | The system must notify customers about cashback only through consented preferred channels. |
| FR-CRM-017 | Every eligible completed visit and relevant financial correction must trigger membership reevaluation. |
| FR-CRM-018 | The system must save an immutable, explainable evaluation snapshot before comparing levels. |
| FR-CRM-019 | When calculated and current approved levels differ, the system must create or refresh a manager recommendation. |
| FR-CRM-020 | No recommended upgrade or downgrade may take effect without authorized manager approval. |
| FR-CRM-021 | Managers must be able to approve, keep current, or review later, subject to branch and approval scope. |
| FR-CRM-022 | Keep current must retain the level for that evaluation only and must not suppress later recalculations or recommendations. |
| FR-CRM-023 | Recommendations must be de-duplicated, refreshed with later evaluations, and retain full history. |
| FR-CRM-024 | If the calculated level returns to the current level, the active recommendation must close without deleting its history. |
| FR-CRM-025 | Pending recommendations must not alter customer-visible level, benefits, or entitlements. |
| FR-CRM-026 | Threshold, policy, evaluation, recommendation, decision, assignment, correction, and override events must be auditable. |
| FR-CRM-027 | The system must escalate overdue or repeated recommendations according to policy without automatically changing the level. |
| FR-CRM-028 | The system must enforce minimum-history, grace, and maximum-level-change rules configured in the effective policy. |

## Acceptance scenarios

### AS-CRM-01 — No level change
A reconciled visit is completed, the average remains inside the current threshold, an evaluation snapshot is stored, and no recommendation is created.

### AS-CRM-02 — Upgrade approval
A completed visit raises the average above the next threshold. The system recommends an upgrade. Benefits remain unchanged until the branch manager approves. Approval creates a new effective assignment and audit record.

### AS-CRM-03 — Downgrade kept current
A completed visit lowers the average below the current threshold. The manager selects Keep current and enters a reason. The effective level remains unchanged.

### AS-CRM-04 — Recommendation appears again
After AS-CRM-03, another eligible visit lowers or maintains the average below the threshold. The system creates a new evaluation and refreshes the downgrade recommendation, showing the earlier keep-current decision and latest movement.

### AS-CRM-05 — Recommendation becomes inapplicable
A pending downgrade exists, but a later eligible visit returns the average to the current threshold. The recommendation closes as No Longer Applicable; no level assignment changes.

### AS-CRM-06 — Refund correction
A refund changes eligible expenditure. The system creates a corrective evaluation linked to the refund and updates the recommendation without altering or deleting prior snapshots.

### AS-CRM-07 — Permission enforcement
A Nomad branch manager cannot configure Sapphire thresholds or approve a Sapphire customer recommendation.

### AS-CRM-08 — Policy version preservation
A threshold changes prospectively. Earlier evaluations still display the prior policy and explanation; new evaluations use the new effective policy.


## Customer 360 information architecture

The CRM landing page must be a role-aware Customer Intelligence Dashboard, not the existing customer-list-left/detail-right layout. Preserve reusable brand styles, not the current page composition.

Required progression:

```text
Dashboard → Insight Detail → Filtered Customer Explorer → Customer 360 → Source evidence
```

- CEO defaults to all four branches with comparison and drill-down.
- Branch managers default to and remain constrained to their authorized branch.
- Every meaningful card, chart element, alert, insight row, and customer name must be interactive.
- Dashboard interactions preserve branch, date, and comparison filters.
- The complete customer directory is a separate Customer Explorer.
- Clicking any customer name opens one canonical full-page Customer 360 Profile.
- Customer details must not be limited to a narrow side panel.
- Required detail screens must be implemented; dashboard elements may not end at placeholders.
- The canonical profile combines summary, management insights, unified timeline, visit/spend analytics, membership evidence and decisions, benefits/cashback, consent/communications, actions, and source/audit links.
- Full navigation, screen responsibilities, states, and acceptance criteria are defined in [Internal PWA — Customer 360 Information Architecture](08-ux/INTERNAL_PWA.md).
- Metrics and role-specific dashboard content are defined in [Dashboard Catalog](09-analytics/DASHBOARD_CATALOG.md).

### Additional functional requirements

| ID | Requirement |
| --- | --- |
| FR-CRM-029 | The CRM landing page must be a role-aware customer intelligence dashboard and must not retain the previous list-left/detail-right layout. |
| FR-CRM-030 | Every actionable dashboard metric, chart element, alert, and insight must open the correct filtered detail view with context preserved. |
| FR-CRM-031 | The Customer Explorer must be a separate route with server-side search, filters, sorting, and pagination. |
| FR-CRM-032 | Every visible customer name must open one canonical full-page Customer 360 Profile. |
| FR-CRM-033 | CEO must receive company-wide four-branch comparison and drill-down; branch managers must remain branch-scoped. |
| FR-CRM-034 | Insight details must expose definitions, filters, trends, contributing customers, source totals, freshness, and permitted evidence links. |
| FR-CRM-035 | Dashboard and detail screens must implement loading, empty, denied, partial, stale, error, and superseded-decision states. |
| FR-CRM-036 | No dashboard insight or required detail screen may end at a dead link or placeholder. |

## Remaining policy decisions

- Final five level names and threshold values for each branch.
- Exact evaluation window: recommended recent 10 eligible visits within 12 months.
- Minimum eligible visit count: recommended three.
- Eligible net expenditure treatment for tax, service charge, discounts, cashback, complimentary items, partial refunds, and shared/group bills.
- Rounding and boundary rules when the calculated value equals a threshold.
- Upgrade/downgrade grace periods and maximum change per decision.
- Which changes require branch manager, General Manager, or CEO approval.
- Recommendation review SLA and escalation recipients.
- Company-wide versus branch-specific level for customers using multiple branches.
- Customer notification timing and wording after approved changes.
