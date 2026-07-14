# Driver terminology (platform glossary)

**Status:** Accepted  
**Plan:** [veyvio-driver-audit-delivery.md](../plan/veyvio-driver-audit-delivery.md)

Use these meanings consistently in **Driver**, **Yard**, and **Admin** copy. Internal IDs may keep legacy names.

| Term | Meaning | Where it appears |
|------|---------|------------------|
| **Duty** | Complete period of work assigned to a driver | Schedule, preparation, completion |
| **Journey** | One vehicle movement inside a duty | Start, live journey, journey completion |
| **Route** | Geographical sequence of stops | Navigation and route overview |
| **Stop** | Pickup, drop-off, depot, break, or waypoint | Live navigation |
| **Passenger task** | Pickup or drop-off responsibility | Passenger workflow |
| Assignment | Office action that allocates work | Mostly Admin |
| Run | Scheduling / operations grouping | Backend and Admin (`runId` OK internally) |
| Trip | A passenger’s booked transport movement | Passenger / booking context |

**Driver-facing sequence:** Duty → Journey → Route → Stop → Passenger task

## Invariants

1. Completing a **journey** does not end vehicle custody when another journey remains on the same duty.  
2. Completing a **duty** requires a completion gate (journeys, passenger outcomes, handback, clock-out / sync as required).  
3. Exception passenger outcomes move the stop to **waiting for Operations** and must not auto-advance the route.  
4. The active journey is selected from lifecycle state (`activeJourneyId` / active run), never assumed to be `runs[0]`.
