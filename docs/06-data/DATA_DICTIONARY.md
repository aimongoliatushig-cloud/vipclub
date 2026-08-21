---
type: scaffold
status: draft
last_reviewed: 2026-08-18
---

# Data Dictionary

## Purpose

Define fields, types, ownership, validation, retention, masking, and data quality.

## Current state

The complete dictionary remains pending repository and source-system discovery. The ranking fields below are the minimum contract for the specified entertainer weight model.

## Entertainer ranking fields

| Record | Field | Type / constraint | Meaning |
| --- | --- | --- | --- |
| Ranking Policy Version | `policy_version_id` | Immutable identifier | Effective-dated policy used for normalization, weighting, thresholds, gates, and rounding. |
| Ranking Policy Version | `component_weights` | Exactly eight unique component IDs; integer percentages totaling 100 | `attendance=10`, `customer_complaints=15`, `sales=40`, `entertaining_skill=5`, `cleanliness_beauty=5`, `shift_effort=10`, `personal_development=5`, `entertainer_attitude=10`. |
| Ranking Policy Version | `daily_score_range` | Inclusive decimal range 0 through 100 | Valid range for the unrounded daily weighted score; out-of-range values receive no rank. |
| Ranking Policy Version | `rank_thresholds` | Four continuous configured intervals | Level 1 `[90,100]`; Level 2 `[80,90)`; Level 3 `[70,80)`; Rookie/unranked `[0,70)`. |
| Ranking Component Result | `component_id` | Canonical component ID | One of the eight IDs in the effective policy. |
| Ranking Component Result | `source_references` | Non-destructive reference list | Verified evidence used for the component, including training/development evidence for `personal_development` and daily assessment evidence for `entertainer_attitude`. |
| Ranking Component Result | `raw_values` | Versioned structured values | Inputs to the policy's approved normalization rule. Attendance raw values include attendance, no-shows, and lateness. |
| Ranking Component Result | `normalized_score` | Decimal on the policy-defined common scale | Component score before weighting. |
| Ranking Component Result | `weight_percent` | Integer copied from policy version | Percentage used in this evaluation; retained for historical reproducibility. |
| Ranking Component Result | `weighted_contribution` | Unrounded decimal | `normalized_score × weight_percent / 100`. |
| Ranking Component Result | `data_quality_state` | Controlled value | Complete, missing, stale, corrected, or disputed; treatment comes from the policy version. |
| Ranking Snapshot | `component_results` | Exactly eight component results | Auditable factor breakdown in canonical order. |
| Ranking Snapshot | `total_score_unrounded` | Decimal from 0 through 100 | Sum of all eight unrounded weighted contributions and input to rank classification. |
| Ranking Snapshot | `total_score_display` | Decimal/string under versioned rounding rule | User-facing total; must be reproducible from the unrounded total and policy version. |
| Ranking Snapshot | `rank_classification` | `level_1`, `level_2`, `level_3`, or `rookie` | Classification from the unrounded daily score using the recorded policy thresholds. |
| Ranking Snapshot | `sales_benchmark_reference` | Immutable branch/year/month/version reference | Exact branch-specific monthly benchmark used for the 40% POS sales component; no company fallback. |
| Ranking Snapshot | `explanation` | Required text/structured explanation | Factor contributions, missing evidence, gates, threshold result, and rank decision. |
| Ranking Snapshot | `supersedes_snapshot_id` | Optional immutable reference | Links a correction or approved recalculation without changing historical evidence. |
| Branch Sales Benchmark Table | `configuration_key` | Unique `(branch_id, calendar_year, version)` | Identifies an independent 12-month table for one branch. |
| Branch Sales Benchmark Table | `branch_id` | Required branch reference | Scope used for authorization and benchmark lookup; never omitted or replaced by a company-wide table. |
| Branch Sales Benchmark Table | `currency` | Required ISO-style currency code | Currency shared by the table's configurable amounts. |
| Branch Sales Benchmark Table | `calendar_year`, `effective_from`, `effective_to` | Required year/date values | Calendar coverage and effective period. |
| Branch Sales Benchmark Table | `version`, `publication_state` | Required version/control values | Supports draft, review, publication, supersession, and reproducibility. |
| Branch Sales Benchmark Table | `configured_by`, `configured_at` | Required actor/timestamp | Authorized branch manager who created or changed the table. Actor's authorized branch must equal `branch_id`. |
| Branch Sales Benchmark Table | `audit_history` | Required append-only history | Actor, timestamp, version, action, and before/after values for every change or copied draft. |
| Monthly Sales Benchmark | `month` | Unique integer 1 through 12 within table | All 12 calendar months are required exactly once. |
| Monthly Sales Benchmark | `level_1`, `level_2`, `level_3` | Required non-negative currency min/max pairs | Each minimum is at most its maximum; endpoints are monotonically ordered Level 1 >= Level 2 >= Level 3. |
| Monthly Sales Benchmark | `rookie` | Required explicit handling | Either an approved no-benchmark rule or a valid separately configured min/max range. |
| Ranking Component Result | `attitude_score` | Decimal 0 through 100; default 100 | Daily attitude result: 100 absent a substantiated incident; incident-day result after any branch-manager deduction. |
| Attitude Incident Review | `incident_references`, `evidence_references` | Required non-destructive references | Specific allegation and investigated evidence; routine attitude entry without an incident is not allowed. |
| Attitude Incident Review | `entertainer_id`, `branch_id` | Required scoped references | Entertainer and branch affected by the incident. |
| Attitude Incident Review | `scoring_date`, `effective_date` | Required dates equal to incident-day scope | Deduction applies only to this day and never carries forward. |
| Attitude Incident Review | `manager_user_id`, `manager_role` | Required; role must be branch manager | Authorized manager who investigates, finalizes the finding, and records any deduction. |
| Attitude Incident Review | `finding` | `substantiated` or `unsubstantiated` | Unsubstantiated findings cannot reduce attitude. |
| Attitude Incident Review | `deduction`, `resulting_score` | Non-negative deduction; result 0 through 100 | Unsubstantiated requires deduction 0/result 100; substantiated result is 100 minus the discretionary incident-day deduction. |
| Attitude Incident Review | `reason`, `timestamp`, `correction_appeal_history` | Required audit values | Explanation, decision time, and append-only correction/appeal chain. |
| Shift Effort Checklist | `record_key` | Unique `(entertainer_id, branch_id, shift_id, scoring_date)` | One canonical current daily/shift record; corrections preserve history. |
| Shift Effort Checklist | `items` | Exactly seven unique items with boolean `completed` | The seven configured public-performance requirements and optional item evidence/notes. |
| Shift Effort Checklist | `completed_count`, `missed_count` | Integers 0 through 7; sum exactly 7 | Must match true/false item counts. |
| Shift Effort Checklist | `component_score_unrounded` | Decimal 0 through 100 | `completed_count / 7 × 100`. |
| Shift Effort Checklist | `weighted_contribution_unrounded` | Decimal 0 through 10 | `component_score_unrounded × 10 / 100`. |
| Shift Effort Checklist | submitter/audit fields | Required submitter, role, authorized branch, timestamp, evidence/notes, correction history | Branch manager or lead entertainer may submit only within the authorized branch. |
| Missed-Performance Penalty Setting | `branch_id`, `currency`, `amount_per_miss` | Required branch/currency and non-negative decimal | Independent per-branch financial amount; branch manager may edit only the authorized branch. |
| Missed-Performance Penalty Setting | `effective_from`, `version`, `status` | Required effective/version controls | Selects the setting for a checklist scoring date/time and prevents retroactive mutation. |
| Missed-Performance Penalty Setting | actor/audit fields | Required actor, role, timestamp, reason, history | Branch-manager-only configuration with append-only changes. |
| Shift Effort Checklist | monetary penalty fields | Required setting reference/version, per-miss amount, currency, `missed_count × amount`, evidence, correction/reversal links, payout-line references | Stored financial result remains separate from component score, posts to the three-day settlement, and is not changed by later setting versions. |
| Payout Line Item | missed-performance deduction fields | Missed count, per-miss amount, total deduction, currency, source checklist/shift, branch setting/version, net-pay impact | Itemized paystub-equivalent line on the entertainer's three-day settlement; corrections/reversals use linked lines. |
| Attendance Penalty Setting | branch/shift fields | Required `branch_id`, `shift_configuration_id`, `required_ready_time` | Branch/shift scope and arrival threshold. |
| Attendance Penalty Setting | money fields | Currency, non-negative `amount_per_minute_late`, non-negative `fixed_no_show_amount` | Independent effective branch rates for lateness and no-show. |
| Attendance Penalty Setting | effective/audit fields | Effective-from, version/status, manager/authorized branch, timestamp, reason, history | Non-retroactive, branch-manager-controlled setting. |
| Attendance Penalty Calculation | source/time fields | Scheduled shift, branch, ready time, actual arrival/check-in, lateness minutes, no-show status, evidence | Reproducible classification and raw inputs to the 10% attendance factor. |
| Attendance Penalty Calculation | financial fields | Setting/version, rate or fixed amount, currency, deduction, payout-line and correction/reversal links | No-show and lateness are mutually exclusive; money remains separate from ranking. |

