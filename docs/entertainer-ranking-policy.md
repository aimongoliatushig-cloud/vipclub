# Entertainer Ranking Policy

## Status

**The eight-factor weight model, 0-100 daily weighted-score scale, and rank thresholds are specified. The wider ranking lifecycle still requires formal CEO or General Manager approval before production configuration or use.**

The machine-readable source for the weights and rank thresholds is [`entertainer-ranking-weights.json`](entertainer-ranking-weights.json). Production code must load an effective-dated `Ranking Policy Version`; it must not duplicate these percentages or thresholds as unrelated constants.

## Purpose

Use a fair, explainable daily 0-100 weighted score with three ranked levels plus a Rookie/unranked classification, while preserving the approved review controls for effective rank movement.

## Confirmed daily-score rank thresholds

| Rank ID | Display label | Daily weighted-score interval | Boundary rule |
| --- | --- | ---: | --- |
| `level_1` | Level 1 — highest performer | 90 through 100 | `score >= 90` and `score <= 100` |
| `level_2` | Level 2 | 80 through below 90 | `score >= 80` and `score < 90` |
| `level_3` | Level 3 | 70 through below 80 | `score >= 70` and `score < 80` |
| `rookie` | Rookie / unranked entertainer | 0 through below 70 | `score >= 0` and `score < 70` |

The boundaries are continuous and apply to the unrounded daily weighted score. For example, `69.99` is Rookie/unranked, `70` is Level 3, `80` is Level 2, and `90` is Level 1. A score below 0 or above 100 is invalid and must be flagged as a calculation or data-validation error rather than assigned a rank.

## Canonical weight model

| Component ID | Factor | Weight | Required evidence scope |
| --- | --- | ---: | --- |
| `attendance` | Attendance | 10% | Attendance, no-shows, and lateness. Existing approved normalization and penalty rules remain authoritative. |
| `customer_complaints` | Customer complaints | 15% | Verified customer complaints and their approved review, resolution/status, and normalization treatment. A customer-portal submission alone has no score effect. |
| `sales` | Sales | 40% | Verified entertainer-attributed sales under the approved sales definition. |
| `entertaining_skill` | Entertaining / pole-dancing skill | 5% | Latest approved 0-100 level from an evidence-backed skill audit. |
| `cleanliness_beauty` | Cleanliness and beauty | 5% | Daily 0-100 cleanliness and presentation assessment. |
| `shift_effort` | Shift effort | 10% | Submitted seven-checkbox daily shift checklist; component score is `completed / 7 × 100`. |
| `personal_development` | Personal development | 5% | Approved development evidence such as completed training, coaching goals, certifications, or acknowledged learning activities. |
| `entertainer_attitude` | Entertainer attitude | 10% | Defaults to 100 each day; only a branch-manager-substantiated incident may create a discretionary deduction for that incident/scoring day. |
|  | **Total** | **100%** |  |

No reservation, repeat-customer, loyalty, training, rating, or compliance signal may be added as a ninth weighted factor. A verified signal may contribute only through the approved normalization rule for one of the eight factors. Training and development evidence belongs to `personal_development`.

Customer complaints from the authenticated helper portal preserve customer, VIP room, branch, visit/reservation/session context, selected entertainer, text, source, time, and review/audit state. They are potential evidence only: the 15% component may consume a complaint after the approved verification/review and normalization rule makes it eligible. Praise has no automatic ranking effect. Internal employee complaints remain separate and never enter this customer-complaints component.

### Attitude incident rule

- Attitude starts at the full component score of 100 for every scoring day. No routine manual attitude entry is required when there is no relevant incident.
- A specific incident or complaint may allege an attitude or behavior problem, such as fighting, creating conflict, or disruptive drama.
- An internal employee complaint is not the 15% customer-complaints factor and does not reduce any score on submission. It may become one authorized evidence reference only when a branch manager deliberately links it into this separate investigation.
- A branch manager for the entertainer's branch audits/investigates the incident and records a finding of `substantiated` or `unsubstantiated`. Lead entertainers do not finalize attitude incidents or deductions unless a later decision explicitly grants that permission.
- An unsubstantiated allegation does not reduce attitude: deduction is 0 and the resulting score remains 100.
- For a substantiated incident, the branch manager records the discretionary deduction, resulting score from 0 through 100, evidence, and reason.
- A substantiated deduction applies only to the incident/scoring day and never carries forward. On the following day attitude defaults back to 100 unless a separate incident for that day is substantiated.
- The audit record includes incident/evidence references, entertainer, branch, scoring and effective date, manager and role, finding, deduction, resulting score, reason, timestamp, and correction/appeal history.

