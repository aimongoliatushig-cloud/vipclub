---
type: state-catalog
status: selected-baseline
last_reviewed: 2026-08-07
---

# State Catalog

## Purpose

Define allowable lifecycle states and guarded transitions for the new and existing workflows. State changes are server-enforced, permission-checked, timestamped, and auditable.

## Call handling

~~~text
Received / Imported
→ Matched Customer / New Customer Created
→ Classified
→ Reservation Created / Inquiry Completed / Block Review
→ Closed
~~~

Provider outcomes such as answered or missed are facts from CallPro when available. Call purpose is an ERP-side operator classification unless verified provider documentation states otherwise.

## Reservation, visit, and reconciliation

~~~text
Reservation:
Requested → Confirmed → Arrived → Active Session → Completed
Requested / Confirmed → Cancelled / No-show

Customer Session:
Checked In → Entered Service → Billed → Reconciled
Checked In → Drop-off Recorded → Reconciled
Checked In → Unresolved → Reconciliation Exception
Reconciliation Exception → Investigating → Resolved / Escalated
~~~

Reservation, check-in, service, drop-off, bill, and reconciliation are distinct states and timestamps.

## Entertainer availability

~~~text
Off Shift / Unavailable
→ On Shift, Not Customer-visible
→ Available, Customer-visible
→ Requested / Temporarily Held
→ Serving / Performing
→ Available or Unavailable
~~~

Operational availability and customer visibility are separate fields. Attendance alone cannot transition an entertainer to publicly requestable.

## Entertainer service request

~~~text
Requested
→ Confirmed
→ On the Way
→ Arrived
→ Completed

Requested / Confirmed
→ Unavailable / Declined / Cancelled / Missed / Escalated
~~~

Every transition records actor/source and time. The approximate two-minute target is measured, not an automatic penalty trigger.

## Customer feedback and incident review

~~~text
Feedback Submitted
→ Branch Review
→ Resolved / Referred

Complaint Referred
→ Incident Review
→ Not Substantiated / Verified Incident
→ Resolved / Appealed
~~~

Positive feedback may be accepted as performance evidence. Negative feedback does not automatically create an incident, penalty, or KPI deduction.

## Entertainer ranking

~~~text
Evidence Window Open
→ Evaluation Calculated
→ Promotion Ready / Not Ready / Review Required
→ Human Review
→ Approved / Rejected / Override Approved
→ Effective Rank
→ Appeal / Adjustment when authorized
~~~

New entertainers start at Gold. The system recommendation does not change rank until the authorized human decision is effective.

## Monthly target and manager plan

~~~text
Target Draft → Target Set
Plan Draft → Submitted → CEO Review
→ Revision Requested → Resubmitted
→ Approved / Rejected
Approved → Active → Month-End Review → Closed
~~~

## Reward and penalty review

~~~text
Calculated / Flagged
→ Manager or HR Review
→ Revision Requested / Approved / Rejected
→ Posted / Employment Review / Closed
→ Adjusted or Reversed when required
~~~

A dismissal flag never transitions automatically to termination.

## ERPNext/Frappe projects and tasks

~~~text
Draft → Assigned → Acknowledged → In Progress
→ Blocked / Submitted for Review
→ Revision Requested / Accepted → Completed
Completed → Reopened when authorized
~~~

Exact task states, acceptance, and reopening authority are **TBD — Business configuration required**.

## Internal feedback and anonymity

~~~text
Draft → Submitted → Delivered → Acknowledged / Responded → Closed
Submitted with recipient-anonymous flag
→ Sender hidden in ordinary recipient view
→ Identity Revealed only by authorized audited action
~~~

## Policy and financial history

Effective-dated policies move through Draft → Review → Approved → Active → Superseded. Finalized historical calculations continue to reference the version that was active for the event.

## Related documents

- [Business Process Catalog](../business-processes.md)
- [Functional Requirements](../functional-requirements.md)
- [Role Permission Matrix](../03-roles/ROLE_PERMISSION_MATRIX.md)
- [Data and Domain Model](../data-model.md)
