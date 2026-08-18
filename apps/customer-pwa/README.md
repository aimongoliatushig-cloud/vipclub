# Customer Assistant PWA

Extend the existing customer-facing application rather than create a second customer app.

It supports registration, consent, one membership status, points, branch privileges, reservations, room-QR session context, approved public entertainer profiles, realtime requestable availability, entertainer requests, approved extra services/prices, feedback, and other authorized self-service.

The app remains separate from the internal PWA because its UX, data allowlists, session model, and privacy boundaries differ.

Customer responses must never expose entertainer body measurements, private contacts, incidents, financial information, confidential KPI evidence, or internal matching fields. Room/session access must not expose another room or customer.

Use Frappe permission-checked APIs and selected realtime events; the client never owns authoritative availability, request, membership, point, or price decisions.

See [Customer Assistant requirements](../../docs/08-ux/CUSTOMER_PWA.md).

This separate customer-facing PWA will support customer registration, consent, membership, benefits, cashback, reservations, and an authenticated helper flow for entertainer complaints and praise.

It remains separate from the internal PWA because it has different user experience, privacy, and authorization boundaries.

The feedback flow requires identified customer, selected entertainer, VIP room, applicable visit/reservation/session context, type, and text. Complaints route only to authorized management; praise also delivers to the selected entertainer under field-level customer/room masking. Neither submission automatically changes ranking.