## Internal team message fields

| Record | Field | Type / constraint | Meaning |
| --- | --- | --- | --- |
| Internal Team Message | `message_id`, `source_type`, `message_type` | Immutable ID; source is `internal_team`; type is `complaint` or `compliment` | Identifies the audited workflow record, keeps it distinct from customer-portal messages, and controls routing behavior. |
| Internal Team Message | `sender_employee_id`, `subject_employee_id` | Required employee references | Creator and selected complained-about/praised person. |
| Internal Team Message | `branch_id` | Required server-derived branch reference | Relevant subject/team branch used for manager routing and authorization; not trusted from a client-supplied scope. |
| Internal Team Message | `text`, `created_at` | Required non-empty text and timestamp | Complaint explanation/why or compliment message and original submission time. |
| Internal Team Message | `delivery_states`, `read_states` | Audience-recipient scoped state arrays | Complaint audiences contain only CEO and authorized relevant branch managers; compliment audiences also contain the praised employee. |
| Internal Team Message | `moderation_review_status` | Controlled value | Management review lifecycle; hidden from complaint subject and excluded from sender confirmation unless later approved. |
| Internal Team Message | `sender_confirmation_state` | Submitted or failed | Minimal submission acknowledgement that exposes no management-only review data. |
| Internal Team Message | `subject_can_view`, `subject_can_respond` | Complaint: both false; compliment view: true | Complaint subject receives no delivery, view, preview, search result, notification, or response route. |
| Internal Team Message | `attachments` | Empty unless a later policy enables references | Attachment permission/type/size is not yet confirmed. |
| Internal Team Message | `audit_history` | Required append-only events/corrections | Actor, action, time, and linked correction history; source text is never silently overwritten. |
| Internal Team Message | `attitude_incident_review_reference` | Optional immutable reference | Set only when an authorized manager deliberately links the message into a separate attitude investigation. The message alone has no ranking effect. |