The exact deduction rubric/amount, appeal authority, and whether one incident may also affect the separate customer-complaints factor remain open policy decisions.

### Shift-effort checklist

- Each entertainer has exactly seven required public-performance items for each branch/shift/scoring day. The versioned policy supplies the item definitions; this repository does not invent their names.
- An authorized branch manager or lead entertainer for the branch records each item as a boolean completed/missed checkbox and submits the daily record.
- The record retains entertainer, branch, shift, scoring date, seven item states, completed/missed counts, submitter/user role, timestamp, evidence or notes where required, and correction history.
- The uniqueness key is `(entertainer_id, branch_id, shift_id, scoring_date)`. Corrections update one canonical current record while preserving audited history.
- `completed_count + missed_count` must equal 7, and the counts must match the seven boolean item states.

```text
shift_effort_component_score = completed_count / 7 × 100
shift_effort_weighted_contribution = shift_effort_component_score × 10 / 100
```

Therefore 7/7 produces a 100 component score and 10 weighted points; 5/7 produces an unrounded `71.428571...` component score and `7.142857...` weighted points; and 0/7 produces 0 for both. Store unrounded component and contribution values. Display rounding occurs only after all eight component contributions are summed. Extra performances beyond the required seven do not create extra weighted credit or raise the component score above 100.

### Monetary penalty for missed performances

Each missed checklist item also creates a financial deduction that remains visibly separate from the 10% shift-effort ranking calculation.

```text
monetary_penalty = missed_count × effective_branch_amount_per_miss
```

- An authorized branch manager configures a non-negative currency amount per miss for only that manager's branch in Entertainer Ranking Settings.
- Every setting retains branch, currency, amount per miss, effective-from date/time, version/status, actor, timestamp, reason, and audit history.
- The checklist resolves the setting effective for its branch and scoring date/time and stores the setting/version, per-miss amount, missed count, calculated monetary penalty, currency, evidence, and correction/reversal links.
- A later setting version never changes a previously calculated checklist penalty. Corrections or reversals use explicit linked records rather than retroactive recalculation.
- Shift-effort score and money are independent outputs: `completed / 7 × 100` feeds ranking, while `missed × amount` is the financial deduction.
- The financial deduction posts as an itemized line on the entertainer's three-day settlement/payout statement—the repository's canonical equivalent of the requested paycheck/paystub. That line shows missed count, per-miss amount, total deduction, currency, source shift/checklist, branch setting/version, and net settlement impact.
- The entertainer's settlement remains based on verified attributed POS sales and approved additions/deductions. Corrections or reversals create linked settlement line items and audit history without rewriting the checklist, setting version, or original settlement source.

Settlement processing timing, approval and reversal authority, and legal/policy limits remain open.

## Monthly branch sales benchmarks

Sales remains a 40% component sourced from verified entertainer-attributed POS data. Its benchmark configuration is independent for every branch; no company-wide shared or fallback table is assumed.

- The configuration key is `(branch_id, calendar_year, version)`. Branch identity is mandatory in settings, storage, API requests/responses, daily ranking evidence, and audit records.
- An authorized branch manager may create or edit only the 12-month table for that manager's authorized branch.
- Each table contains exactly one row for each calendar month, 1 through 12, because expected sales may differ by month.
- Each month contains configurable currency minimum and maximum values for Level 1, Level 2, and Level 3. Rookie/unranked handling is required explicitly and may use either a separately configured range or an approved no-benchmark rule.
- Values must be non-negative and each minimum must be less than or equal to its maximum.
- For every month, Level 1 minimum and maximum must not be lower than the corresponding Level 2 endpoints, and Level 2 endpoints must not be lower than Level 3 endpoints. Overlap is not prohibited unless a later approved rule says so.
- Currency, branch, calendar year/effective period, version, actor, timestamp, before/after values, and audit history are retained.
- A copied table becomes a new draft for the same authorized branch and must be reviewed and validated before publication. Copying must not create or edit another branch's table.

