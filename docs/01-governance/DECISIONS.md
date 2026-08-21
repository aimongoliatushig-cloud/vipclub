---
type: governance
status: active
last_reviewed: 2026-08-18
---

# Decision Register

## Purpose

Record material product and technical decisions, their authority, rationale, effective dates, affected work, and superseded assumptions.

## Decision status meanings

- **Selected baseline:** preferred requirements direction for design and documentation; named business owners must still approve financial values or policy activation where stated.
- **Approved:** formally approved by the accountable decision owner.
- **Superseded:** replaced by a later selected or approved decision.
- **Open:** no preferred direction has been selected.

## DR-LOY-001 — Unified membership and point model

- **Date recorded:** 2026-08-07
- **Status:** Selected baseline
- **Source:** VIP_Membership_Loyalty_Proposal_MN.md, supplied as the preferred version
- **Decision owner for policy activation:** CEO / General Manager / General accountant / Branch managers, according to each open item

### Decision

VIP Club will use:

- one membership account across all four branches;
- one visible status: Bronze, Silver, Gold, Diamond, or Black Diamond;
- one cross-branch point balance;
- branch-specific privilege eligibility without branch-specific visible demotion;
- point/credit earn and redemption instead of permanent POS membership discounts;
- a 12-month individual anniversary review;
- a 30-day grace period before an at-most-one-level downgrade;
- CRM as the source of truth for membership, points, privileges, redemptions, anniversaries, and approvals;
- POS as the source of verified transaction and refund facts;
- launch classification from available verified history from April 2026 onward, with manager nomination, reason, source tag, and CEO approval when data is incomplete.

### Rationale

The model creates a coherent cross-branch customer identity, encourages repeat visits and status aspiration, avoids weakening margin through permanent discounts, fits the current POS constraint, and allows premium branches to protect their economics through privilege eligibility.

### Superseded assumptions

- New/Provisional status followed by a rolling three-month average as the primary membership lifecycle.
- A separate visible membership rank for each branch.
- Cashback as a separate loyalty balance.
- Dynamic or permanent POS membership discount as a required mechanism.

### Values not yet approved

This decision does not approve the example 1%–5% earn rates, five spend thresholds, point-to-MNT conversion, expiry, transport quotas, entry quotas, reservation notice windows, Bronze entry rule, guest rules, no-show terms, Nomad-specific privilege thresholds, or other operating constants. These remain in the stakeholder clarification register.

### Affected documentation

- CRM and Loyalty Requirements
- Product Overview
- Business Needs
- Business Process Catalog
- Technical Architecture
- Data and Domain Model
- Roadmap
- Knowledge-Base Gap Analysis
- Loyalty Module
- Customer PWA
- English and Mongolian Stakeholder Clarification Registers

### Implementation guardrail

No implementation may expose a different visible status by branch, create a second point balance, restore the superseded three-month lifecycle, or hard-code unapproved example values without a later approved decision.

## DR-ENT-001 — Human-controlled entertainer ranking and Gold start

- **Date recorded:** 2026-08-07
- **Status:** Selected baseline
- **Source:** Client interview requirements delta

### Decision

Entertainers use Bronze, Silver, Gold, and Diamond ranks. New entertainers start at Gold. The system calculates four-dimension evidence and an explainable recommendation; an authorized human makes the final rank decision.

### Superseded assumptions

- Onboarding/provisional entertainer starting rank.
- Fully automated rank changes.

### Values not yet approved

Metric weights, thresholds, work nights, loyalty rule, Diamond conditions, cadence, promotion/demotion, grace, and final approval hierarchy remain **TBD — Business configuration required**.

## DR-GOAL-001 — CEO-set monthly target and manager plan

- **Date recorded:** 2026-08-07
- **Status:** Selected baseline
- **Source:** Client interview requirements delta

### Decision

The CEO sets the monthly sales target. The Branch Manager prepares an AI-assisted action plan and submits it for CEO approval. Execution uses ERPNext/Frappe projects/tasks where practical. Month-end review covers sales, plan execution, KPI, and human-reviewed reward/penalty outcomes.

### Superseded assumptions

- Branch Sales Manager proposes the monthly target.
- Planning is fixed at exactly three days before the month.

### Values not yet approved

Early-month deadlines, target baseline, KPI weights, penalty boundaries, reward formula, and branch-health formula remain **TBD — Business configuration required**.

## DR-OPS-001 — Existing Customer Assistant and Frappe realtime operations

- **Date recorded:** 2026-08-07
- **Status:** Selected baseline
- **Source:** Client interview requirements delta

### Decision

Extend the existing Customer Assistant and internal PWA. Use permission-checked Frappe services and the selected Frappe realtime/event mechanism for room/session, check-in, reservations, entertainer availability/visibility, requests, and operations workstation updates. Do not create a redundant customer app or a second realtime system.

CallPro integrates through a provider-neutral adapter after API discovery. Provider call facts remain separate from ERP-side business classification.

## DR-AI-001 — Role-scoped assistants with human authority

- **Date recorded:** 2026-08-07
- **Status:** Selected baseline
- **Source:** Client interview requirements delta

### Decision

CEO, Manager, and Entertainer assistants have separate role contexts and allowlisted backend tools. AI may analyze, explain, recommend, forecast, coach, and draft projects/tasks. It cannot expand permissions or authorize ranking, compensation, punishment, termination, financial posting, policy, target plan, or reward/penalty decisions.

