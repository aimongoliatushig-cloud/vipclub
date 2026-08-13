# CRM and Loyalty Requirements

This working draft captures the Phase 3 direction from project discussions.

## Goals

- Build a customer relationship management capability.
- Develop customer intelligence from reservation behavior, including entertainer preferences.
- Measure customer loyalty.
- Assign every member to one of five membership levels.
- Provide analytical insight rather than a primarily action-oriented CRM workflow.

## Membership configuration

- Each branch has its own effective-dated membership ranges.
- A Branch Manager may propose a range change; the CEO owns final approval and override.
- Changes retain actor, reason, policy version, effective date, previous value, new value, and approval evidence.

## Customer intelligence

Managers need a searchable and filterable view of members, including:

- Current membership level.
- Visit frequency and visitation pattern, such as visits per month.
- Average, minimum, and maximum expenditure.
- Days or periods when the member visits.
- Entertainers the member reserves most often or shows loyalty toward.
- Member-level and aggregate statistical insights.

## Confirmed requirements

| ID | Requirement |
| --- | --- |
| FR-CRM-001 | The system must maintain customer relationship information. |
| FR-CRM-002 | The system must associate customer reservations with entertainers. |
| FR-CRM-003 | The system must support customer-loyalty measurement. |
| FR-CRM-004 | Each member must belong to Bronze, Silver, Gold, Diamond, or Black Diamond after an approved evaluation; a new record may remain provisional until eligible evidence exists. |
| FR-CRM-005 | Membership level must be calculated from average eligible expenditure per completed eligible visit against the active branch-specific range. |
| FR-CRM-006 | A Branch Manager may propose or support a branch range/change, while the CEO owns final approval and override; every version must be effective-dated and audited. |
| FR-CRM-007 | Managers must be able to filter members by membership level. |
| FR-CRM-008 | The system must show member visitation and expenditure statistics. |
| FR-CRM-009 | The system must provide entertainer-preference insights from reservation history. |

## Approved membership evaluation baseline

The 2026-08-11 reconciliation supersedes the rolling three-month proposal.

1. The five levels are **Bronze, Silver, Gold, Diamond, and Black Diamond**.
2. After every completed eligible visit, calculate:

```text
Average eligible expenditure per completed eligible visit
= total included eligible expenditure
÷ completed eligible visit count
```

3. Compare the result with the active, effective-dated range for the relevant branch.
4. Preserve included and excluded expenditure, completed eligible visits, active range, policy version, current level, and calculated level as separate evidence.
5. The Branch Manager supports the calculated change or records an explicit retain-current-level exception.
6. The CEO approves, returns, rejects, or overrides with a reason.
7. Corrections and supersession do not rewrite the original source evidence or prior decisions.

## Membership-policy decisions still needed

- Define exactly what counts as eligible expenditure and how refunds, cancellations, discounts, complimentary items, and corrections affect it.
- Publish the initial range values for each branch and their effective dates.
- Confirm multi-branch customer classification.
- Confirm benefits, transition timing, requalification, and exception expiry.

## Open questions with material business impact

- What counts as eligible spend: bookings only, all purchases, net revenue, or another measure?
- Are cancelled, refunded, complimentary, or discounted reservations included?
- What are the initial threshold/range values for each branch?
- When does an approved new level take effect after an eligible visit?
- If a member uses more than one branch, which branch's benchmark determines the level?
- Which roles may propose, review, and approve a branch range configuration?
- Which roles can view individual member intelligence and entertainer-preference data?
- What date range and branch filters must the analytics support?


## Customer segmentation and campaigns

- Managers can define customer segments using available customer attributes and behavior.
- Managers can add eligible members to a segment and create a campaign for that segment.
- Messages may include text, images, and other supported media.
- A message is sent only when the member has consented to promotional or event messaging through the selected channel.
- Supported preferred channels currently include Viber, Telegram, and email.
- Each member has a communication history showing campaigns, messages, channels, send times, delivery status when available, and consent or opt-out changes.

## Benefits, privileges, and points

- Each of the five membership levels can have different benefits and privileges.
- Managers can create, update, and retire benefits and associate them with membership levels.
- The system must record each privilege use, including free visits or other eligible consumption.
- Do not assume a standalone cashback balance.
- Any approved points, privilege, or monetary-value mechanism must use immutable, source-linked earn, use, expire, adjust, and reverse entries.
- Customers may be notified only about an approved benefit or ledger event through a consented preferred channel.

## Additional confirmed requirements

| ID | Requirement |
| --- | --- |
| FR-CRM-010 | Managers must be able to create and manage customer segments. |
| FR-CRM-011 | The system must support consent-aware multimedia campaign messaging. |
| FR-CRM-012 | The system must retain a per-member communication history. |
| FR-CRM-013 | Managers must be able to manage benefits by membership level. |
| FR-CRM-014 | The system must record benefit usage. |
| FR-CRM-015 | Any approved points, privilege, or monetary-value mechanism must use an auditable source-linked ledger; no standalone balance may be invented. |
| FR-CRM-016 | The system may notify customers about approved benefit or ledger events only through consented preferred channels. |

