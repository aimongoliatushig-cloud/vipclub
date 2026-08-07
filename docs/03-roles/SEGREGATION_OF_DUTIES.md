---
type: governance
status: selected-baseline
last_reviewed: 2026-08-07
---

# Segregation of Duties

## Purpose

Define who may prepare, review, approve, activate, pay, reconcile, and audit sensitive actions. A person must not gain approval authority merely because the UI or AI can formulate a request.

## Sensitive workflows

| Workflow | Prepare/propose | Review/approve | Post/activate | Reconcile/audit |
| --- | --- | --- | --- | --- |
| Entertainer rank | System/AI recommendation, Lead Entertainer or manager evidence | Authorized management; final authority **TBD — Business configuration required** | Authorized rank service after decision | CEO/audit role |
| Profit-sharing policy | Authorized Branch Manager or finance proposal | CEO / General Accountant under approved policy | System Administrator or authorized policy service | Accounting/audit |
| Three-day settlement | System calculation / Transaction Accountant | Authorized accounting/management approver | Payment Accountant or approved posting service | General Accountant |
| Manual deduction | Manager/accounting proposal with evidence | Separate authorized approver | Settlement adjustment service | Accounting/audit |
| Manager reward allocation | Policy calculation and Branch Manager proposal | CEO or delegated reviewer | Accounting/payment workflow | General Accountant / CEO |
| Manager penalty | Policy calculation/flag | HR/management/finance review | Authorized payroll adjustment | HR/accounting/audit |
| Employment termination review | System may flag only | Authorized human HR/management process | HR lifecycle workflow | CEO/HR audit |
| Monthly target and plan | CEO sets target; manager prepares plan | CEO approves plan | Goal service activates approved version | CEO/management review |
| Customer phone block | Call Operator/manager action or proposal per policy | Review authority **TBD** | Call-control/customer service | Manager/audit |
| Verified incident | Manager reports, evidence attached | Authorized management/HR review | Incident service marks verified/resolved | HR/CEO audit |
| Reconciliation exception | System detects; manager investigates | Branch Manager resolves; higher review as required | Reconciliation service | CEO/accounting |
| Anonymous identity reveal | Authorized request with purpose | Tightly permissioned CEO/audit authority | Audit service reveals minimum identity | Independent audit log review |

## AI boundary

AI assistants may prepare analysis, recommendations, drafts, calculations, and proposed records. They cannot provide the human approval step, grant themselves access, activate a policy, post a payment, change a rank, impose discipline, or terminate employment.

## Historical integrity

Financial and KPI rules use versioned effective dates. An approved change creates a new policy version. Finalized settlements, rewards, deductions, rank decisions, and KPI snapshots retain the exact policy and values applied at the time.

Corrections use reversal or adjustment records; silent edits are prohibited.

## Open decisions

- Final role mapping for each prepare/review/approve/post/reconcile step.
- Monetary and policy thresholds requiring CEO approval.
- Whether Branch Managers may directly activate any branch financial values.
- Rank approval hierarchy and whether CEO approval is always required.
- Phone block/unblock review and appeal.
- Manager penalty/reward payroll posting and appeal.
- Anonymous identity reveal authority and review frequency.

## Related documents

- [Role Permission Matrix](ROLE_PERMISSION_MATRIX.md)
- [Loans and Settlement Requirements](../loans-and-settlement-requirements.md)
- [Monthly Sales Target Process](../monthly-sales-goal-process.md)
- [Entertainer Ranking Policy](../entertainer-ranking-policy.md)
