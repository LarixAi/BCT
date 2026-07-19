# Veyvio platform backend blueprint

Canonical backend model for Veyvio Command, Driver and Yard.

The backend is organised around **shared transport domains**, not three separate apps. Each app receives a different authorised view of the same operational records.

```
Command ─────┐
Driver ──────┼── Veyvio Platform API ── Shared database and event system
Yard ────────┘
```

## Application surfaces

| Surface | Responsibility |
|---------|----------------|
| Veyvio Command | Planning, control, monitoring and administration |
| Veyvio Driver | Duty execution, passenger transport and driver evidence |
| Veyvio Yard | Physical vehicle readiness, movement, inspection and handover |

## Recommended technical structure

```
apps/
  command-api
  driver-api
  yard-api
  worker-service

modules/
  identity
  tenancy
  operations
  dispatch
  workforce
  fleet
  yard
  maintenance
  safety
  compliance
  customers
  passengers
  commercial
  communications
  reporting
  integrations
  audit
```

These run initially as a **modular monolith**. They do not need to be separate microservices at the start.

## Mandatory fields

Almost every business record includes:

- `id`
- `company_id`
- `created_at` / `created_by`
- `updated_at` / `updated_by`
- `version`
- `status`
- `source_app` — `COMMAND` | `DRIVER` | `YARD` | `MAINTENANCE` | `SYSTEM`

Where relevant also:

- `depot_id`
- `archived_at` / `archived_by`
- `external_reference`
- `client_generated_id`
- `device_id`
- `occurred_at` / `received_at` (distinct for offline Driver/Yard)

## Implementation status in this repo

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Identity, tenancy, roles, company/depots, audit, files, notifications, offline command model | Schema in `Veyvio admin /supabase/migrations` |
| 2 | Customers, passengers, bookings, trips, runs, duties, drivers, vehicles, dispatch validation | Schema + Command API projections |
| 3–5 | Driver/Yard connection, safety/maintenance, commercial/intelligence | Planned; shared tables reserved by domain |

Command wires only to `command-api` projections over these shared domains. Driver and Yard APIs will later project the same records with different authorisation.

Full entity catalogue, event catalogue, API groups and backend rules live in the product conversation that authored this blueprint; migrations implement the Phase 1–2 subset first.
