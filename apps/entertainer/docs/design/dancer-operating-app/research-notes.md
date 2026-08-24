# Research and product architecture

## Interaction findings

- Earnings products surface completed work quickly and separate the glanceable amount from statements and breakdowns.
- Shift apps keep schedule, availability, swaps, and time actions close together instead of turning Home into a calendar.
- Nightlife operations tools depend on a shared live state, stage timers, rotation order, and exception visibility. The dancer-facing experience should expose only personal actions; the Senior Dancer gets the smallest operational queue needed to keep the shift moving.

Reviewed sources:

- Uber Help: trip earnings appear in the Earnings section soon after completion; weekly statements live deeper in the product.
- Deputy employee mobile guide: Home supports shift actions while Schedule owns day/week views, availability, and swaps.
- Clockwork Venue: stage clocks, live entertainer status, room timers, and role-specific operational screens share one live picture.
- Floor LinQ: entertainer portal patterns include live stage assignments and rotation placement.

## Jobs, frequency, urgency, and privacy

| Job | Frequency | Urgency | Disclosure |
| --- | --- | --- | --- |
| Understand live status and next action | every few minutes | immediate | Home |
| Accept or decline a VIP request | per request | critical, short window | Home/Request → detail |
| Run and finish a service | during service | immediate | focused timer → completion |
| Check today's earnings | every shift | high | Home → Earnings |
| Inspect breakdown or transaction | daily/weekly | normal | Earnings → detail |
| Check or change a shift | daily/weekly | normal | Schedule → shift detail |
| Review performance and rank | weekly/monthly | low | Profile → Rank |
| Coordinate team and rotation | every few minutes, Senior only | immediate | Home → Team |

Private information stays out of team views: personal earnings, banking, customer identity, private profile data, and detailed performance scores.

## Information architecture

- Level 0 Home: current earnings, live status, next stage action, and Senior team entry.
- Level 1 categories: Requests, Schedule, Earnings, Profile, Team.
- Level 2 details: request, service, transaction, shift, rank, adjustment, and exception resolution.

## Role and permission model

- Dancer owns personal Home, status, requests, service, earnings, schedule, rank, notifications, and profile.
- Senior Dancer retains every personal function and gains Team, Rotation, and operational Exception views.
- A role preview switch exists only in the local prototype to verify permission boundaries; production role remains server-controlled.
