---
type: governance
status: active
last_reviewed: 2026-08-07
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
