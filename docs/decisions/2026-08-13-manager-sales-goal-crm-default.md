# Manager sales-goal and CRM default-page boundary

- **Date:** 2026-08-13
- **Status:** Accepted for the browser-local prototype; production authorization and source integration remain required
- **Owner:** VIP Club product owner

## Context

The Branch Manager PWA already opens on a branch-scoped operational overview and provides a masked CRM plus customer membership-level evidence. The missing manager context was the manager's own monthly sales goal and faster customer discovery by phone, membership level, total expenditure, and average expenditure.

The existing business documents establish that the Branch Manager prepares or executes the branch plan, the CEO alone activates the target, and actual progress must be based on reconciled sales. They also prohibit unrestricted customer contact and cross-branch data from being inferred from a manager title.

## Decision

1. The manager overview remains the default page and places the active monthly sales goal first.
2. The goal panel is a read-only branch projection containing the approved target, reconciled actual sales, remaining/above-target amount, numeric achievement, progress bar, CEO approval version, source state, and refresh time.
3. Only an active CEO-approved target for the same branch and month can be used in the progress calculation. Missing, draft, submitted, revision-requested, rejected, or expired targets are not treated as active.
4. A Branch Manager receives only the authorized branch goal. Company-wide and other-branch sales remain unavailable without a separate permission.
5. The CRM supports name and phone discovery while preserving masked return data. The browser-local prototype searches the visible last four digits; production may accept a full number only for secure normalized server-side matching.
6. The directory shows current membership level, total confirmed expenditure, and average expenditure together and supports ordering by membership level, total expenditure, average expenditure, and latest visit.
7. These read improvements do not grant target approval, membership editing, customer export, campaign sending, or cross-branch access.

## Calculation

```text
achievement percentage = reconciled actual sales / approved target × 100
remaining amount = max(approved target - actual sales, 0)
above-target amount = max(actual sales - approved target, 0)
```

The numeric percentage can exceed 100%; the visual track is capped at 100%.

## Consequences

- The manager sees the most important commercial commitment immediately after signing in.
- CEO approval evidence is visible without giving the manager approval authority.
- Customer rank and spend context becomes scannable without opening every detail record.
- No full phone number is added to the browser seed/read model.
- Production still requires authenticated branch ownership, secure field projection, approved POS/accounting reconciliation, goal-cycle APIs, and audit enforcement.

## Open policy dependencies

- CL-024 still controls the final baseline method, improvement percentage, planning calendar, and refresh cadence.
- Customer eligible-spend treatment, branch ranges, and effective membership policy versions remain governed by the existing CRM clarification items.
