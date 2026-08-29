# Loans, Compensation, and Settlement Requirements

## Current direction

Entertainers are performance-based subcontractors with a transparent three-day settlement cycle. Other eligible workers may request an income-based loan according to employment type. Financial rules are versioned, effective-dated, auditable, and historically reproducible.

## Entertainer compensation categories

The settlement model supports:

- customer-time/hourly revenue share;
- normal tips;
- spreading tips under the approved business term;
- wine sales commission;
- other approved income;
- loans, penalties, corrections, and other approved deductions.

- Their income is performance-based.
- Income is processed in a three-day settlement cycle.
- The calculation uses verified sales and other approved source records.
- Approved penalties and deductions are applied to the settlement.
- Missed-public-performance penalties from the seven-item shift checklist are itemized using the effective branch per-miss setting.
- Late arrival is itemized as `lateness_minutes × effective branch amount_per_minute_late`; a no-show is itemized as the effective fixed branch no-show amount.
- A no-show suppresses lateness for the same scheduled shift: do not calculate minutes or charge both deductions.
- Loan repayment is deducted from the settlement according to the approved repayment rule.
- Every line of the calculation must be explainable and auditable.

### Customer-time/hourly share

The confirmed company table-service shares are:

| Rank | Confirmed share |
| --- | ---: |
| Rank 3 | 50% |
| Rank 2 | 60% |
| Rank 1 | 70% |

The calculation first divides a paid Finex table-service base by its entertainer allocation count, then applies each entertainer's rank share. Wine, normal tip, spreading tip, product, and other commission categories retain their separately approved Finex allocation rules. The raw Finex amount and percent remain audit evidence.

These rates are versioned, effective-dated financial inputs. A policy version records eligible charge definition, rate, effective period, approver, and superseded version. A branch override is not allowed unless a later approved company policy explicitly introduces it.

### Next-day rank effect

- A scoring day's completed evidence determines the rank that becomes effective on the following scoring date.
- Customer-time/table-service transactions on the scoring day use the rank already effective for that date.
- Meeting Rank 2 conditions on 2026-08-01 does not recalculate 2026-08-01 earnings: that date remains Rank 3 at 50%. Rank 2 and its 60% share begin on 2026-08-02.
- Rank history records both the evidence/scoring date and `effective_from`. Every settlement line stores the rank and rate effective on its source transaction date.
- A later correction creates an auditable adjustment or reversal; it does not silently rewrite a finalized settlement.

### Tips and wine sales

Normal tips and wine commission use separately configured source, eligibility, split, and reconciliation rules.

### Spreading tip

A special tip type is currently called spreading tip. Interview values are approximately MNT 2,000 nominal value per unit and approximately 90% entertainer share.

**TBD — Business configuration required:** confirm official English/Mongolian term, eligible source record, nominal unit value, share, branch variation, refund/correction behavior, and accounting treatment.

## Branch-specific financial configuration

A Branch Manager may propose or maintain permitted branch values only within approved company policy and segregation of duties. Sensitive financial changes require:

- policy/version identifier;
- branch and effective date;
- previous and new value;
- actor and reason;
- review/approval state;
- audit event.

A future configuration change must not rewrite a finalized historical income statement.

## Three-day entertainer settlement flow

~~~text
Verified customer-time, tip, spreading-tip, wine, and other income events
→ effective rank and branch financial policy
→ calculated earnings by category
→ approved penalties, loan repayments, and adjustments

```text
Verified sales and income events
→ applicable shares and additions
→ approved penalties and adjustments
→ itemized missed-performance checklist deduction
→ itemized lateness or no-show attendance deduction
→ loan repayment deduction
→ net three-day settlement
→ review and approval
→ payment evidence and audit
~~~

## Entertainer income statement

The Entertainer PWA must show a clear statement for each three-day cycle.

### Earnings

- customer-time/hourly earnings;
- normal tips;
- spreading tips;
- wine commission;
- other approved income.

### Deductions

- loan repayment;
- lateness penalty;
- no-show penalty;
- missed entertainer-request deduction only if a later approved policy permits it;
- other approved deduction types.

Every line item includes source record, branch, date/time, quantity or amount, effective rate, policy version, calculation, adjustment/reversal link, and status. Manual deductions include proposer, reason, evidence, approver, decision, and effective date.

A missed or late entertainer request is recorded as evidence first. It must not create an automatic deduction.

## Employment type 2 — Day-based contract worker

- Base calculation uses approved worked days.
- Additional worked days are included when approved.
- Approved late and no-show penalties are deducted.
- Approved loan repayment is deducted.
- The calculation retains source attendance, policy, and adjustment records.

## Employment type 3 — Main fixed-salary employee

- Base calculation uses the agreed fixed salary.
- Additional worked days are included when applicable and approved.
- Approved late and no-show penalties are deducted.
- Approved loan repayment is deducted.
- The calculation retains source attendance, policy, and adjustment records.

## Common calculation principle

~~~text
Base pay or eligible performance income
+ approved additions
− approved penalties
− approved loan repayment
± approved adjustments/reversals
= net payable amount
~~~

## Loan requirements

- Eligibility, maximum amount, payment cycle, and repayment rules depend on employment type and approved policy.
- A request must use verified tenure, income, outstanding balance, and policy evidence.
- Approval, disbursement, repayment, adjustment, departure treatment, and payment evidence are audited.
- Entertainers see only their own authorized loan and repayment information.

For entertainers, the three-day settlement statement is the paystub-equivalent. A missed-performance line retains missed count, per-miss amount, total deduction, currency, source shift/checklist, applicable branch setting/version, and resulting net impact. An attendance line retains the scheduled shift, branch, required ready time, actual arrival when present, lateness minutes or no-show state, effective per-minute rate or fixed amount, currency, calculation, setting/version, source evidence, and correction/reversal links. No-show and lateness lines are mutually exclusive for one scheduled shift. Ranking score effects remain separate from all financial lines.

## Open decisions

- **TBD — Business configuration required:** approve the eligible hourly/customer-time charge definition, tip rules, wine commission, spreading-tip terminology and values, and whether a future branch override workflow is permitted.
- **TBD — Business configuration required:** approve lateness, no-show, missed-request, and other deduction policies and amounts.
- Confirm whether all employment types are loan-eligible and the minimum tenure/income requirements.
- Confirm maximum-loan formula, approval authority, repayment range, and treatment on departure.
- Confirm which sales records are eligible and how cancellations, refunds, and corrections affect settlement.
- Confirm legal, tax, E-Barimt, and contract requirements for subcontractors and employees.
