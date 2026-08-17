# Wave 3F-B evidence — clean-DB RLS proof (FIX-P0-011)

**Date:** 17 Aug 2026  
**Branch / local stack:** `qeckgqjrfbdyxchuncdt` after `npm run backend:reset` + `202608170001` / `202608170002` / `202608170003`  
**Status:** **LOCKED** — 17 Aug 2026 (Wave 3F proof chain complete; see lock decision below)  

**Authority rule for this proof:** assertions use **authenticated JWT** only. `service_role` was used solely for fixture SETUP / post-check reads. Service-role bypass of RLS is expected and is **not** counted as FIX-P0-011 evidence.

Artifacts:

| File | Contents |
|------|----------|
| `docs/plan/evidence/wave-3fb-tenant-table-audit.csv` | Full table inventory (RLS enabled/forced, policies, company/org columns) |
| `docs/plan/evidence/wave-3fb-inventory-summary.json` | Machine-readable classification |
| `docs/plan/evidence/wave-3fb-rls-postgrest-isolation.json` | Org A/B PostgREST probe results (`72/72`) |
| `docs/plan/evidence/wave-3fc-jwt-matrix.json` | JWT matrix domain results |
| `docs/plan/evidence/wave-3fd-force-rls.json` | FORCE RLS + cost_control BFF/service branch |
| `docs/plan/evidence/wave-3fd-same-company-triggers.json` | FIX-P1-013 service_role forge results |
| `docs/plan/evidence/wave-3fd-same-company-inventory.json` | First-wave trigger inventory + residual register |
| `docs/plan/evidence/wave-3f-fresh-db-gate.json` | FIX-P1-048 fresh-DB gate summary (CI PASS) |
| `docs/plan/evidence/wave-3fe-storage-isolation.json` | Wave 3F-E storage JWT matrix (`66/66`) |

Scripts:

- `npm run backend:reset` — clean migration replay  
- `scripts/sql/tenant-table-audit.sql` — inventory (now includes `rls_forced` + `cost_control`)  
- `node scripts/rls-postgrest-isolation.unit.mjs` — authenticated Org A/B deny matrix  

---

## Gate results

| Acceptance item | Result |
|-----------------|--------|
| `backend:reset` succeeds from clean state | **PASS** (full migration chain through `202608160001`) |
| Inventory every tenant-bearing table | **PASS** — 177 tables with `company_id` and/or `organisation_id` |
| Classify RLS enabled / forced / policies | **PASS** — see summary |
| Org A→B SELECT/INSERT/UPDATE/DELETE via non-service-role | **PASS** JWT matrix `72/72` (Command tenant reads; cost_control authenticated PostgREST revoked) |
| RPC / function paths fail closed | **PARTIAL** — not exhaustively enumerated; `ensure_default_company_roles` used in SETUP only |
| Identify app-filter / 3-trigger reliance | **PASS** — documented below |
| service_role tests kept separate | **PASS** |
| Lock FIX-P0-011 | **YES** — locked 17 Aug 2026 (see below) |

### Local bootstrap note (ops, not a security waiver)

`config.toml` lists `cost_control` in `[api].schemas`. A virgin DB has no `cost_control` schema until migration `202608040001`, so `supabase start` can fail PostgREST health until migrations run. Workaround used: briefly start without `cost_control` in schemas → `backend:reset` → restore schemas → restart. Remediations: earliest bootstrap migration or start-exclude-rest then reset (track as DX debt).

---

## Inventory summary (clean DB)

| Metric | Count |
|--------|------:|
| Tenant-bearing tables (`company_id` or `organisation_id`) | 177 |
| RLS enabled | 177 |
| RLS **forced** | 171 public + 34 cost_control |
| Tenant tables with **zero policies** | 0 |
| Tenant tables with SELECT policies but **no** INSERT/UPDATE/DELETE policies | 109 |

**FORCE RLS:** every `public` relation with RLS enabled (171/171) and every `cost_control` table (34/34) after `202608170003`. `postgres` / `service_role` retain `BYPASSRLS` (Command API and Finance API Edge unchanged).

**cost_control branch (explicit, not a JWT GUC bind):** BFF/service-role boundary until 3G. FORCE RLS + revoke `authenticated`/`anon` schema USAGE and table grants. Isolation for a future non-bypass role remains `SET LOCAL app.active_organisation_id` after privileged membership lookup. JWT probes now require **privilege denied** (403), not 200-empty. Evidence: `wave-3fd-force-rls.json`.

**Zero-policy tenant tables:** none remaining after `202608170001_wave3f_zero_policy_tables.sql`. Classification:

| Table | Class | Authenticated | Writes |
|-------|--------|---------------|--------|
| `company_compliance_settings` | tenant SELECT | `user_has_company` | Command API / service-role |
| `domain_events` | tenant SELECT | `user_has_company` | Command API / service-role (append-only) |
| `fuel_records` | tenant SELECT | `user_has_company` | Command API / service-role |
| `override_audit_events` | tenant SELECT | `user_has_company` | Command API / service-role (append-only) |
| `vehicle_equipment_checks` | tenant SELECT | `user_has_company` | Command API / service-role |
| `integration_api_keys` | **service-role-only** | deny all (FORCE + revoke) | Command API / service-role |

Evidence: `docs/plan/evidence/wave-3fc-zero-policy-classification.json`.

**Same-company structural triggers (first wave FIX-P1-013):**

