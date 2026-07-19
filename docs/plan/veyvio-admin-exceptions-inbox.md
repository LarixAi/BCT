# Veyvio Command — Exceptions inbox

## Role

- **Control centre / Live Operations** answer: *what is happening right now?*
- **Exceptions** answers: *what needs intervention right now?*

Anything that cannot continue automatically should publish into this single operational inbox. Controllers should not hunt across Bookings, Dispatch, Drivers, Vehicles, Yard, Maintenance, Compliance, and Customer Services to discover blockers.

## First ship (MVP)

- Multi-module composed inbox (alerts, defects, incidents, eligibility, release, yard, plus seeded taxonomy catalog)
- Severity strip + ops KPIs
- Smart filters and module chips
- Urgency-coloured live queue
- Investigation workspace (facts, timeline, suggested actions, notes, audit)
- Soft local assign / investigate / escalate / close / raise (mock-first)

## Later

- Persist via `operational_exceptions` + PATCH lifecycle
- Real bulk export / print packs
- LLM next-best-action recommendations
- Nav badge wired to open exception count
