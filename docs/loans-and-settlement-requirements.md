# Loans and Settlement Requirements

## Current direction

All eligible workers may request an income-based loan. Eligibility, maximum amount, payment cycle, and repayment rules depend on the worker's employment type.

## Employment type 1 — Entertainer subcontractor

Entertainers are subcontractors rather than standard employees.

- Their income is performance-based.
- Income is processed in a three-day settlement cycle.
- The calculation uses verified sales and other approved source records.
- Approved penalties and deductions are applied to the settlement.
- Missed-public-performance penalties from the seven-item shift checklist are itemized using the effective branch per-miss setting.
- Late arrival is itemized as `lateness_minutes × effective branch amount_per_minute_late`; a no-show is itemized as the effective fixed branch no-show amount.
- A no-show suppresses lateness for the same scheduled shift: do not calculate minutes or charge both deductions.
- Loan repayment is deducted from the settlement according to the approved repayment rule.
- Every line of the calculation must be explainable and auditable.

## Required entertainer settlement flow

```text
Verified sales and income events
→ applicable shares and additions
→ approved penalties and adjustments
→ itemized missed-performance checklist deduction
→ itemized lateness or no-show attendance deduction
→ loan repayment deduction
→ net three-day settlement
→ review, approval, payment evidence, and audit
```


## Employment type 2 — Day-based contract worker

This worker is engaged under a labor contract and is paid according to the number of days worked.

- Base calculation uses approved worked days.
- Additional worked days must be included in the pay calculation.
- Approved late and no-show penalties are deducted.
- Approved loan repayment is deducted.
- The salary calculation must retain source attendance and adjustment records.

## Employment type 3 — Main fixed-salary employee

This worker has a regular fixed salary rather than primarily performance-based income.

- Base calculation uses the agreed fixed salary.
- Additional worked days must be included when applicable.
- Approved late and no-show penalties are deducted.
- Approved loan repayment is deducted.
- The salary calculation must retain source attendance and adjustment records.

## Common salary-calculation principle

```text
Base pay or eligible performance income
+ approved additional workdays or additions
− approved lateness/no-show penalties
− approved loan repayment
± approved adjustments
= net payable amount
```

For entertainers, the three-day settlement statement is the paystub-equivalent. A missed-performance line retains missed count, per-miss amount, total deduction, currency, source shift/checklist, applicable branch setting/version, and resulting net impact. An attendance line retains the scheduled shift, branch, required ready time, actual arrival when present, lateness minutes or no-show state, effective per-minute rate or fixed amount, currency, calculation, setting/version, source evidence, and correction/reversal links. No-show and lateness lines are mutually exclusive for one scheduled shift. Ranking score effects remain separate from all financial lines.

## Open decisions

- Confirm whether all employment types are eligible, and the minimum tenure or income requirements.
- Confirm maximum-loan formula, approval authority, repayment range, and treatment on departure.
- Confirm which sales records are eligible and how cancellations, refunds, and corrections affect settlement.
- Confirm legal and contract requirements for subcontractors and employees.
