---
type: scaffold
status: draft
last_reviewed: 2026-08-18
---

# Income and Settlement Module

## Purpose

Income events, three-day entertainer settlement, deductions, adjustments, and payment evidence.

## Current state

The wider module remains pending repository audit. Entertainer three-day settlements must include an itemized missed-public-performance deduction sourced from the seven-item shift checklist and the branch's effective per-miss setting. They also include a mutually exclusive attendance deduction for a scheduled shift: either `lateness_minutes × effective branch amount_per_minute_late` or the effective fixed branch no-show amount. A no-show does not calculate minutes or produce a lateness line.

Each financial line retains its source shift/checklist or attendance result, branch setting/version, currency, calculation inputs, total, evidence, and net settlement impact. Corrections and reversals use linked line items without rewriting historical sources. The 10% shift-effort and 10% attendance ranking results remain separate from their monetary deductions.

## Related documents

- [Knowledge-base gap analysis](../../knowledge-base-gap-analysis.md)
- [Stakeholder clarification register](../../stakeholder-clarification-register.md)
