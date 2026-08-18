# Payroll Processing and Corporate Bank Transfer

## Purpose

Calculate, review, approve, and pay entertainer settlements and employee payroll through a controlled corporate-bank integration.

## Pay-run schedules

- **Entertainer subcontractors:** performance-based settlement every three days.
- **Day-based contract workers:** salary run twice monthly on configurable dates.
- **Main fixed-salary employees:** salary run twice monthly on configurable dates.

A system administrator can configure the settlement or payroll calendar, branch scope, reminders, and responsible processing role. The responsible accountant or manager is configurable and must be recorded for each pay run.

## Automated calculation

For each eligible person, the system creates a draft calculation from verified source records:

```text
Eligible base pay or performance income
+ approved additional workdays and additions
− approved lateness/no-show penalties
− missed-public-performance penalties from shift checklists
− approved loan repayment
± approved adjustment
= proposed net payment
```

The system must retain source records, calculation version, policy version, and explanation for every line.

### Entertainer missed-performance deduction

For entertainer subcontractors, the requested paycheck/paystub is the existing three-day settlement and its statement. Each missed-performance amount is an itemized deduction line calculated as `missed_count × effective branch amount_per_miss` and linked to the source shift checklist and branch setting/version.

The line shows missed count, per-miss amount, total deduction, currency, source shift/checklist, setting/version, and net settlement impact. Shift-effort ranking score remains a separate non-monetary calculation. Corrections or reversals create linked adjustment/reversal lines in a later controlled calculation without rewriting the historical checklist, setting, or original settlement line.

### Entertainer attendance deductions

For each scheduled entertainer shift, use the branch-and-shift setting version effective at the scheduled/scoring time. An arrival after the configured required ready time creates a separate itemized lateness line equal to `lateness_minutes × effective branch amount_per_minute_late`. A shift classified as a no-show instead creates one itemized line for the effective fixed branch no-show amount.

No-show and lateness are mutually exclusive for the same scheduled shift: once the shift is classified as a no-show, do not calculate lateness minutes and do not create a lateness charge. Each line retains the scheduled shift, branch, required ready time, actual arrival when present, no-show state, applicable setting/version, rate or fixed amount, currency, calculation, source evidence, and correction/reversal links. Later setting versions do not change a stored deduction.

Attendance, no-show, and lateness continue to feed the separate 10% ranking component. Monetary settlement deductions must never be substituted for, or added to, that component score. Corrections and reversals flow through linked settlement adjustment lines without rewriting the historical attendance source or original line.

## Review and approval workflow

1. The system reminds the configured responsible processor on each scheduled run date through the PWA.
2. The responsible processor reviews the draft pay run and its exceptions.
3. An authorized user may add a deduction or adjustment only with reason, supporting evidence, actor, and audit record.
4. The pay run is submitted for the required financial approval.
5. Once approved, the system creates a payment batch with validated recipient bank details and net amounts.
6. An authorized user initiates the corporate gateway transfer.
7. The gateway returns accepted, processing, succeeded, or failed status per payment.
8. The system reconciles gateway results, records payment evidence, and keeps failures available for controlled retry or correction.

## Corporate gateway controls

- Use the company’s approved online-banking corporate gateway API.
- Store bank-account data with encryption, masking, and strict financial-role access.
- Validate recipient identity and bank-account status before inclusion in a batch.
- Use idempotency keys to prevent duplicate transfers.
- Require the configured approval and separation of duties before payment initiation.
- Do not allow Hermes or automated jobs to initiate, approve, or alter transfers.
- Record batch ID, recipient count, amount totals, gateway response, operator, approver, and timestamps.
- Handle partial failures through reconciliation and an explicit retry or correction workflow.

## Required records

- Pay-run calendar configuration.
- Responsible processing assignment.
- Pay run and pay-run line items.
- Adjustments and deductions with evidence.
- Approval decisions.
- Payment batch and payment instructions.
- Gateway delivery/reconciliation results.
- Audit events and correction references.

## Open decisions

- Confirm the final responsible role for pay-run processing and approval.
- Confirm two monthly dates for each non-entertainer pay model.
- Confirm financial approval limits and required separation of duties.
- Confirm corporate gateway provider, API capabilities, sandbox access, failure responses, and reconciliation files.
- Confirm bank-account verification, change-approval, and offboarding controls.
- Confirm whether payments require a second approver in the bank portal after system initiation.
