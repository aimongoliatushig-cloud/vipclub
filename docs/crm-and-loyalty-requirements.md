# CRM and Loyalty Requirements

This working draft captures the Phase 3 direction from project discussions.

## Goals

- Build a customer relationship management capability.
- Develop customer intelligence from reservation behavior, including entertainer preferences.
- Measure customer loyalty.
- Assign every member to one of five membership levels.
- Provide analytical insight rather than a primarily action-oriented CRM workflow.

## Membership configuration

- Each branch has its own membership benchmarks.
- System administrators and branch managers can update the numerical thresholds used to qualify for a membership level.
- Changes to thresholds should be recorded with the editor, effective date, previous value, and new value.

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
| FR-CRM-004 | Each member must belong to one of five membership levels. |
| FR-CRM-005 | Membership level must be calculated from a spend-based metric. |
| FR-CRM-006 | Administrators and branch managers must be able to configure branch-specific membership thresholds. |
| FR-CRM-007 | Managers must be able to filter members by membership level. |
| FR-CRM-008 | The system must show member visitation and expenditure statistics. |
| FR-CRM-009 | The system must provide entertainer-preference insights from reservation history. |

## Membership-level calculation — decision needed

The intended metric appears to be average customer spend over an evaluation period, but the period and formula are not yet confirmed.

### Candidate approaches

1. **Rolling 12-month average:** total eligible spend in the last 12 months divided by 12.
2. **Active-month average:** total eligible spend divided by the number of months in which the member was active.
3. **Lifetime average:** total eligible spend divided by all months since membership began.
4. **Lifetime spend:** total eligible spend without an average.

## Open questions with material business impact

- Which candidate formula is authoritative?
- What counts as eligible spend: bookings only, all purchases, net revenue, or another measure?
- Are cancelled, refunded, complimentary, or discounted reservations included?
- What defines an active month?
- What are the five membership-level names and threshold values?
- How often are levels recalculated, and when does a new level take effect?
- If a member uses more than one branch, which branch's benchmark determines the level?
- Can a manager edit only that manager's branch configuration?
- Which roles can view individual member intelligence and entertainer-preference data?
- What date range and branch filters must the analytics support?


## Customer segmentation and campaigns

- Managers can define customer segments using available customer attributes and behavior.
- Managers can add eligible members to a segment and create a campaign for that segment.
- Messages may include text, images, and other supported media.
- A message is sent only when the member has consented to promotional or event messaging through the selected channel.
- Supported preferred channels currently include Viber, Telegram, and email.
- Each member has a communication history showing campaigns, messages, channels, send times, delivery status when available, and consent or opt-out changes.

## Benefits and cashback

- Each of the five membership levels can have different benefits and privileges.
- Managers can create, update, and retire benefits and associate them with membership levels.
- The system must record each privilege use, including free visits or other eligible consumption.
- Each member can hold cashback value or points with a monetary value.
- The system must record every cashback credit and redemption as a ledger entry.
- Customers can be notified of cashback through their consented preferred channels.
- Cashback may be redeemed for eligible items such as drinks or other approved consumption.

## Additional confirmed requirements

| ID | Requirement |
| --- | --- |
| FR-CRM-010 | Managers must be able to create and manage customer segments. |
| FR-CRM-011 | The system must support consent-aware multimedia campaign messaging. |
| FR-CRM-012 | The system must retain a per-member communication history. |
| FR-CRM-013 | Managers must be able to manage benefits by membership level. |
| FR-CRM-014 | The system must record benefit usage. |
| FR-CRM-015 | The system must maintain an auditable cashback credit and redemption ledger. |
| FR-CRM-016 | The system must notify customers about cashback through their consented preferred channels. |

