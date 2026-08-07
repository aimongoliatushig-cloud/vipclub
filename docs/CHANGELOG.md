---
type: changelog
status: active
last_reviewed: 2026-08-07
---

# Knowledge-Base Changelog

## 2026-08-07 — Client interview requirements delta

Merged the client interview requirements into the existing authoritative specification.

### Added or extended

- Call Operator role, CallPro adapter requirements, call classification, blocking, customer lookup, reservation, and reporting.
- Internal/public entertainer profile separation, field masking, four-dimension ranking evidence, Gold starting rank, and human final decisions.
- Configurable entertainer revenue shares, tips, wine commission, spreading tip, transparent three-day statements, and audit.
- Room-QR Customer Assistant, public entertainer profiles, realtime availability/requests, extra services, and customer feedback.
- Reception check-in, structured drop-off, bill reconciliation exceptions, and consolidated manager/bartender operations view.
- CEO-set targets, manager AI-assisted plans, ERPNext tasks/projects, manager KPI candidates, penalty/reward review, history, and branch-health configuration marked **TBD — Business configuration required**.
- Direct internal messaging, upward and recipient-anonymous feedback, audited sender reveal.
- Role-scoped CEO, Manager, and Entertainer assistants.
- KPI, dashboard, permission, segregation, API, realtime, data-model, state, module, and integration documentation.

### Conflicts resolved

- Gold replaces provisional/onboarding entertainer starting rank.
- CEO-set monthly target replaces manager-proposed target.
- Configurable early-month timing replaces fixed three-days-before-month planning.
- Human rank decisions replace any implication of fully automatic ranking.
- Existing Customer Assistant and Frappe realtime mechanisms are extended instead of creating duplicates.

### Still open

CallPro provider contract, ranking values, Diamond conditions, compensation values, deductions, extra-service rules, request SLA, room/session security, drop-off/reconciliation policy, manager KPI, penalties, rewards, branch health, task states, anonymous-feedback policy, and AI tool allowlists are marked **TBD — Business configuration required**.

## 2026-08-07 — Unified membership and loyalty baseline

Merged the preferred ideas and requirements from VIP_Membership_Loyalty_Proposal_MN.md into the GitHub knowledge base.

### Added or selected

- One membership account, one visible status, and one point balance across four branches.
- Bronze, Silver, Gold, Diamond, and Black Diamond status names.
- Branch-specific privilege eligibility without branch-specific visible demotion.
- Point/credit earn and redemption instead of permanent POS membership discount.
- Individual 12-month anniversary review, 30-day grace, and at-most-one-level downgrade.
- CRM membership source of truth and POS verified-transaction source.
- Cross-branch point earn and redemption.
- Working privilege framework for transport, monthly entry, and reservation priority.
- Launch migration using available history from April 2026 onward plus manager nomination and CEO approval when data is incomplete.
- Audit source labels including Automatic, Manager Recommended, and CEO Approved.
- Customer spend-shortfall and next-status visibility.

### Superseded

- Rolling three-month average as the preferred membership lifecycle.
- Separate visible status classification by branch.
- Separate cashback framing where it conflicts with the unified point/credit account.
- Permanent or dynamic POS membership discount as a dependency.

### Still open

Example earn rates, spend thresholds, point-to-MNT conversion, expiry, exact privilege quantities and terms, upgrade timing, eligible-spend rules, cross-branch threshold normalization, role authority, and POS reconciliation require formal validation.

### Documents aligned

Updated the canonical CRM requirements, product overview, business needs, process catalog, technical architecture, data model, roadmap, gap analysis, loyalty module, customer PWA, documentation index, decision register, and English/Mongolian stakeholder clarification registers.

Existing membership and legacy benefit/cashback BPMN diagrams are flagged for later revision before implementation.
