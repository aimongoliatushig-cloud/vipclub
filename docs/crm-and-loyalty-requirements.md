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
