# Entertainer Ranking Policy

## Status

**Approved baseline on 2026-08-11. Numerical policy parameters still require an effective, versioned configuration before use.**

## Purpose

Use a fair, explainable three-rank lifecycle on a 14-day cadence, with a Branch Manager recommendation and CEO final decision.

## Approved ranks

1. Rank 1
2. Rank 2
3. Rank 3

Metric weights, thresholds, hard gates, benefits, and effective policy versions remain configuration decisions tracked in BAT-96.

## Approved evaluation lifecycle

1. A new entertainer begins with an onboarding or provisional rank according to the approved policy.
2. The system collects verified performance events: attendance, punctuality, no-show status, verified sales/income, reservations, repeat-customer loyalty, training, ratings/complaints, and compliance.
3. Every 14 days, the system prepares an explainable evaluation using the effective policy version.
4. The Branch Manager reviews the evidence and submits a recommendation.
5. The CEO approves, returns, or rejects the recommendation with a mandatory reason.
6. Every result records source events, policy version, calculation, hard gates, previous/new rank, recommendation, decision, explanation, and effective date.
7. Manual review, appeal, adjustment, reversal, and audit remain source-preserving workflows.

## Recommended controls

- Use the approved 14-day evaluation window rather than lifetime average alone.
- Use inactive or missing performance according to an approved data-quality rule; do not silently treat missing data as good performance.
- Require a minimum amount of verified history before promotion to higher ranks.
- Apply benefits only after the rank decision is effective.
- Restrict manual override to authorized decision makers with a recorded reason.
- Notify the entertainer through the internal PWA with a clear explanation of progress, missing requirements, and next review date.

## Configuration still required

The effective policy version must still define:

- metric weights and score thresholds;
- hard gates and grace period;
- rank benefits and financial effects;
- exception, appeal, and manual-adjustment rules.

The superseded four-level proposal is retained in Git history only. See `docs/decisions/2026-08-11-vip-club-business-logic-reconciliation.md`.
