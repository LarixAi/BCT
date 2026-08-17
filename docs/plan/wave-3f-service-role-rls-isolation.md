# Wave 3F — Service-role usage + full RLS tenant-isolation proof

**Status:** OPEN / IN PROGRESS (started 17 Aug 2026)  
**Depends on:** Wave 3E CLOSED / LOCKED  
**Does not touch:** 3E-1 BFF cookies, 3E-2 native Driver custody, organisation_id (3G)

**Anchors (remediation plan):**

| Fix | Title | Role in 3F |
|-----|--------|------------|
| FIX-P0-011 | Prove complete RLS coverage from a clean database | Inventory + negative tests + CI posture |
| FIX-P1-012 | Reduce service-role blast radius in Command | UserScopedDb vs PrivilegedDb |
| FIX-P1-013 | Structural same-company constraints | Expand beyond 3 join pairs |
| FIX-P1-048 | Fresh migration CI gate | Automate clean-DB proof |

---

## Inventory verdict (baseline)

Command Edge (`command-api` + `_shared`) uses a **single shared service-role client** (`admin` in `_shared/supabase.ts`). Authenticated product traffic **bypasses RLS**. Tenant safety is application discipline (`authenticate` → `company_id` filters / `assertCompanyScoped*`).

- `publicClient` is for Auth only (`getUser` / password / refresh).
- `RequestContext.db` is always `admin` and currently unused.
- `tenant-db.ts` helpers exist but are barely used for CRUD.
- ~63 modules import `admin` today.
- Live `npm run test:tenant-isolation` proves **Command API** Org A/B deny — not Postgres RLS evaluation.
- Same-company triggers exist only for `depot_access`, `duty_runs`, `run_trips`.
- Clean migration proof (`backend:reset` + audit SQL) is manual; no CI fresh-DB gate yet.

Canonical trust-boundary doc: `docs/architecture/13-postgrest-vs-command-api.md`.

---

## Target architecture

```text
Browser / Driver / Yard / Command SPA
        │
        ▼
   command-api (Edge)
        │
        ├── UserScopedDb     (JWT + RLS / or company-forced service client during transition)
        │     ordinary tenant reads/writes
        │
        └── PrivilegedDb     (service-role, reason-tagged, allowlisted)
              platform, Auth Admin, invites, MFA secrets,
              storage signing, seeds, support grants, billing
```

**Transition rule (non-negotiable):** Do not flip all routes to user-JWT writes until authenticated RLS policies cover required mutations. Prefer:

1. Freeze + classify current `admin` importers (allowlist).
2. Route new code through `tenant-db` / future UserScopedDb.
3. Shrink PrivilegedDb allowlist deliberately.
4. Prove PostgREST RLS from clean DB in parallel (P0-011).

---

## Workstreams

### 3F-A — Privileged allowlist + static gate (FIX-P1-012 start)

- [x] Baseline inventory of `admin` imports under `supabase/functions/`
- [x] Frozen allowlist + unit test fails on new unlisted `admin` imports
- [x] Introduce `db-authority` helpers (`privilegedDb(reason)`, company-scoped service wrapper)
- [ ] Migrate high-risk modules onto explicit PrivilegedDb reasons
- [ ] Prefer `tenantSelect` / `tenantInsert` for ordinary CRUD

### 3F-B — Clean-DB RLS proof (FIX-P0-011)

- [x] `backend:reset` (or equivalent) against current migration chain
- [x] Run `scripts/sql/tenant-table-audit.sql`; classify every tenant-bearing table
- [x] Org A→B authenticated PostgREST deny sample (vehicles) — see `wave-3fb-clean-db-rls-proof.md`
- [x] Close remediation item 1 (zero-policy tables) — `202608170001` + JWT `31/31`
- [x] FORCE RLS expansion (`202608170003`) — public 171/171 + cost_control 34/34 BFF/service-role branch
- [x] FIX-P1-013 first-wave same-company triggers (`202608170004`) — forge `13/13`; JWT regression `72/72`
- [x] FIX-P1-048 fresh-DB gate green locally (`npm run test:fresh-db-gate`) — inventory + forge `13/13` + JWT `72/72`
- [ ] FIX-P1-048 green on GitHub Actions runners (`admin-fresh-db` job)
- [ ] Lock FIX-P0-011 only after remaining list closed

**Evidence:** `docs/plan/wave-3fb-clean-db-rls-proof.md` + `docs/plan/evidence/wave-3fb-*`  
**Verdict:** PARTIAL PASS — FIX-P0-011 **not locked**.

### 3F-C — Zero-policy classification then broader JWT matrix

- [x] Classify and close 6 zero-policy tables (`202608170001`) — see `docs/plan/evidence/wave-3fc-zero-policy-classification.json`
- [x] JWT Org A/B proof on those tables (`31/31` including vehicles sample)
- [x] Broaden PostgREST JWT deny matrix: drivers, duties, defects, attendance, equipment/stock/tyres/purchase — Command tables green (`202608170002`); see `wave-3fc-jwt-matrix.json`
- [x] `cost_control` classified as BFF/service-role boundary (`202608170003`): FORCE + revoke authenticated PostgREST; no JWT→GUC bind. JWT own-read is not an access path until 3G.
- [ ] Storage objects JWT deny sample
- [ ] Keep existing `test:tenant-isolation` green (API path)

### 3F-D — Structural same-company (FIX-P1-013)

- [x] Inventory dual-FK relationships missing `assert_same_company_pair` — see `docs/plan/evidence/wave-3fd-same-company-inventory.json`
- [x] First-wave triggers + service_role forge tests (`202608170004`) — duties, defects, drivers, runs, trip_assignments, duty_live_positions, vehicle_swap_requests, fuel_records
- [ ] Later-wave dual-FK tables (40+ inventoried residual)
- [ ] Storage objects JWT deny sample (explicit separate slice from FIX-P1-048)

### 3F-E — Fresh-DB CI gate (FIX-P1-048)

- [x] `scripts/fresh-db-gate.mjs` — cost_control bootstrap patch, reset, inventory assert, JWT + structural proofs
- [x] CI job `admin-fresh-db` in `.github/workflows/ci.yml`
- [x] Green run locally (17 Aug 2026)
- [ ] Green run on GitHub Actions main/PR

---

## Definition of done (Wave 3F lock)

1. Every `admin` import is allowlisted or routed through declared authority helpers.
2. Ordinary new domain modules cannot import bare `admin` without CI failure.
3. Clean migration inventory exists and matches hosted posture (or documented deltas).
4. Cross-tenant negative proof covers Command API (existing) **and** a documented PostgREST RLS sample set.
5. Same-company structural coverage plan executed for critical join pairs (or residual register accepted).
6. FIX-P0-011 / P1-012 acceptance checkboxes closed or residual risks waived in writing.

---

## Residual (out of band)

- CI Driver debug APK still bakes `example.supabase.co` — non-blocking for 3F; track separately for device builds.
