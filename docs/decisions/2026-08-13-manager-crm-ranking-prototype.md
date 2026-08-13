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

The documents support manager search and filtering, customer visit/spend intelligence, entertainer affinity, current membership-level visibility, and explainable rank evidence. They do not yet approve complete customer field visibility, cross-branch customer access, final membership names or thresholds, the membership formula, entertainer score weights, promotion/demotion rules, or manual override authority.

## Decision

The browser-local Manager UI may provide two new read-oriented surfaces for the authorized branch:

1. **Customer management**
   - searchable and filterable masked customer list;
   - current source membership level;
   - visit cadence and last visit;
   - average/minimum/maximum spend and lifetime value;
   - reservation-derived entertainer affinity;
   - consented channel indicators;
   - benefit-use and cashback balance evidence;
   - recent reconciled visit records and data freshness.
2. **Ranking review**
   - current source entertainer rank;
   - separate verified evidence for attendance, unresolved no-show, reservations, repeat customers, sales trend, training, complaints, and history completeness;
   - current source customer membership level;
   - a clearly labelled three-month spend explanation that does not calculate or assign a level.

The UI must remain Mongolian-first, branch-scoped, and privacy-minimized. It must not expose full phone numbers, identity documents, private notes, unrestricted exports, campaign sending, threshold editing, rank editing, membership reassignment, benefit changes, or cashback transactions.

## Consequences

- Managers can review useful branch customer and ranking evidence without waiting for every policy decision.
- The UI does not convert proposed policies into hidden production rules.
- Membership and ranking displays remain informational until the corresponding source assignments and policy versions are provided by secure server APIs.
- Production release remains blocked on customer field-level permission approval, POS/reservation reconciliation, privacy/retention controls, CL-017, and CL-030 through CL-047 as applicable.
- Future write actions must be implemented as server-authorized, effective-dated, audited workflows rather than client-side controls.

## Follow-up functions after approval

- secure branch and field-projected CRM API;
- duplicate/identity resolution and consent history;
- versioned membership policy and branch threshold editor;
- membership evaluation, grace, review, and adjustment workflow;
- versioned entertainer ranking evaluation, appeal, and authorized override workflow;
- benefit entitlement/redemption and cashback ledger integration;
- consent-aware segmentation/campaign workflow with approval and delivery evidence.
