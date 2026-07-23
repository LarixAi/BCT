# Veyvio Multi-Tenant SaaS — Implementation Roadmap

Companion to [Multi-Tenant Readiness Audit](../architecture/12-multi-tenant-readiness-audit.md).

**Principle:** Tenant security before billing. Do not sell licences until Sprint 1 isolation is CI-proven.

SaaS Stripe is **placeholder mode** (`VEYVIO_SAAS_BILLING_MODE=placeholder`): Platform UI shows “Billing — coming later”; Checkout/webhook APIs return placeholder payloads and do not call Stripe. Driver PHV Stripe is untouched.

## Platform vocabulary (locked)

| Term | Meaning | Code |
|---|---|---|
| Veyvio Platform | Veyvio-owned control plane | `platform_users`, `/platform/*` → later `apps/platform-admin` |
| Organisation / Tenant | Licence buyer | `companies` |
| Workspace | Active company context | JWT `active_company_id` |

Canonical tenancy column: **`company_id`**. Product copy may say “organisation”; schema stays `company_*` until a deliberate rename epic.

## What is already built (do not rebuild)

- Multi-company memberships, invites (Command/Yard/Driver), `tenant_status`
- Isolation Org A/B seed + smoke script
- Hot-path company asserts + module entitlements on Command API
- `subscription_plans` / `plan_features` / `company_subscriptions` / overrides
- Platform Admin MVP inside Command (`/platform/companies|plans|audit`)
- Security Advisor hardening (function search_path, private `user_has_company`, RLS policy fill)

## Sprint 1 — Tenant hardening (NOW)

**Goal:** Prove Company A cannot touch Company B through API, RLS, storage, or joins.

1. ~~Close audit HIGH items (`notifications` company helper; join-table FK matrix).~~  
   - Migration `202607230006_sprint1_tenant_hardening.sql`: notifications + join RLS + same-company triggers; storage uses `private.user_has_company`.  
2. ~~Expand isolation tests: assign driver, link vehicle to duty/job, storage path, reports, RPC.~~  
   - `scripts/tenant-isolation-smoke.mjs` covers read/list/assign/create/defects/reports/storage.  
3. ~~Seed named tenants: Isolation Transport A/B Ltd (`seed-isolation.ts`) — never treat CoLoop as platform.~~  
4. ~~Add GitHub Actions job `tenant-isolation` calling `npm run test:tenant-isolation`~~  
   - Secrets: `VEYVIO_ANON_KEY` (required in CI), optional `VEYVIO_API_URL`, `VEYVIO_SUPABASE_URL`, `VEYVIO_PLATFORM_*`, `VEYVIO_ISOLATION_PASSWORD`.  
5. ~~Document PostgREST vs Command API trust boundary~~ — [`docs/architecture/13-postgrest-vs-command-api.md`](../architecture/13-postgrest-vs-command-api.md).

**Exit:** CI red if Org B reads Org A vehicle/driver/duty (and new matrix cases).

## Sprint 2 — Licensing foundation

**Goal:** Complete commercial data model without Stripe UI.

1. ~~Add `subscription_events`, `usage_limits`~~ — migration `202607230007`; billing customer stays `provider_customer_ref`.  
2. ~~Extract shared package `packages/entitlements` (`canUse`)~~ — used by Command, Yard, Driver; Edge copy at `_shared/entitlements-core.ts` (`npm run sync:edge --prefix packages/entitlements`).  
3. ~~Sync `tenant_status` from subscription SoT~~ — `applySubscriptionLifecycle` + `deriveTenantStatus`; Platform patches write `subscription_events`.  
4. Keep PHV Stripe in Driver separate forever.

**Exit:** `GET /api/company/entitlements` (and `/auth/me` / driver bootstrap) return plan, modules, tenant status, and usage limits.

## Sprint 3 — Platform Admin (productize)

**Goal:** Veyvio staff console, not operator Command.

1. ~~Expand `/platform/*`~~ — Customers, company detail (entitlements/events/limits), Subscriptions, Plans, Support, Feature flags, Audit, Health.  
2. Extract to `apps/platform-admin` later (same API) — deferred until console is battle-tested.  
3. ~~No org-admin role can access platform routes~~ — `PlatformProtectedRoute` + sidebar only for `platform_*` roles; API `requirePlatformRole`.

**Exit:** Suspend / restore / plan override / support grant are daily-driver tools.

## Sprint 4 — Purchase and onboarding

**Goal:** Self-serve licence purchase *after* Sprint 1 green.

1. Create account → company → plan → SaaS Stripe → owner membership → first depot → setup → Command.  
2. `PENDING_PAYMENT` / trial / past_due → `READ_ONLY` / `SUSPENDED`.  
3. Webhooks → `company_subscriptions` + `subscription_events`.

**Exit:** A new company can pay and land in an isolated workspace.

## Sprint 5 — Module and limit enforcement

**Goal:** Licence shape matches product surfaces.

1. Enforce maintenance, yard, reporting, multi_depot in API + UIs.  
2. Driver/vehicle seat limits from `usage_limits`.  
3. Soft-gate sidebar already started — finish route + Driver/Yard surfaces.

## Sprint 6 — Rebrand (parallel, low risk)

Gradually replace `@core-support/*`, Ridova leftovers, hardcoded company defaults with `@veyvio/*` and tenant-provided branding. **Not a blocker for Sprint 1.**

## Recommended next coding task

1. Fix `notifications` RLS to use `private.user_has_company(company_id)`.  
2. Add SQL audit script + CI isolation job.  
3. Expand `tenant-isolation-smoke.mjs` assign/link/storage cases.

Only then schedule Sprint 2 billing schema completion and Sprint 4 Stripe self-serve.
