---
type: scaffold
status: draft
last_reviewed: 2026-08-18
---

# API Architecture

## Purpose

Define service boundaries, authentication, versioning, idempotency, and error contracts.

## Current state

Authentication, routes, and the wider API remain pending repository audit. Any entertainer-ranking read model or export must implement the contract below.

## Entertainer-ranking response contract

A ranking response must include the entertainer and branch scope, scoring day/evaluation window, calculation/effective times, policy version, previous/proposed/effective rank, daily threshold classification, gate result, and both unrounded and displayed totals. The unrounded score must be within 0-100; an out-of-range score is a validation failure and receives no classification.

`components` is required and must contain exactly these eight IDs in canonical order: `attendance`, `customer_complaints`, `sales`, `entertaining_skill`, `cleanliness_beauty`, `shift_effort`, `personal_development`, and `entertainer_attitude`. Every component returns:

- authorized source-record references and relevant raw values;
- normalized component score;
- weight percentage;
- unrounded weighted contribution;
- data-quality state; and
- human-readable explanation.

Attendance raw values include attendance, no-shows, and lateness inside its single 10% component. The API must not return these as separately weighted components. The total must equal the sum of all eight recorded contributions under the effective policy version. Rank classification must return `level_1` for `[90,100]`, `level_2` for `[80,90)`, `level_3` for `[70,80)`, or `rookie` for `[0,70)` using the unrounded total.

Attitude uses no routine score command. A daily read returns 100 when no substantiated incident exists for that scoring day. An incident review command is restricted to an authorized branch manager and requires incident/evidence references, entertainer, branch, scoring/effective date, manager/role, substantiated/unsubstantiated finding, deduction, resulting 0-100 score, reason, timestamp, and correction/appeal history. Unsubstantiated findings require deduction 0/result 100. A substantiated deduction affects only that scoring day; the next day returns to 100 absent a separate substantiated incident. Lead entertainers cannot finalize attitude incidents. The deduction rubric, appeal authority, and customer-complaints interaction remain open.

## Shift-effort checklist contract

A shift-effort command accepts exactly seven configured items with boolean `completed` values for one `(entertainer_id, branch_id, shift_id, scoring_date)` key. Only a branch manager or lead entertainer authorized for that branch may submit.

- `completed_count` equals true items, `missed_count` equals false items, and their sum is exactly 7.
- Component score is `completed_count / 7 × 100`; weighted contribution is `component score × 10 / 100`.
- Responses store and return unrounded component and contribution values, submitter/role/time, evidence/notes, policy/item-definition version, and correction history.
- A duplicate current record for the same key is rejected or handled through the audited correction command; extra performances do not add items or credit above 100.
- The response separately returns the effective per-miss setting/version, amount/currency, and `missed_count × amount` monetary penalty. It never folds currency into the component score.

Per-miss settings are branch-specific, effective-dated resources. Only a branch manager authorized for `branch_id` may create or publish a version. Requests retain currency, non-negative amount, effective-from time, version/status, actor/time, reason, and audit history. Checklist calculation resolves and stores the version effective at its scoring time; a later version never triggers retroactive recalculation.

The settlement calculation API creates an itemized negative payout line linked to the source checklist and setting version. Its read model exposes missed count, per-miss amount, total deduction, currency, source shift/checklist, branch setting/version, and net three-day settlement impact. Corrections/reversals use linked adjustment lines and never mutate historical source records. Processing timing and approval/reversal authority remain open.

## Attendance penalty settings and calculation contract

Branch/shift attendance settings expose required ready time, per-minute lateness amount, fixed no-show amount, currency, effective-from time, version/status, authorized manager/time/reason, and audit history. Mutation is branch-manager-only for the manager's branch.

For an on-time arrival, both deductions are zero. For a late arrival, the result returns ready/actual times, lateness minutes, effective rate/version, and `minutes × rate`. For a no-show, the confirmed precedence returns only the fixed no-show line: lateness minutes are not calculated and the lateness amount is zero/absent. The API rejects any result that charges both for one shift.

Both deduction types post as separate itemized three-day settlement lines linked to attendance evidence and the effective setting version. Later settings do not recalculate historical lines; corrections/reversals use linked adjustments. The ranking response separately retains attendance/no-show/lateness as inputs to the 10% component.

Server code is authoritative for normalization and weighting. Clients may format the response but must not recalculate it with locally stored weights. Detail and source-evidence fields remain subject to role, branch, ownership, and field-level authorization.

