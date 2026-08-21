# Wave 3F hosted verification gate

**Status:** **CLOSED** — 17 Aug 2026. Hosted migrations `202608170001`–`004` applied; hosted verification **15/15**; Command API smoke green after `command-api` redeploy.

**Hard sequence:**

```
supabase db push (202608170001–004)
  → npm run test:hosted-wave3f-verification
  → Wave 3F production verification COMPLETE
  → unfreeze FIX-P1-012 importer batches (controlled domains)
```

**FIX-P1-012 importers (44 company-scoped service-role paths) remain frozen** until hosted verification passes.

---

## Operator steps

### 1. Push migrations (authenticated Supabase CLI)

```bash
cd "Veyvio admin "
supabase login
supabase link --project-ref qeckgqjrfbdyxchuncdt
supabase db push
```

Expected new versions on hosted:

| Version | Purpose |
|---------|---------|
| `202608170001` | Zero-policy tenant tables |
| `202608170002` | JWT matrix SELECT grants |
| `202608170003` | FORCE RLS + cost_control BFF branch |
| `202608170004` | P1-013 first-wave same-company triggers |

### 2. Run hosted verification

```bash
cd "Veyvio admin "
export VEYVIO_ANON_KEY="<hosted anon key>"
export SUPABASE_DB_URL="<hosted postgres connection string>"   # recommended
export VEYVIO_ISOLATION_PASSWORD="<if rotated from default>"
export VEYVIO_PLATFORM_PASSWORD="<platform admin password>"

npm run test:hosted-wave3f-verification
```

Evidence: `docs/plan/evidence/wave-3ff-hosted-verification.json`

---

## Minimum checks (must pass)

| Check | How |
|-------|-----|
| Migrations `202608170001`–`004` applied | SQL `schema_migrations` or `supabase migration list` |
| JWT cross-tenant isolation | Org A cannot SELECT Org B vehicle by id (empty) |
| Authenticated writes fail-closed | Org A cannot INSERT vehicle into Org B company (403/42501) |
| FORCE RLS posture | SQL: 0 public / 0 cost_control RLS tables without FORCE |
| Zero-policy tenant tables | SQL: 0 `company_id` public tables with 0 policies |
| `cost_control` PostgREST denied | Authenticated JWT → 403 on `cost_control.organisations` |
| Storage cross-tenant deny | Org B cannot list Org A `driver-documents` prefix; JWT sign B path denied |
| Own-company operations | Org A reads own vehicle; storage own-prefix list; `tenant-isolation-smoke` pass |

---

## Accepted boundaries (unchanged at lock)

1. **`cost_control`** — not a direct authenticated PostgREST path until Wave 3G (BFF/service-role).
2. **P1-013 later waves** — 40+ dual-FK register; not evidence of read/write leakage.

---

## After green

1. Mark **Wave 3F production verification COMPLETE** in `wave-3f-p0-011-lock.json`.
2. Begin **FIX-P1-012** — migrate 44 importers in **small domain batches** (not all at once).
3. **GitGuardian** test-key cleanup — separate ticket; does not block this gate.

---

## Non-blocking

- Driver Android APK CI job
- GitGuardian demo keys in local test scripts (track cleanup)
