# CRM and Loyalty Requirements

## Status and precedence

This document is the canonical requirements baseline for VIP Club CRM, membership, points, privileges, and customer intelligence.

The unified Membership & Loyalty proposal supplied on 2026-08-07 is the preferred product direction. It supersedes conflicting earlier assumptions about a rolling three-month membership average, branch-specific visible ranks, and a separate cashback model. Numerical earn rates, spend thresholds, exact privilege limits, expiry, and operating windows remain working proposals until the accountable business owners validate them.

## Goals

- Increase repeat visits, visit frequency, recognized customer value, and aspiration to reach or retain a higher status.
- Unite all four branches through one membership identity and one point balance.
- Protect branch positioning and margins by using branch-specific privilege eligibility instead of permanent transaction discounts.
- Give managers searchable customer intelligence from visits, spend, reservations, and entertainer affinity.
- Keep every status, point, privilege, approval, and correction explainable and auditable.

## Selected membership model

- Every member has one company-wide membership account.
- Every member has one visible status across all four branches.
- The five status names are Bronze, Silver, Gold, Diamond, and Black Diamond.
- A member never appears as a lower status merely because the member visits another branch.
- Each branch may define which privileges are available at each status. A premium branch may reserve selected privileges for Diamond or Black Diamond without changing the member's visible status.
- All eligible transactions across the four branches contribute to one point account.
- Points may be redeemed at any branch, subject to the approved point and redemption policy.
- CRM is the source of truth for status, points, privilege entitlements, redemptions, anniversary reviews, and approvals. POS is the source of verified transaction facts.

## Requirements

| ID | Requirement |
| --- | --- |
| FR-CRM-001 | The system must maintain a permission-controlled customer relationship profile. |
| FR-CRM-002 | The system must associate reservations and verified visits with branches and entertainers where applicable. |
| FR-CRM-003 | The system must calculate customer-loyalty and value measures from traceable source records. |
| FR-CRM-004 | Every active member must have one of five visible statuses: Bronze, Silver, Gold, Diamond, or Black Diamond. |
| FR-CRM-005 | Membership qualification and retention must use approved eligible spend over an individual 12-month qualification period. |
| FR-CRM-006 | Authorized users must be able to configure effective-dated branch threshold inputs; the policy must still produce one company-wide visible status and explain how multi-branch spend and branch thresholds were combined. |
| FR-CRM-007 | Managers must be able to search and filter members by status, branch behavior, visit cadence, and value measures. |
| FR-CRM-008 | The system must show member visit and spend statistics with date-range and branch filters. |
| FR-CRM-009 | The system must provide permission-controlled entertainer-affinity insight from reservation history. |
| FR-CRM-010 | Managers must be able to create and manage customer segments. |
| FR-CRM-011 | The system must support consent-aware multimedia campaign messaging. |
| FR-CRM-012 | The system must retain a per-member communication history and consent changes. |
| FR-CRM-013 | Authorized managers must be able to configure effective-dated privileges by status and branch. |
| FR-CRM-014 | The system must issue, consume, reset, expire, reverse, and audit privilege entitlements and quotas. |
| FR-CRM-015 | The system must maintain one immutable point ledger per member for earn, redemption, expiry, reversal, and adjustment events. |
| FR-CRM-016 | The system must notify customers about points or privileges only through consented channels. |
| FR-CRM-017 | A member's status name must remain identical at every branch; only privilege eligibility may vary by branch. |
| FR-CRM-018 | Eligible transactions from every branch must contribute to the same point balance. |
| FR-CRM-019 | A member must be able to redeem available points at any branch, subject to approved eligibility and control rules. |
| FR-CRM-020 | The loyalty model must not depend on a permanent or dynamic POS membership discount. |
| FR-CRM-021 | Point earn rates, point-to-MNT conversion, expiry, limits, and eligible redemptions must be configurable, effective-dated, and financially approved. |
| FR-CRM-022 | CRM must receive verified transaction amount, customer identifier, branch, source reference, time, and correction/refund events from POS. |
| FR-CRM-023 | Membership status must be reviewed on the member's individual 12-month anniversary rather than by calendar year. |
| FR-CRM-024 | A member below the retention threshold must receive a 30-day grace period before a downgrade is applied. |
| FR-CRM-025 | A scheduled downgrade may reduce status by no more than one level per completed review, unless a separately approved fraud or abuse rule applies. |
| FR-CRM-026 | CRM should show and may notify the member of the eligible-spend shortfall needed to retain or unlock the next status. |
| FR-CRM-027 | CRM must track annual transport quotas, monthly entry quotas, reservation priority, notice requirements, holds, no-shows, and other configured privileges. |
| FR-CRM-028 | Monthly complimentary-entry allowances must reset without carrying unused allowances into the next month. |
| FR-CRM-029 | Manual launch assignments must record proposer, reason, proposed status, approver, decision, source, and effective date. |
| FR-CRM-030 | Manual launch assignments across the four branches require CEO approval before activation. |
| FR-CRM-031 | The initial automatic classification should use available verified historical spend from April 2026 onward, with incomplete-history limitations disclosed. |
| FR-CRM-032 | Assignment source must be auditable, including Automatic, Manager Recommended, and CEO Approved. |
| FR-CRM-033 | After launch migration, all members must move to the same approved automatic evaluation rules. |
| FR-CRM-034 | Staff must have a role-appropriate view of current status, point balance, available privileges, quota usage, and authorized redemption actions. |

