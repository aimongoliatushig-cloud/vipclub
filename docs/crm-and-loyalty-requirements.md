# CRM and Loyalty Requirements

This working draft captures the Phase 3 direction from project discussions.

## Goals

- Build a customer relationship management capability.
- Develop customer intelligence from reservation behavior, including entertainer preferences.
- Measure customer loyalty.
- Assign every member to one of five membership levels.

## Confirmed requirements

| ID | Requirement |
| --- | --- |
| FR-CRM-001 | The system must maintain customer relationship information. |
| FR-CRM-002 | The system must associate customer reservations with entertainers. |
| FR-CRM-003 | The system must support customer-loyalty measurement. |
| FR-CRM-004 | Each member must belong to one of five membership levels. |
| FR-CRM-005 | Membership level must be calculated from a spend-based metric. |

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
- Can staff override a level, and is an approval or audit trail required?
- What reservations and entertainer information may be visible to which roles?
- Which metrics define loyalty beyond spend?