## Branch sales benchmark settings contract

Sales benchmark settings are keyed by `(branch_id, calendar_year, version)`. Every read, create, copy, validate, review, and publish request/response and audit event must include branch identity. There is no company-wide shared table or fallback.

- Only an authenticated branch manager authorized for `branch_id` may mutate that branch's table.
- A published configuration contains currency, year/effective period, version, actor/time, audit history, and exactly 12 unique month records.
- Every month contains Level 1, Level 2, and Level 3 min/max currency ranges plus explicit Rookie handling.
- Server validation enforces non-negative amounts, `minimum <= maximum`, and endpoint ordering `Level 1 >= Level 2 >= Level 3`.
- Copy creates a new draft for the same authorized branch and records its source version; it does not bypass validation or publication review.
- Two branch IDs may return different ranges for the same month and year. The ranking response records the exact branch/year/month/version benchmark selected for the sales component.
- Missing branch settings are a configuration/data-quality error; the API must not silently use another branch's table.

The API exposes validation failures as structured field/month/level errors. The exact daily-POS-sales normalization output remains governed by a future approved policy formula.

## Internal team message API contract

The create command is available to every authenticated active employee/team member, including entertainers. It accepts `message_type`, selected `subject_employee_id`, and required non-empty `text`; the server supplies the sender from authentication and resolves the subject's relevant `branch_id` for routing. It returns a minimal submission acknowledgement to the sender, not management review data.

- For `complaint`, reads, list/search membership, previews, notifications, delivery/read states, moderation data, reports, exports, and deep links are restricted to the CEO or a branch manager currently authorized for the relevant subject branch. The complaint subject receives no delivery and has no view or response route.
- For `compliment`, the praised employee receives the message and its delivery/read state; CEO and relevant authorized branch managers also have oversight. Compliment reply behavior is still open.
- CEO authorization is company-wide. Manager authorization is enforced server-side from current branch grants on every object and collection read; client-supplied branch filters never expand scope.
- Records retain sender, subject/recipient, type, branch, text, created time, delivery/read states, moderation status, attachments if later enabled, and immutable audit/correction history.
- Internal complaints are not customer complaints and no message creation/delivery endpoint writes a ranking component. A manager may create an explicit evidence reference from an authorized complaint to a separate attitude review; only the existing branch-manager substantiation command can record a deduction.

The complaint subject must receive the same non-disclosing response as any caller without access so identifiers, counts, notification badges, and timing do not leak complaint existence or content. An immutable audit event records creation, authorized reads, moderation changes, evidence linking, and corrections without exposing the audit payload to an unauthorized subject or sender.

## Customer portal entertainer message API contract

The separate customer helper portal create command requires an authenticated customer identity, `selected_entertainer_id`, `vip_room_id`, at least one server-validated `visit_id`, `reservation_id`, or `session_id`, `message_type` (`complaint` or `praise`), and non-empty text. Anonymous submission is rejected. The server validates that customer/room/experience/entertainer context and derives the routing branch; the client cannot choose a branch to expand visibility.

- A customer complaint is returned only to the CEO or a manager currently authorized for the derived relevant branch. The selected entertainer gets no delivery/read record, list/search result, preview, count, notification, deep link, content read, or response endpoint.
- Customer praise creates a delivery/read record for the selected entertainer and management oversight records for the CEO/relevant managers. The entertainer response is field-filtered so customer identity, VIP-room, and experience details expose only the fields allowed by the approved field-level policy.
- The shared management collection returns an explicit source discriminator: `customer_portal` or `internal_team`. It preserves the source-specific identity/context without conflating customer and employee complaints.
- Customer PII and room/experience data are authorized and masked on every object/list/search/export/audit response. Authorized management retains scoped oversight; complaint content and identity never flow to the named entertainer.
- Creating a complaint does not write the 15% customer-complaints component. An authorized review command must verify the complaint and record the approved normalization/evidence linkage before any ranking calculation can consume it. Praise writes no ranking component.

Records follow [`../customer-entertainer-messages.schema.json`](../customer-entertainer-messages.schema.json); immutable audit history captures submission, authorized delivery/read/review, evidence linkage, and corrections.

## Related documents

- [Knowledge-base gap analysis](../../knowledge-base-gap-analysis.md)
- [Stakeholder clarification register](../../stakeholder-clarification-register.md)
