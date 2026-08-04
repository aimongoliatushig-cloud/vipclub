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
− approved loan repayment
± approved adjustment
= proposed net payment
```

The system must retain source records, calculation version, policy version, and explanation for every line.

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
