---
type: ux-requirements
status: selected-baseline
last_reviewed: 2026-08-07
---

# Customer PWA

## Purpose

Define customer registration, consent, one company-wide membership status, points, branch-eligible privileges, reservations, and approved interactions.

## Membership experience

The customer experience must show:

- one visible status across every branch: Bronze, Silver, Gold, Diamond, or Black Diamond;
- one available point balance and recent earn, redemption, expiry, reversal, or adjustment history;
- available privileges for the selected branch and why a privilege is or is not eligible;
- current monthly, annual, or other privilege-quota usage and reset date;
- the member's anniversary and remaining eligible spend needed to retain the current status or unlock the next status;
- approved reservation priority, notice window, hold, and no-show terms;
- consent and preferred communication channels.

Do not display a lower branch-specific rank. A Gold member remains Gold at every branch even when a premium privilege at the selected branch requires Diamond or Black Diamond.

Use positive unlock language that explains current access and next-level opportunities.

## Point and redemption experience

- Do not present the loyalty model as a permanent POS discount.
- Show point/credit earn and redemption using the approved point-to-MNT conversion and policy version.
- Require explicit customer or authorized staff confirmation for redemption.
- Show pending, completed, reversed, expired, and adjusted point events accurately.
- Do not expose unapproved example rates, thresholds, or quotas as final customer terms.

## Reservations and privileges

The PWA may support self-service reservations only where the approved branch process allows it. It must show branch-specific privilege terms, notice requirements, guest rules, and availability without changing the member's visible status.

Monthly complimentary-entry allowances do not carry over. Annual transport and other periodic quotas follow their effective policy.

## Privacy and controls

- Customer communications require valid channel consent.
- Sensitive spend, status, point, and reservation details require authenticated access.
- Server-side permission and policy checks are authoritative.
- The UI must provide a clear help or review path for disputed transactions, status decisions, redemptions, and privilege use.

## Open decisions

Self-service launch scope, identity verification, notification channels, eligible-spend wording, upgrade timing, point economics, final privilege terms, and appeal/contact workflows remain subject to approval.

## Related documents

- [CRM and Loyalty Requirements](../crm-and-loyalty-requirements.md)
- [Loyalty Module](../04-modules/loyalty/README.md)
- [Stakeholder Clarification Register](../stakeholder-clarification-register.md)