The user's January Level 1 amount of MNT 8,000,000 through MNT 10,000,000 is illustrative only; it is not a universal default or production value, and February or any other branch/month may differ. The illustrative fragment is stored in [`entertainer-ranking-sales-benchmarks.example.json`](entertainer-ranking-sales-benchmarks.example.json); the complete configuration contract is [`entertainer-ranking-sales-benchmarks.schema.json`](entertainer-ranking-sales-benchmarks.schema.json).

The daily verified POS sales amount must be normalized against the applicable branch, year, calendar month, and rank-level benchmark under the effective policy version. The precise normalization formula remains open and must not be inferred from the example ranges.

## Daily scoring and data entry

- The system produces and retains an explainable weighted performance score from 0 through 100 for each entertainer for each scoring day. The confirmed threshold table classifies that unrounded daily total; gates, any rolling window, and effective-rank approval remain separate policy controls.
- A branch manager and a lead entertainer may enter manually assessed component scores that their role is allowed to assess for entertainers in their authorized branch. Attitude incident findings and deductions are restricted to the branch manager.
- The sales component must come from verified entertainer-attributed point-of-sale data. It is not a free-form manual score.
- Cleanliness and beauty is entered every day as a 0-100 score by a branch manager or lead entertainer.
- Entertaining skill, including pole dancing or other approved entertaining skills, is a persistent 0-100 level. The daily calculation reuses the most recently approved level.
- Personal development is also a persistent 0-100 level. The daily calculation reuses the most recently approved level.
- Entertainer attitude contributes 100 by default each day, reduced only on that day by a branch-manager-recorded deduction for a substantiated incident; the next day resets to 100 absent another substantiated incident.
- Shift effort comes from the submitted seven-checkbox record for the entertainer's branch, shift, and scoring day; missing checklist items reduce the component under the confirmed proportional formula.
- A branch manager or lead entertainer may increase either persistent level only after auditing the entertainer. The new level is capped at 100, becomes the value used from that scoring day forward, and preserves the previous level in history.
- Each manual entry records the entertainer, branch, scoring date, component, score, evidence, evaluator, evaluator role, and timestamp. Calculated or imported values remain visibly distinguishable from manual assessments.

Open permission decisions remain for lead-entertainer self-scoring, conflict resolution when two authorized evaluators submit the same component and day, finalization authority, and reopening/correction authority.

## Score calculation contract

Each policy version must normalize the eight component scores to the same scale before weighting. The normalization rule must also define direction so the resulting component score has the intended performance meaning; for example, a raw complaint or no-show count must not be multiplied directly by a positive weight. Let `N(component)` be that component's normalized score and `W(component)` be its percentage from the canonical table.

```text
weighted_contribution(component) = N(component) × W(component) / 100

total_score =
    N(attendance)            × 10 / 100
  + N(customer_complaints)   × 15 / 100
  + N(sales)                 × 40 / 100
  + N(entertaining_skill)    ×  5 / 100
  + N(cleanliness_beauty)    ×  5 / 100
  + N(shift_effort)          × 10 / 100
  + N(personal_development)  ×  5 / 100
  + N(entertainer_attitude)  × 10 / 100
```

The daily weighted score must remain within the inclusive 0-100 scale. The total remains on the same scale as the normalized component scores because the eight weights total 100%. Rank classification uses the unrounded sum; display rounding occurs afterward under the effective policy version and must never move a score across a rank boundary.

### Attendance treatment

Attendance is one 10% factor. Its raw inputs include attendance, no-shows, and lateness; these signals must not be separately weighted again. Preserve an existing approved attendance normalization or penalty formula when one is available. This repository does not currently contain such a formula, so the policy version must define it before production evaluation.

### Attendance financial penalties

Attendance ranking inputs and financial deductions are separate outputs of the same scheduled-shift evidence.

