---
type: scaffold
status: draft
last_reviewed: 2026-08-04
---

# Customer PWA

## Purpose

Define customer registration, membership, benefits, cashback, reservations, consent, and entertainer-feedback experiences.

## Current state

The wider customer experience remains pending. The designated customer helper portal has the confirmed complaint-and-praise flow below.

## Entertainer complaint and praise helper

An authenticated, identified customer selects an entertainer, chooses **Complaint** or **Praise**, enters required experience text, and submits from/about a required VIP-room context. The portal also requires at least one validated visit, reservation, or session reference. Anonymous submission is not offered.

- The portal obtains the customer from the authenticated session, shows the applicable VIP room and experience context, validates the selected entertainer against that context, and lets the server derive the relevant branch.
- Complaint confirmation tells the customer the message was submitted for management review. The selected entertainer receives no complaint notification, message, preview, or response option.
- Praise confirmation states that the positive message is delivered to the selected entertainer's internal message center and is also visible to authorized management.
- The interface explains that submission alone changes no ranking score. A complaint needs approved verification/review and normalization before it can become evidence for the 15% customer-complaints factor; praise has no automatic score effect.
- Customer PII and VIP-room/experience details are protected. The CEO and relevant authorized branch managers can see the authorized complaint identity/context; praise shown to the entertainer includes only customer/room fields allowed by a future approved field-level policy.

Exact praised-entertainer field visibility, retention, and escalation/appeal rules remain open. Customer identity, VIP-room capture, and an applicable visit/reservation/session reference are confirmed requirements.

## Related documents

- [Knowledge-base gap analysis](../../knowledge-base-gap-analysis.md)
- [Stakeholder clarification register](../../stakeholder-clarification-register.md)