## Status lifecycle

1. At launch, assign an initial status from verified historical spend or an approved manager nomination.
2. Store one status for the member, not a separate visible rank per branch.
3. Accumulate eligible spend during the member's individual 12-month qualification period.
4. Review status on the member's anniversary using the effective policy and reconciled source transactions.
5. If the retention threshold is met, retain the current status. If a higher threshold is met, apply the approved upgrade timing.
6. If the retention threshold is missed, start a 30-day grace period and show the remaining spend needed.
7. At grace expiry, retain the status if the shortfall was recovered; otherwise reduce by at most one level and record a complete explanation.
8. Preserve status history, policy version, source transactions, previous and new values, actor or job, dates, and any manual approval.

The exact rule for upgrades before the anniversary remains an open decision. It must not be hidden in implementation.

## Point and redemption model

The preferred model is point/credit, not permanent discount:

1. The customer pays the normal transaction price.
2. POS records the verified transaction and sends it to CRM.
3. CRM adds qualifying spend and calculates points using the member's effective rate.
4. The member chooses when to redeem available points as approved credit.
5. Staff confirm the balance and eligibility in CRM; the redemption is recorded once and reconciled with POS.

Working earn-rate examples are Bronze 1%, Silver 2%, Gold 3%, Diamond 4%, and Black Diamond 5%. These values are not approved constants. Finance must validate margin, redemption cost, breakage, visit frequency, point-to-MNT conversion, expiry, refund handling, and fraud controls before activation.

Legacy references to cashback in this knowledge base mean the same controlled point/credit ledger unless a later approved decision explicitly creates a separate product.

## Working privilege framework

| Status | Annual luxury transport | Complimentary entry per month | Reservation treatment | Example point earn |
| --- | ---: | ---: | --- | ---: |
| Bronze | 1 | To be decided | Longest notice window | 1% |
| Silver | 3 | 1 | More flexible than Bronze | 2% |
| Gold | 12 | 2 | Shorter notice and higher priority | 3% |
| Diamond | 24 | 3 | Priority and short notice | 4% |
| Black Diamond | 36 | 4 | Highest priority; proposed minimum notice about 2 hours | 5% |

All numbers in this table are working proposals. The final policy must define eligible users and guests, branch applicability, booking and cancellation rules, a proposed 30-minute confirmed-room hold/no-show rule, abuse controls, quota reset dates, and reversal handling.

Use positive unlock language in customer experiences: explain what the current status enables and what the next status unlocks. Do not tell a member that the member has been demoted merely because of visiting a premium branch.

## Branch-specific privilege rules

A branch may protect premium economics by raising the eligibility status for a specific privilege. For example, a Gold member remains Gold at Nomad, while a selected Nomad-only premium privilege may require Diamond or Black Diamond.

Branch rules must be:

- explicit and customer-readable;
- versioned and effective-dated;
- approved by the authorized business owner;
- evaluated separately from the company-wide status name;
- included in staff and customer views without implying a branch-specific downgrade.

## Customer intelligence

Managers need permission-controlled, searchable, and filterable views showing:

- current and historical membership status;
- visit frequency and visitation patterns;
- eligible, average, minimum, and maximum spend;
- branch mix and date-range trends;
- point earn, redemption, expiry, and adjustment history;
- privilege availability and usage;
- reservation and entertainer-affinity insight;
- remaining spend to retain the current status or reach the next status;
- member-level and aggregate statistical insights.

## Segmentation and campaigns

- Managers can define customer segments using approved profile and behavioral data.
- Campaign messages may include supported text and media.
- A message is sent only through a channel for which the member has valid consent.
- Supported channel availability remains subject to provider confirmation.
- Communication history must include campaign, content reference, channel, send time, delivery state when available, and consent or opt-out changes.

## Decisions still required

- The exact eligible-spend definition, including refunds, cancellations, discounts, complimentary items, taxes, corrections, and excluded products.
- The five 12-month spend thresholds and whether branch inputs use absolute MNT, normalized value, or another approved method to produce one company-wide status.
- Upgrade timing before the anniversary and any minimum-history rule.
- Final point earn rates, point-to-MNT conversion, expiry, balance limits, redemption eligibility, and fraud controls.
- Final privilege quantities and terms, including Bronze entry, guest rules, transport terms, reservation notice by status, hold/no-show rules, and Nomad-specific eligibility.
- Who may edit each policy, required approval, and separation of duties.
- Customer notification channels and consent wording.
- Privacy and role visibility for individual intelligence and entertainer affinity.

Open values must remain configuration or explicit decisions, never hidden constants.
