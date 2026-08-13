# Manager CRM and ranking prototype boundary

- **Date:** 2026-08-13
- **Status:** Accepted for the browser-local prototype; no loyalty or ranking policy is approved by this record
- **Owner:** VIP Club product owner

## Context

The Branch Manager workspace already covers workforce scheduling, coverage, attendance, and team availability. The manager documentation also requires customer intelligence plus visibility into entertainer rank and customer membership level.

The source review included:

- `docs/business-needs.md`;
- `docs/product-overview.md`;
- `docs/crm-and-loyalty-requirements.md`;
- `docs/entertainer-ranking-policy.md`;
- `docs/requirements-reconciliation.md`;
- `docs/data-model.md`;
- `docs/functional-requirements.md`;
- `docs/03-roles/ROLE_PERMISSION_MATRIX.md`;
- `docs/08-ux/INTERNAL_PWA.md`;
- `docs/07-integrations/POS_API_REQUIREMENTS_FOR_PROVIDER.md`;
- `docs/stakeholder-clarification-register.md`.
- `docs/decisions/2026-08-11-vip-club-business-logic-reconciliation.md` and its Linear sources BAT-75, BAT-83, BAT-84, and BAT-96.

The reconciled baseline supports manager search and filtering, customer visit/spend intelligence, entertainer affinity, current membership-level visibility, five named customer levels calculated from average eligible expenditure per completed eligible visit, and Rank 1/2/3 entertainer reviews on a 14-day cadence. Complete customer field visibility, cross-branch access, exact branch ranges, eligible-spend treatment, entertainer metric weights/thresholds, and manual-adjustment details remain open.

## Decision

The browser-local Manager UI may provide two new read-oriented surfaces for the authorized branch:

1. **Customer management**
   - searchable and filterable masked customer list;
   - current source membership level;
   - visit cadence and last visit;
   - average/minimum/maximum spend and lifetime value;
   - reservation-derived entertainer affinity;
   - consented channel indicators;
   - verified benefit-use and policy-version evidence without inventing a standalone cashback balance;
   - recent reconciled visit records and data freshness.
2. **Ranking review**
   - current source entertainer rank;
   - separate verified evidence for attendance, unresolved no-show, reservations, repeat customers, sales trend, training, complaints, and history completeness;
   - current source customer membership level;
   - a clearly labelled eligible-expenditure-per-completed-visit explanation that does not assign a level without the active branch range and policy version.

The UI must remain Mongolian-first, branch-scoped, and privacy-minimized. It must not expose full phone numbers, identity documents, private notes, unrestricted exports, campaign sending, threshold editing, rank editing, membership reassignment, benefit changes, or financial-value transactions.

## Consequences

- Managers can review useful branch customer and ranking evidence without waiting for every policy decision.
- The UI does not convert proposed policies into hidden production rules.
- Membership and ranking displays remain informational until the corresponding source assignments and policy versions are provided by secure server APIs.
- Production release remains blocked on customer field-level permission approval, POS/reservation reconciliation, privacy/retention controls, the remaining BAT-83/BAT-96 policy parameters, and CL-030 through CL-047 as applicable.
- Future write actions must be implemented as server-authorized, effective-dated, audited workflows rather than client-side controls.

## Follow-up functions after approval

- secure branch and field-projected CRM API;
- duplicate/identity resolution and consent history;
- versioned membership policy and branch threshold editor;
- membership evaluation, grace, review, and adjustment workflow;
- versioned entertainer ranking evaluation, appeal, and authorized override workflow;
- approved benefit/points entitlement and source-linked ledger integration;
- consent-aware segmentation/campaign workflow with approval and delivery evidence.
