---
type: scaffold
status: draft
last_reviewed: 2026-08-18
---

# Internal PWA

## Purpose

Define role-aware internal PWA user journeys, workspaces, navigation, and notification behavior.

## Current state

The wider PWA journeys remain pending repository audit. The entertainer-ranking experience must implement the behavior below when the feature is built.

## Complaint and compliment message center

Every employee/team member, including an entertainer, can open a type selector for **Complaint** or **Compliment**, select a team member, enter required text, and submit.

- The Complaint form labels the text as what happened and why the complaint is being made. Submission shows the sender only a confirmation; it creates no notification, inbox item, preview, badge, view, or response action for the named subject.
- Complaint content and management review state appear only in a central CEO/company-wide queue and in the relevant subject-branch queue for currently authorized managers. Branch managers cannot browse another branch through filters, links, search, reports, or exports.
- The Compliment form labels the text as positive feedback. Submission delivers an inbox/notification item to the praised employee and also appears in the authorized manager/CEO message center.
- Each authorized view shows sender, selected subject/recipient, type, branch, text, created time, delivery/read states, moderation status, and permitted audit history. Attachment controls remain hidden until a later policy enables them.
- Linking a complaint to an attitude investigation is a deliberate manager action that opens the separate incident-review flow. The message center must state that submission alone changes no ranking score and does not enter the 15% customer-complaint component.
- The same management center also shows customer-portal complaints and praise with an explicit `Customer portal` source badge, identified-customer/VIP-room/experience context subject to authorization/masking, and the selected entertainer. Customer complaints remain management-only; customer praise is also delivered to the selected entertainer's internal inbox with only policy-permitted customer/room fields.
- Filters, counts, notifications, and reports must keep `Internal team` and `Customer portal` sources distinguishable. Customer complaints use a separate verification/evidence path for the 15% customer-complaints component and have no score effect on submission.

Complaint subject non-visibility is confirmed. Sender anonymity/confidentiality, retention, appeals/escalation, compliment responses, and attachment rules remain open.

## Entertainer ranking experience

The entertainer view shows daily threshold classification, effective rank, unrounded/displayed 0-100 score, matched threshold interval, evaluation window, calculation status, effective policy version, and next review date. Its score breakdown contains exactly eight rows:

1. Attendance — 10%, including attendance, no-shows, and lateness.
2. Customer complaints — 15%.
3. Sales — 40%.
4. Entertaining / pole-dancing skill — 5%.
5. Cleanliness and beauty — 5%.
6. Shift effort — 10%.
7. Personal development — 5%.
8. Entertainer attitude — 10%.

Each row shows normalized score, weight, weighted contribution, evidence/data-quality state, and an explanation or permitted evidence link. Missing or disputed data must be visible; the interface must not show a misleading complete score. The factor contributions must sum to the displayed unrounded total before the policy's display rounding is applied.

Authorized manager and audit views add evidence drill-down, threshold/gate results, previous and proposed rank, and correction/appeal/override history. A total-only ranking card is not acceptable.

Attitude displays 100 by default with no routine input. When an attitude/behavior incident is alleged, an authorized branch manager receives an investigation view with incident/evidence references, entertainer/branch/day, finding, discretionary deduction, resulting score, reason, and correction/appeal history. Unsubstantiated findings visibly retain 100; substantiated deductions are labeled incident-day-only, and the following day displays 100 absent a separate substantiated incident. Lead entertainers may not finalize this view.

An internal employee complaint can appear in this view only as an authorized evidence reference deliberately linked by the branch manager. It is not a customer complaint, it does not automatically open or finalize an incident, and it never changes attitude or any other score on submission.

## Daily shift-effort checklist

An authorized branch manager or lead entertainer sees exactly seven configured public-performance checkboxes for an entertainer's branch, shift, and scoring day. The form shows live completed/missed counts and the unrounded formula results, requires evidence/notes where configured, and submits actor/role/time plus audit history. A 5-completed/2-missed record displays the unrounded `71.428571...` component score and `7.142857...` weighted points. The UI does not add checkboxes or bonus credit for extra performances and routes corrections through the audited history flow.

The result screen separates **Ranking impact** from **Monetary penalty**. Ranking shows `completed/7 × 100` and its 10% contribution; money shows missed count, effective branch setting/version, per-miss currency amount, `missed × amount`, and any correction/reversal link. A later settings change does not rewrite an existing result. The entertainer's three-day settlement statement shows the same itemized deduction, source checklist/shift, setting version, and net settlement impact.

## Entertainer Ranking Settings — monthly sales grid

An authorized branch manager can enter, copy, validate, review, and publish the independent 12-month benchmark table for only the manager's authorized branch.

- Branch identity is fixed from the authorized context and remains visible with currency, calendar year/effective period, version, state, actor, and last-updated time.
- The grid has January through December rows and columns for Level 1 min/max, Level 2 min/max, Level 3 min/max, and explicit Rookie handling.
- Copying a prior table creates a same-branch draft; it never writes another branch or creates a company-wide table.
- Inline and summary validation blocks publication for missing/duplicate months, missing ranked-level ranges, missing Rookie handling, negative values, minimum above maximum, or Level 1/2/3 endpoint ordering errors.
- Review shows changed cells, source version, before/after values, and audit history before publication.
- Unauthorized and cross-branch edit controls are denied server-side and represented clearly in the UI; hiding a control is not sufficient authorization.
- The January Level 1 MNT 8,000,000-10,000,000 illustration must be labeled as an example, never prefilled as a universal default.
- A branch-manager-only section configures the authorized branch's non-negative per-miss penalty amount, currency, effective-from time, version/status, reason, and audit history. Cross-branch edits are denied.
- A branch-manager-only attendance section configures each authorized branch/shift ready time, per-minute lateness amount, fixed no-show amount, currency, effective time, version/status, reason, and history. Attendance review displays either lateness or no-show money—not both—and shows the separate attendance ranking evidence and itemized settlement link.

## Related documents

- [Knowledge-base gap analysis](../../knowledge-base-gap-analysis.md)
- [Stakeholder clarification register](../../stakeholder-clarification-register.md)