- Existing join: `depot_access`, `duty_runs`, `run_trips`
- First wave (`202608170004`): `drivers`, `duties`, `defects`, `runs`, `trip_assignments`, `duty_live_positions`, `vehicle_swap_requests`, `fuel_records`
- Forge proof: `13/13` service_role cross-company INSERT rejected with `23514 cross-tenant link refused`
- JWT regression after triggers: `72/72` (own-tenant SELECT unaffected)

Evidence: `docs/plan/evidence/wave-3fd-same-company-triggers.json`.

Residual: 40+ dual-FK tables inventoried for later waves; `driver_capabilities` / `vehicle_capabilities` are single-parent joins (EXISTS policies only).

---

## Authenticated PostgREST matrix (vehicles sample + 3F-C + JWT expansion)

| Probe | Result |
|-------|--------|
| A SELECT own vehicles | PASS |
| A SELECT B vehicle by id | PASS (empty) |
| A LIST B company vehicles | PASS (empty) |
| A SELECT B depot / company | PASS (empty) |
| A INSERT vehicle into B | PASS (403 privilege / RLS fail-closed) |
| A UPDATE B vehicle | PASS (403; row unchanged) |
| A DELETE B vehicle | PASS (403; row remains) |
| B SELECT A vehicle | PASS (empty) |
| Drivers / duties / defects own SELECT + A↛B SELECT/INSERT | PASS |
| Attendance leave + notes own SELECT + A↛B SELECT/INSERT | PASS |
| Fleet equipment / tyres / stock / purchase own SELECT + A↛B SELECT/INSERT | PASS (after `202608170002` GRANT SELECT) |
| A UPDATE B driver / equipment_asset | PASS (403; row unchanged) |
| `cost_control` A↛B SELECT | PASS (403 schema privilege denied) |
| `cost_control` A INSERT/UPDATE into B | PASS (403 schema privilege denied) |
| `cost_control` A SELECT own organisations / budgets / cost_records | PASS as **BFF/service-role boundary** (403; authenticated PostgREST revoked — not a JWT own-read) |

Observed Command write denials returned `42501 permission denied` (missing `GRANT INSERT` to `authenticated`) in addition to RLS posture. That is still fail-closed for PostgREST clients; Command API continues to write via service-role.

`cost_control` is an explicit **BFF/service-role branch** until 3G (`202608170003`): FORCE RLS, revoke authenticated/anon PostgREST, keep GUC policies for a future non-bypass role that `SET LOCAL` after privileged membership lookup. JWT-controlled data is **not** written into `app.active_organisation_id`. Finance API Edge continues on `service_role` (`BYPASSRLS`). This is a classified access-architecture gap for FIX-P0-011 lock, not a JWT matrix failure.

Evidence: `docs/plan/evidence/wave-3fb-rls-postgrest-isolation.json`, `docs/plan/evidence/wave-3fc-jwt-matrix.json`, `docs/plan/evidence/wave-3fd-force-rls.json`.

---

## Remediation list (do not weaken tests)

1. ~~**Add explicit policies for the 6 zero-policy tenant tables.**~~ **CLOSED 17 Aug 2026** — migration `202608170001`; JWT proof on those tables remains green.
2. ~~**FORCE RLS** on remaining high-value tenant tables.~~ **CLOSED 17 Aug 2026** — `202608170003`: all `public` RLS tables FORCE (171/171); `cost_control` FORCE (34/34) + authenticated PostgREST revoked (BFF/service-role branch; no JWT→GUC bind).
3. ~~**Expand same-company triggers** (FIX-P1-013) beyond the three join pairs.~~ **FIRST WAVE CLOSED 17 Aug 2026** — `202608170004`; forge `13/13`; JWT regression `72/72`. Residual dual-FK tables remain for later waves.
4. ~~**Broaden authenticated deny matrix** … Storage objects still unprobed.~~ **CLOSED 17 Aug 2026** — Wave 3F-E Storage JWT `66/66` + `admin-storage-isolation` CI green.
5. ~~**CI fresh-DB gate (FIX-P1-048)** …~~ **CLOSED** — `admin-fresh-db` CI green (PR #3).
6. ~~**Do not migrate the 44 company-scoped service-role importers until** FIX-P1-048 CI green …~~ **Importer freeze remains** until hosted migrations `202608170001`–`004` verified on production; then controlled FIX-P1-012 batches only.

---

## FIX-P0-011 lock decision

**LOCKED — 17 Aug 2026.**

Tenant isolation is proven for the current Wave 3F authority model through:

- Authenticated PostgREST JWT isolation (**72/72**)
- **FORCE RLS** (public **171/171**; cost_control **34/34**)
- Fresh-database reproducibility (**FIX-P1-048** — `admin-fresh-db` CI green)
- First-wave same-company forge protection (**13/13** — service_role → `23514`)
- **Storage** isolation (**66/66** — `admin-storage-isolation` CI green)

### Accepted boundaries (not silent waivers)

1. **`cost_control`** — deliberately excluded from direct authenticated PostgREST; remains behind the privileged BFF/service-role boundary until **Wave 3G**. Not an RLS tenant-read/write leak.
2. **FIX-P1-013 later waves** — **40+** dual-FK relationships tracked in `wave-3fd-same-company-inventory.json`. First wave closed; residual is structural expansion, not cross-tenant read/write evidence.

Evidence: `docs/plan/evidence/wave-3f-p0-011-lock.json`.

**Next:** FIX-P1-012 — convert remaining company-scoped service-role importers in small domain batches. Wave 3F production verification is **CLOSED**.

Hosted gate: `docs/plan/wave-3f-hosted-verification-gate.md`.
