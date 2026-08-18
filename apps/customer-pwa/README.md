# Customer PWA

This separate customer-facing PWA will support customer registration, consent, membership, benefits, cashback, reservations, and an authenticated helper flow for entertainer complaints and praise.

It remains separate from the internal PWA because it has different user experience, privacy, and authorization boundaries.

The feedback flow requires identified customer, selected entertainer, VIP room, applicable visit/reservation/session context, type, and text. Complaints route only to authorized management; praise also delivers to the selected entertainer under field-level customer/room masking. Neither submission automatically changes ranking.
