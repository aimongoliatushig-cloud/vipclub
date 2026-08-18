---
type: scaffold
status: draft
last_reviewed: 2026-08-18
---

# Role Permission Matrix

## Purpose

Define role, branch, record, action, approval, export, and field-level permissions.

## Current state

The full cross-product matrix remains to be completed from approved business decisions, repository audit, and source-system discovery. The following entertainer-ranking permissions are confirmed.

| Role | Scope | Enter permitted scores | Submit shift checklist | Finalize attitude incident | Configure branch ranking settings | View component detail | Correct entry | Finalize evaluation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Branch manager | Authorized branch | Yes | Yes | Yes | Yes: monthly sales, per-miss, and attendance penalty settings | Yes | Proposed; correction must be audited | Open decision |
| Lead entertainer | Authorized branch | Yes | Yes | No | No | Yes | Proposed; correction must be audited | Open decision |
| Entertainer | Own record | No | No | No | No | Proposed: own result and explanation | No | No |

Open decisions include self-scoring by a lead entertainer, conflict resolution when two authorized users score the same non-attitude component and period, overall evaluation finalization, and reopening authority. Attitude incident finalization is confirmed as branch-manager-only. Only an authorized branch manager may configure required ready times, lateness rates, and fixed no-show amounts for that manager's branch.

### Internal team message permissions

| Role | Submit complaint/compliment | View complaint content | Respond to complaint | Receive compliment | View compliment oversight |
| --- | --- | --- | --- | --- | --- |
| CEO | Yes | Company-wide | Management review only; response workflow open | Yes, when selected | Company-wide |
| Branch manager | Yes | Relevant authorized branch only | Management review only; response workflow open | Yes, when selected | Relevant authorized branch only |
| Other employee/team member, including entertainer | Yes | No, including when named as subject | No | Yes, when selected | Own received compliment only |

Complaint senders receive submission confirmation but no management-only review data. Complaint subjects receive no delivery, view, preview, count, audit payload, or response route. Compliments are delivered to the praised employee and remain visible to authorized branch managers and the CEO.

### Customer portal message permissions

| Role | Submit customer message | View customer complaint | Receive customer praise | Customer/room context |
| --- | --- | --- | --- | --- |
| Authenticated customer | Yes, as self through helper portal | Submission confirmation only | Not applicable | Own validated room/visit/reservation/session context |
| CEO | No customer impersonation | Company-wide | Management oversight | Authorized company-wide; PII handling/masking applies |
| Branch manager | No customer impersonation | Relevant authorized branch only | Management oversight | Relevant branch only; PII handling/masking applies |
| Selected entertainer | No customer impersonation | No | Yes | Only fields permitted by approved praise field-level policy |

Anonymous customer submissions are not allowed. A customer complaint cannot be exposed to the selected entertainer through content, metadata, counts, notifications, search, reporting, or audit access.

## Related documents

- [Knowledge-base gap analysis](../../knowledge-base-gap-analysis.md)
- [Stakeholder clarification register](../../stakeholder-clarification-register.md)
