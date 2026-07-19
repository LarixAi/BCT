# Runs · Trips · Schedule

Three perspectives on the same operational data — not three separate modules.

| Page | Question | Primary user | Nature |
|------|----------|--------------|--------|
| **Schedule** | What is planned for the future? | Planner / Transport Manager | Planning (before the day) |
| **Runs** | Who is driving what today? | Dispatcher | Duty control (during the day) |
| **Trips** | What journeys are taking place? | Operations Controller | Service delivery (passengers) |

## Flow

Bookings → **Schedule** (plan) → publish → **Runs** (duties) → **Trips** (passenger journeys) → Live Ops / Yard / Notifications / Exceptions

## Colour coding (Schedule)

- Blue — school
- Green — hospital
- Amber — SEND
- Purple — private hire
- Red ring — conflict / VOR / unassigned

## Sync rules

- Selecting a run can jump to its trips (`/trips?run=`)
- Selecting a trip can open its parent run (`/runs/:dutyId`)
- Live Ops “Open full run” uses `/runs/:id`
- Schedule conflicts surface before work is published into Runs
