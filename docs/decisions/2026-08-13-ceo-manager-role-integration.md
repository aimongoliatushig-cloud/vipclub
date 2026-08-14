---
type: decision
status: implemented-prototype
date: 2026-08-13
---

# CEO and Branch Manager role integration

## Decision

Use one internal PWA entry point with a resolved management session. Render a company-wide executive workspace for the CEO and the existing branch-scoped operational workspace for a Branch Manager.

The role boundary is expressed through explicit permissions and branch identifiers. CEO approval operations validate executive permission before reading or mutating company decision records. The Manager workspace remains branch-scoped and has no final approval method.

## Shared records

The following Manager-to-CEO handoffs use shared persisted records in the prototype:

- next-month sales goal proposal and action plan;
- entertainer rank recommendation;
- customer membership support/retain recommendation.

CEO decisions support approve, return for revision, and reject. Decision state, actor, timestamp, and comment remain on the same record and are immediately visible when the Manager reopens the relevant workspace.

## Role-specific default surfaces

CEO:

- consolidated monthly sales progress;
- branch comparison and risk signals;
- goal and recommendation approval queue;
- executive workforce evidence for schedules, coverage, leave, lateness, and no-shows;
- masked CRM customer and team-ranking evidence.

Branch Manager:

- own-branch approved sales goal and completion;
- tasks and operations;
- weekly scheduling, coverage, attendance, leave, and penalty review;
- own-branch customer search and rankings;
- evidence-based proposals for executive decision.

## Prototype boundary

The current prototype uses a Mongolian role-selection screen and browser-local persistence so the complete interaction can be tested without an identity provider or backend. It does not claim production authentication, multi-device synchronization, database transactions, or server authorization. Production must replace the local session and data adapters without changing the role, state, and audit contracts above.

## Verification

- Manager session is rejected by executive service permission checks.
- Manager submission is visible in the CEO queue.
- CEO decision is visible in the Manager record with its comment.
- CEO and Manager navigation and default dashboards differ by role.
- Desktop and mobile UI are rendered and interaction-tested in Mongolian.
