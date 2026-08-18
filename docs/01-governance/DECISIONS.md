---
type: scaffold
status: draft
last_reviewed: 2026-08-18
---

# Decision Register

## Purpose

Record approved decisions, rationale, effective dates, and affected work.

## Confirmed entertainer-ranking decisions

| Decision | Confirmed treatment | Implementation note |
| --- | --- | --- |
| Daily rank score bands | Daily weighted score is 0-100. Level 1 `[90,100]`, Level 2 `[80,90)`, Level 3 `[70,80)`, Rookie/unranked `[0,70)`. | Classify the unrounded score; reject values outside 0-100. |
| Monthly sales benchmark scope | Every branch has an independent 12-month Level 1/2/3 benchmark table, configured only by an authorized manager for that branch. | Key and audit by branch/year/version; no shared company table or cross-branch fallback. |
| Eight-factor reallocation | Customer complaints is 15%, entertaining/pole-dancing skill is 5%, and entertainer attitude is 10%; other weights remain 10/40/5/10/5. | Total remains 100%. |
| Attitude incident behavior | Attitude defaults to 100 each scoring day. Only a substantiated branch-manager-reviewed incident causes a discretionary deduction, effective only that incident day; an unsubstantiated allegation remains 100 and the next day resets to 100. | Exact deduction rubric, appeal authority, and complaint-factor overlap remain open. |
| Shift-effort formula | Exactly seven boolean items per entertainer/branch/shift/day; component is `completed/7 × 100` and contribution is `component × 10 / 100`. | Store unrounded values; no extra-performances credit above seven/100. |
| Missed-performance money | Every miss also deducts `missed_count × effective branch amount_per_miss`, configured only by the branch manager, and posts as an itemized entertainer three-day settlement line. | Store effective setting/version and source checklist; later versions are non-retroactive. Approval/reversal/legal limits remain open. |
| Attendance money and precedence | Each branch manager configures that branch's shift ready time, per-minute lateness amount, and fixed no-show amount. Late arrival deducts `lateness_minutes × effective amount_per_minute`; a no-show deducts only the effective fixed amount. | No-show suppresses lateness for the same shift: calculate no lateness minutes and create no lateness charge. Settings and stored deductions are effective-dated, versioned, audited, and non-retroactive. |
| Internal complaint/compliment routing | Every employee may submit either type. Complaint content is visible only to CEO/relevant authorized managers and never to the named subject; compliments also deliver to the praised employee. | Internal complaints have no automatic score effect and may become attitude evidence only through a separate branch-manager substantiation decision. |
| Customer complaint/praise routing | An identified customer submits through the helper portal with required VIP room and visit/reservation/session context. Complaints are management-only; praise also delivers to the selected entertainer under field-level masking. | Anonymous submission is excluded. Customer complaint submission has no score effect until approved verification/review and normalization; praise has no automatic ranking effect. |

## Related documents

- [Knowledge-base gap analysis](../../knowledge-base-gap-analysis.md)
- [Stakeholder clarification register](../../stakeholder-clarification-register.md)