- An authorized branch manager configures, for each applicable branch/shift setting, the required ready time, non-negative currency amount per minute late, and non-negative fixed no-show amount. Settings retain branch/shift identity, effective-from time, version/status, actor/time, reason, and audit history.
- When an entertainer arrives after the effective required ready time, `lateness_penalty = lateness_minutes × effective_branch_amount_per_minute_late`.
- When a scheduled shift is classified as no-show, `no_show_penalty = effective_branch_fixed_no_show_amount`.
- **Confirmed precedence:** no-show suppresses lateness for the same scheduled shift. Do not calculate lateness minutes and do not add a lateness charge when the fixed no-show penalty applies.
- Each result retains scheduled shift, branch, required ready time, actual arrival/check-in when present, lateness minutes, no-show state, setting/version, rate/fixed amount, currency, calculation, source evidence, and correction/reversal links.
- Effective settings are branch-scoped, authorized to that branch's manager, audited, and non-retroactive. Historical deductions retain the exact effective version and amount.
- Lateness and no-show deductions post as separate itemized lines on the entertainer's POS-based three-day settlement statement alongside any missed-performance deduction. Ranking still uses attendance/no-show/lateness raw inputs independently of money.

### Missing and disputed data

- A missing factor must never be silently treated as full performance, zero performance, or removed with the remaining weights rebalanced.
- The effective policy version must define the minimum evidence and missing-data treatment for every factor.
- Disputed source evidence must follow the correction or appeal workflow. Any recalculation creates a new auditable snapshot rather than silently changing a historical result.

## Explainability and audit output

Every ranking snapshot and API/report representation must expose:

- entertainer, branch, evaluation window, evaluation time, and effective policy version;
- all eight component IDs in canonical order;
- source-record references and relevant raw values for each component;
- normalized component score, weight percentage, and unrounded weighted contribution for each component;
- the unrounded daily weighted score, displayed/rounded score, matched rank ID/label and exact threshold interval, gate result, previous rank, proposed or effective rank, and human-readable explanation;
- missing, stale, corrected, or disputed-data state; and
- actor, override reason, appeal/correction link, and superseded snapshot when a manual action occurs.

The total must be reproducible from the recorded component scores, weights, and contributions.

## Proposed evaluation lifecycle

1. A new entertainer begins as Rookie/unranked unless an approved onboarding rule states otherwise.
2. The system collects verified evidence for exactly the eight weighted factors, including attendance/no-show/lateness inputs, personal-development evidence, and any attitude incident decision effective for the scoring day.
3. For each scoring day, the system normalizes each component, calculates the unrounded 0-100 daily weighted score, and assigns its confirmed threshold classification.
4. At the approved evaluation cadence, an entertainer is promoted when the relevant daily-score history, minimum evidence, and hard gates are met.
5. An entertainer is not demoted because of one weak period alone.
6. Repeated unresolved no-shows may trigger an approved hard gate or benefit suspension in addition to their treatment within the attendance component.
7. Demotion is allowed when the rolling score remains below the required threshold for the approved grace period, including sustained sales decline, or when an approved hard gate applies.
8. Every result records source events, policy version, component scores and contributions, total score, hard gates, previous/new rank, explanation, and effective date.
9. A manual review, appeal, adjustment, and audit process is available for disputed data or exceptional circumstances.

## API, UI, and reporting contract

- The API must return the eight component results, unrounded 0-100 daily weighted score, displayed score, and matched rank ID/label/threshold interval described under **Explainability and audit output**; a total-only response is insufficient. Scores outside 0-100 produce a validation error and no rank classification.
- The entertainer PWA must show the daily threshold classification, effective rank, total score, threshold interval, review window, next review date, and an eight-row breakdown with factor, normalized score, weight, contribution, and missing/disputed state.
- Manager and audit views must drill down from each contribution to authorized source evidence and must distinguish calculated, overridden, appealed, and superseded results.
- Ranking exports and dashboards must use the effective policy version and the same eight-factor breakdown; clients must not recalculate with local weights.
- The Entertainer Ranking Settings UI must let an authorized branch manager enter, copy, validate, review, and publish that manager's own branch-specific 12-month sales grid. It must show branch, currency, year/effective period, version, publication state, validation errors, and audit history, and prevent unauthorized or cross-branch edits.
- The daily shift UI must present exactly seven configured checkboxes, completed/missed counts, evidence/notes, submitter identity, and calculated unrounded component/contribution values. Only an authorized branch manager or lead entertainer for the branch may submit; extra performances do not add checkboxes or credit.
- Entertainer Ranking Settings must let a branch manager version the authorized branch's per-miss currency amount and effective date. The checklist shows score impact and monetary penalty in separate labeled sections with setting/version and correction/reversal links.
- Entertainer Ranking Settings must also let a branch manager version the authorized branch/shift required ready time, per-minute lateness amount, and fixed no-show amount. Attendance results and settlement lines show no-show and lateness as mutually exclusive deductions.

