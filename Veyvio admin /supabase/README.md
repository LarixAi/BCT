# Veyvio Command backend (platform shared domains)

Command is one authorised surface of the **shared Veyvio platform**, not a separate backend.
Driver and Yard will later project the same `company_id`-scoped records.

See `docs/plan/veyvio-platform-backend-blueprint.md` for the full entity catalogue and build order.

## Structure

```
supabase/
  migrations/
    202607170001_phase1_platform_foundation.sql   # identity, tenancy, roles, depots, audit, files, notifications, sync
    202607170002_phase2_core_operations.sql        # customers, passengers, bookings, trips, runs, duties, drivers, vehicles, …
  functions/
    command-api/                                  # Command REST gateway (/api/*)
    _shared/
```

Tenancy key is `company_id` (blueprint `companyId`). The Command frontend still uses `tenantId` / `activeTenantId` in auth responses; the gateway maps both to the same company.

## Deploy

From `Veyvio admin /`:

```bash
npm run backend:link
npx supabase db push
npx supabase functions deploy command-api --no-verify-jwt
```

Frontend:

```dotenv
VITE_MOCK_API=false
VITE_API_URL=https://qeckgqjrfbdyxchuncdt.supabase.co/functions/v1/command-api
VITE_SUPABASE_ANON_KEY=<project anon key>
```

Create the first Auth user in the dashboard (signup disabled). First successful login bootstraps the first company and a `transport_manager` role with seeded permissions.

## Phase status

| Phase | Status |
|-------|--------|
| 1 Foundation | Migrated |
| 2 Core operations | Migrated + Command list/detail projections |
| 3 Driver/Yard connection | Schema reserved next |
| 4 Safety/maintenance depth | Core defect/incident/VOR/work-order tables present |
| 5 Commercial/intelligence | Contracts + rate cards present; billing/reports later |

## Rules enforced here

- One company-scoped vehicle / defect / trip model
- Planning (`trips`/`runs`/`duties`) separate from execution (`trip_executions` / `trip_events`)
- Offline command model tables ready for Driver/Yard
- Audit append-only (`audit_events`)
- Gateway uses service role; RLS still company-scoped for direct PostgREST

## Multi-tenant authentication

Company registration is for the first authorised representative only (`/signup`).
Staff must join by invitation — not public self-registration.

Tenant lifecycle includes `PENDING_*` → `SETUP_REQUIRED` → `ACTIVE`, plus
`SUSPENDED` / `READ_ONLY` / `CLOSING` / `CLOSED`.

The gateway derives `company_id` from the session (`active_company_id`), not from
client-supplied company query params. CORS allows the browser `apikey` header
required by the Supabase Edge gateway.
