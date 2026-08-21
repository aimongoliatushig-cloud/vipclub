---
type: scaffold
status: draft
last_reviewed: 2026-08-18
---

# Policy Versions

## Purpose

Catalog policy versions, effective dates, supersession, and configuration scope.

## Current state

No production-effective ranking version is recorded in this repository. The canonical weights, 0-100 score scale, rank thresholds, and sales benchmark settings contract are stored in [`../entertainer-ranking-weights.json`](../entertainer-ranking-weights.json). The complete branch table shape is in [`../entertainer-ranking-sales-benchmarks.schema.json`](../entertainer-ranking-sales-benchmarks.schema.json).

Every ranking snapshot must retain its ranking policy version, eight weights, thresholds, attitude rubric version, and exact branch/year/month sales benchmark version so historical results remain reproducible. Each branch owns an independent version history; publishing one branch's table must not mutate another branch. Changing a normalization rule, weight, threshold, attitude rubric, gate, missing-data treatment, score scale, rounding rule, or any monthly range requires a new version; historical snapshots must not be recalculated silently.

Every shift checklist also retains the effective branch per-miss penalty setting/version and calculated currency amount. A later effective setting applies only to later scoring times and never rewrites a historical checklist or its itemized three-day settlement line. Corrections/reversals create linked versions or payout adjustment lines.

Every attendance result retains the branch-and-shift ready-time/penalty setting version effective for its scheduled/scoring time, plus the preserved inputs and calculated deduction. A later setting version applies only to later shifts. A no-show result stores no lateness minutes or lateness amount for that shift; corrections or reversals create linked attendance and settlement versions instead of rewriting the historical source.

## Related documents

- [Knowledge-base gap analysis](../../knowledge-base-gap-analysis.md)
- [Stakeholder clarification register](../../stakeholder-clarification-register.md)
