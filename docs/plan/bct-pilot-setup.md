# BCT pilot setup

**Purpose:** Prepare Brent Community Transport (BCT) for the Gate 1 physical pilot and optional live smoke tests.  
**Companion:** [gate1-pilot-exit-test.md](./gate1-pilot-exit-test.md) · [credential-rotation-runbook.md](./credential-rotation-runbook.md)

---

## 1. Prerequisites

| Item | Notes |
|------|-------|
| Supabase project | Migrations through `202607250005` (BCT seed + pilot vehicle + admin BCT link) |
| `command-api` deployed | Scopes, dispatch gates, duty lifecycle, yard `task.create`, defect→yard chain |
| Credential rotation | [credential-rotation-runbook.md](./credential-rotation-runbook.md) signed off |
| Pilot driver account | Supabase Auth user with `driver_app_accounts` row linked to BCT driver |
| Pilot vehicle | At least one vehicle on BCT Main Depot (`BCT-MAIN`), diesel if testing AdBlue |
| Published duty | Duty for pilot driver with vehicle, report/finish times, `publication_status = published` |

---

## 2. Database seed (already in repo)

Migrations create:

- **Company:** `external_reference = 'BCT'` (Brent Community Transport)
- **Depot:** `BCT Main Depot` (`BCT-MAIN`) with Live Yard Map bays
- **Admin membership:** `202607240005` / `202607240007` link test users to BCT + depot access
- **Gate 1 backend:** `202607250002` defects↔damage cases, `202607250003` offline ops client ids, `202607250004` admin BCT link, `202607250005` pilot vehicle

Automated pilot driver seed (hosted API, platform admin):

```bash
cd "Veyvio admin "
export VEYVIO_ANON_KEY="<anon-key>"
npm run gate1:bct-pilot-setup
```

Creates `pilot-driver@veyvio.test` (password `VeyvioPilot1!` unless `VEYVIO_PILOT_PASSWORD` set), links BCT driver account, publishes today's duty, then runs driver live smoke.

Re-apply if needed:

```bash
cd "Veyvio admin "
npx supabase db push
npm run backend:deploy
```

---

## 3. Pilot driver account

1. Create or use an existing Supabase Auth user (e.g. `pilot-driver@yourdomain`).
2. Ensure a `drivers` row exists for BCT (`company_id` = BCT).
3. Link via `driver_app_accounts`:

```sql
-- Replace UUIDs with your pilot user and driver ids
insert into public.driver_app_accounts (
  company_id, driver_id, user_id, account_status, membership_id
)
select
  c.id,
  d.id,
  '<auth-user-uuid>'::uuid,
  'active',
  m.id
from public.companies c
join public.drivers d on d.company_id = c.id
left join public.company_memberships m on m.company_id = c.id and m.user_id = '<auth-user-uuid>'::uuid
where c.external_reference = 'BCT'
  and d.id = '<driver-uuid>'::uuid
on conflict (driver_id) do update set
  account_status = 'active',
  user_id = excluded.user_id,
  membership_id = excluded.membership_id;
```

4. Confirm `depot_access` for BCT Main Depot on the driver's membership (or company-wide depot fallback in bootstrap).

---

## 4. Publish a test duty (Command Admin)

1. Sign in to Command as BCT operator.
2. Schedule → create duty for **today** on BCT Main Depot.
3. Assign **pilot driver** + **test vehicle** (note registration for walkaround/handback).
4. Set report and finish times; **publish** duty.
5. **Verify:** Pilot driver receives in-app notification *Duty published* (Gate 2 notification rule).
6. **Do not acknowledge yet** if running automated smoke — live smoke expects sign-on blocked until ack.

---

## 5. Vehicle scenarios

| Scenario | Setup |
|----------|--------|
| Walkaround + sign-on | Vehicle `operational_status = available`; complete check before sign-on |
| Acknowledge duty | Driver must acknowledge published duty before sign-on (server enforced) |
| Bodywork → Yard | Any vehicle; report damage on walkaround or defect screen |
| Handback + bay | Yard map seeded — use a real bay code from BCT layout |
| AdBlue | Diesel/hybrid vehicle; `/vehicle/adblue` after duty |
| Sign-on block | Vehicle `vor` or missing today's check — bootstrap + server reject sign-on |

---

## 6. Automated preflight (run before pilot day)

From repo root (static guards — no hosted API required):

```bash
npm run gate1:preflight -- --skip-build
```

Full preflight with live API (after deploy):

```bash
export VEYVIO_API_URL="https://<project>.supabase.co/functions/v1/command-api"
export VEYVIO_SUPABASE_URL="https://<project>.supabase.co"
export VEYVIO_ANON_KEY="<anon-key>"
export VEYVIO_ISOLATION_PASSWORD="<password>"
export VEYVIO_PILOT_EMAIL="pilot-driver@example.com"
export VEYVIO_PILOT_PASSWORD="<password>"
npm run gate1:preflight -- --live
```

What this runs:

| Step | Proves |
|------|--------|
| `audit:secrets` | No committed server secrets (F-04) |
| Yard + Driver production guards | No mock/Base44 in release builds (F-03) |
| Admin lifecycle + scope units | Duty ack→sign-on gates coded (TD-005, F-01) |
| `test:dispatch-gates-live` | VOR assign blocked, ack before sign-on (F-06) |
| `gate1:bct-readiness` | BCT operator hub, permissions, TD-009 mutations (no pilot driver required) |
| `gate1-pilot-exit-smoke` | Pilot driver bootstrap, eligibility, ack flow (needs `VEYVIO_PILOT_*`) |

Driver-only live smoke:

```bash
cd veyvio-driver-App
npm run gate1:pilot-smoke
```

---

## 7. Pilot day checklist

- [ ] [credential-rotation-runbook.md](./credential-rotation-runbook.md) signed off
- [ ] Backend deployed (`command-api`) + migrations through `202607250003`
- [ ] Pilot driver linked + duty published today
- [ ] `npm run gate1:preflight` green (add `--live` when API credentials available)
- [ ] Android + iOS physical devices with production-profile build
- [ ] Complete physical checklist in [gate1-pilot-exit-test.md](./gate1-pilot-exit-test.md)
- [ ] Sign-off table updated; tracker in `veyvio-production-gates.md` §3.1

---

## 8. Failure triage

| Symptom | Likely cause |
|---------|----------------|
| Bootstrap 403 `driver_account_missing` | No `driver_app_accounts` row for user + BCT |
| Bootstrap 403 `application_scope_forbidden` | Command-only login used on Driver API |
| No duty on home | Duty not published or wrong driver/depot |
| Sign-on succeeds without ack | `command-api` not deployed with `duty-lifecycle-gates` |
| Sign-on blocked `dispatch_blocked` | VOR, missing vehicle check, or eligibility — expected for block tests |
| Yard does not see damage | `command-api` not deployed; check `yard_tasks` for company |
| Notifications empty after publish | Driver app account not linked; check `notifications` table |
| Cross-tenant data | Stop-ship — report immediately |