## Customer entertainer message fields

| Record | Field | Type / constraint | Meaning |
| --- | --- | --- | --- |
| Customer Entertainer Message | `message_id`, `source_type` | Immutable ID; source is `customer_portal` | Keeps customer-origin records distinguishable in the shared management center. |
| Customer Entertainer Message | `customer_id` | Required authenticated customer reference; not anonymous | Customer who submitted through the helper portal; PII is field-masked by audience. |
| Customer Entertainer Message | `vip_room_id` | Required room reference | VIP room from/about which the experience message was submitted. |
| Customer Entertainer Message | `visit_id`, `reservation_id`, `session_id` | At least one applicable validated reference is required | Links the message to a real experience context; all available references are retained. |
| Customer Entertainer Message | `selected_entertainer_id`, `branch_id` | Required entertainer and server-validated branch | Subject/recipient and routing scope derived from the room/experience context. |
| Customer Entertainer Message | `message_type`, `text` | `complaint` or `praise`; non-empty text | Experience complaint or positive praise/encouragement. |
| Customer Entertainer Message | `source_portal`, `created_at` | `customer_helper_portal`; immutable timestamp | Origin and submission time. |
| Customer Entertainer Message | `delivery_states`, `read_states`, `review_status` | Audience-scoped controlled states | Complaint audiences exclude the entertainer; praise audiences include the selected entertainer and management. |
| Customer Entertainer Message | customer/room visibility policy | Role/branch and field-level mask | CEO/relevant managers have authorized oversight. Praised entertainer sees only fields permitted by the approved policy; complaint entertainer sees nothing. |
| Customer Entertainer Message | `audit_history` | Required append-only events/corrections | Preserves creation, authorized delivery/read/review/linking, and corrections without silent overwrite. |
| Customer Entertainer Message | `customer_complaint_evidence_review_reference` | Optional immutable reference | A complaint affects the 15% factor only through a separately approved verification/review and normalization process; submission has no score impact. |

## Related documents

- [Knowledge-base gap analysis](../../knowledge-base-gap-analysis.md)
- [Stakeholder clarification register](../../stakeholder-clarification-register.md)