## Recommended controls

- Use a rolling evaluation window rather than lifetime average alone.
- Require a minimum amount of verified history before promotion to higher ranks.
- Apply benefits only after the rank decision is effective.
- Restrict manual override to authorized decision makers with a recorded reason.
- Notify the entertainer through the internal PWA with a clear explanation of progress, missing requirements, and next review date.

## Acceptance checks

1. The configured weights are exactly `10, 15, 40, 5, 5, 10, 5, 10` for the eight canonical components and total 100%.
2. With a unit normalized score for only one factor, its contribution equals that factor's weight divided by 100; this is checked for every factor.
3. A unit normalized score for all eight factors produces a unit total score.
4. `personal_development` is required in configuration, calculation output, API/UI/report breakdowns, and audit snapshots with a 5% weight.
5. Attendance, no-shows, and lateness are combined only within the 10% attendance factor.
6. The total equals the sum of all eight recorded unrounded contributions.
7. Rank boundaries classify `69.99` as Rookie/unranked; `70` and `79.99` as Level 3; `80` and `89.99` as Level 2; and `90` and `100` as Level 1.
8. Scores below 0 or above 100 are rejected or flagged and receive no rank classification.
9. Every published branch sales table contains all 12 unique months, all three ranked-level ranges, explicit Rookie handling, valid non-negative/ordered ranges, and complete branch/version/audit metadata.
10. Two branches may store different sales ranges for the same calendar month and year; selection always uses the entertainer's branch-specific table with no company-wide fallback.
11. `entertainer_attitude` is present at 10% and contributes `attitude score × 10 / 100`; it is 100 with no incident, remains 100 after an unsubstantiated allegation, and may be reduced from 100 only for the day of a substantiated branch-manager-reviewed incident.
12. An incident-day attitude deduction does not carry forward: the following day returns to 100 unless a separate incident for that day is substantiated.
13. Shift effort accepts exactly seven booleans and produces: 7/7 = 100 component/10 weighted points; 5/7 = `71.428571...` component/`7.142857...` weighted points; 0/7 = 0/0, all before display rounding.
14. Shift checklist counts equal the seven item states, submission is branch-authorized, duplicate current records for the same entertainer/branch/shift/day are rejected, and extra performances cannot raise the score above 100.
15. Monetary penalties calculate 0, 1, and 2 misses as `0 ×`, `1 ×`, and `2 ×` the effective branch amount while leaving the proportional score formula unchanged, and post as linked itemized three-day settlement deductions.
16. Different branches may use different per-miss amounts; negative amounts are invalid, and later effective versions do not alter stored historical penalties.
17. On-time attendance creates no attendance financial deduction; lateness charges exact lateness minutes times the effective branch rate; no-show charges only the fixed no-show amount and suppresses lateness.
18. Branch-specific/effective-dated attendance rates may differ without retroactively changing stored deductions, and settlement lines remain separate from the 10% ranking input.

The executable policy-contract checks are in [`tests/test_entertainer_ranking_policy.py`](../tests/test_entertainer_ranking_policy.py).

## Executive approval still required

The eight weights, daily 0-100 scale, and rank thresholds above are fixed by the specified model. CEO or General Manager approval is still required for:

- component normalization rules, including attendance/no-show/lateness penalties and personal-development evidence scoring;
- the attitude deduction/evidence rubric, appeal authority, and interaction with the customer-complaints factor;
- the daily POS-sales-to-monthly-benchmark normalization formula;
- settlement processing timing, monetary-penalty approval/reversal authority, and legal/policy limits;
- evaluation window and cadence;
- display precision and rounding;
- hard gates and grace period;
- promotion/demotion authority;
- rank benefits and financial effects; and
- exception, appeal, and manual-override rules.
