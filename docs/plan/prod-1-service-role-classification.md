# PROD-1 — Service-role call-path classification

**Status:** Classification locked; **Wave 3F LOCKED** (21 Aug 2026) — authenticated ordinary CRUD on UserScopedDb + RLS via `resolveTenantDb` / ALS; residual Type B + JWT-less fallback inventoried  
**Date:** 21 August 2026  
**Programme baseline:** `aa02c1930d288e09e38bbea76b13f386d6435686` (PR #20 / Batch 11 merge)  
**Classification SHA:** `9f5001851214bc009a38d858160ea32c7eb9aefb` (`prod0-phase0-authority-20260817`)  
**Branch:** `production-stabilisation/2026`  
**Authority:** [veyvio-production-readiness-blueprint.md](./veyvio-production-readiness-blueprint.md) tracks PR-02 / PROD-1  
**Static gate (extend, do not rebuild):** `Veyvio admin /scripts/service-role-allowlist.unit.mjs`  
**CI reliability (separate from wraps):** [prod-1-ci-reliability.md](./prod-1-ci-reliability.md)

| Counter | Value |
|---------|--------|
| Transitional importers (`company_scoped_service_role`) | **0** |
| Ordinary tenant tables through UserScopedDb + RLS | **95** (22 INSERT-only + 69 INSERT/UPDATE + 3 SELECT/UPDATE + 1 SELECT-only `users`; membership JWT) |
| Wave 3F | **LOCKED** (21 Aug 2026) |
| Batch 11 (`notifications`) | **accepted** — authority declaration only; F-29 holds |

Hosted proof (21 Aug 2026): migrations through `202608190096`; `resolveTenantDb` + shared ALS on Edge helpers; `command-api` deployed (`…_230`); `npm test` green; `test:tenant-isolation` green. Residual privilege inventory is below §5ck — Type B named capabilities + JWT-less `resolveTenantDb` fallback for cron/companyId-only callers + interest intake + support grants. Do **not** start Wave 3G until Gate A.

The original register below listed **31** remaining modules at classification time. Batches 01–11 wrapped thirteen modules (see §5a). Protected-last and master-data cutovers 56–96 cleared the transitional allowlist.

---

## 1. What “conversion” can mean right now

`userScopedDb()` in `_shared/db-authority.ts` returns a JWT-bound PostgREST client. Authenticated writes are still fail-closed **except** tables with an explicit cutover migration (currently `duty_closeouts`, `driver_job_execution_events`, `fuel_records`, `adblue_records`, `vehicle_swap_requests`, `vehicle_equipment_checks`, `journey_sequence_acknowledgements`, `vehicle_reports`, `incidents`, `operational_exceptions`, `purchase_requests`, `equipment_assets`, `tyre_assets`, `depot_stock_items`, `equipment_asset_events`, `tyre_asset_events`, `depot_stock_movements`, `fuel_cards`, `fuel_card_events`, `stock_transfers`, `vehicle_consumable_levels`, `company_compliance_settings`, `operational_exception_events`, `vehicle_report_status_history`, `vehicle_report_evidence`, `journey_stops`, `notifications`, `runs`, `defects`, `yard_movements`, `vor_cases`, `driver_app_devices`, `duty_acknowledgements`, `attendance_day_overrides`, `duty_assignment_events`, `driver_training`, `interest_submissions`, `attendance_leave_requests`, `attendance_leave_audit`, `attendance_notes`, `attendance_return_to_work`, `company_holiday_defaults`, `driver_holiday_profiles`, `holiday_ledger_entries`, `holiday_pay_records`, `driver_requirements`, `driver_requirement_requests`, `override_audit_events`, `domain_events`, `audit_events`, `trip_assignments`, `duties`, `run_trips`, `duty_runs`, `runs`). FIX-P0-011 remains locked for the SELECT-only fleet matrix file (`202608170002`); later cutovers add writes only via allowlisted migrations. Support-grant sessions are **not** UserScopedDb (membership RLS cannot authorize a non-member JWT).

The wrap pattern (fuel-records, journey-sequence-ack, …) is still valid for remaining allowlisted modules until they are cut over:

```text
import { admin } from './supabase.ts'
        ↓
companyScopedServiceDb(context, reason)
  or
companyScopedServiceDbForCompany(companyId, reason)
```

That removes the file from the allowlist (the scanner keys on bare `admin` imports). It does **not** yet put ordinary CRUD on RLS.

| Stage | Meaning | Allowlist effect |
|-------|---------|------------------|
| **Wrap** | Replace bare `admin` with `companyScopedServiceDb*` | Module leaves `company_scoped_service_role` |
| **RLS cutover** | `userScopedDb` → PostgreSQL RLS | Additive GRANT + policy per table; cutovers 1–55 including `incidents`/`runs`/`vor_cases` (SELECT/UPDATE, no JWT INSERT), recipient-scoped `notifications` INSERT, append-only event tables, `driver_training` / `interest_submissions` SIU, and fleet / depot / compliance / vehicle-report / journey_stops / attendance / duty ack tables via later migrations |
| **Named capability** | `auditWriter` / `storageSigner` / … | Required for Type B before Wave 3F closes |

PROD-1 batches below are the **historical wrap sequence**. Do not claim Wave 3F closed when the wrap counter hits 0. ADR-PR-002 still requires named capabilities for retained privilege, and ADR-PR-001 still requires RLS for ordinary tenant data.

Callees may keep using `admin` while a caller is wrapped. Previous wraps already depend on unwrapped `audit-service` and `domain-events`. Fan-in does **not** block a leaf wrap.

---

## 2. Dependency verdict on the original PROD-1A–F groups

Do **not** mechanically follow the product grouping as PR boundaries.

| Original group | Verdict |
|----------------|---------|
| **PROD-1A** Driver identity | Cohesive product-wise, **not** a single PR. `attendance` (1095 loc, self-auth) + `holiday-balance` (1434 loc, self-auth) is too large. Four of six call `notifications`. |
| **PROD-1B** Driver execution | Mixes small leaves (`duty-closeout`, `driver-job-execution`) with a hub (`duty-publication`, 4 importers including `driver-write-guards`). |
| **PROD-1C** Compliance | `body-condition` is a large self-auth leaf; `compliance-engine` / `defect-automation` / `document-expiry-notifications` are small. Split. |
| **PROD-1D** Operations | `hubs` is an independent leaf. `operational-trip-assign` depends on `duty-publication` + `override-audit` + `projections`. `yard-mutation-handlers` depends on `defect-automation`. |
| **PROD-1E** Notifications | Hubs. Wrap after leaves, or wrap `notifications` as a helper once several leaves are green. `fcm-send` has **no** `company_id` filter on `driver_devices` — classify before wrapping as Type A. |
| **PROD-1F** Authority-sensitive | Confirmed last. `entitlements` is imported by `_shared/supabase.ts` (every authenticated request). `application-scopes` is request authz. `command-api/index` has 316 `admin` uses, `admin.auth.admin`, and `admin.storage`. |

---

## 3. Fan-in (who imports the module)

Blast radius if the wrap regresses.

| Fan-in | Modules |
|--------|---------|
| **17** | `audit-service` |
| **10** | `notifications` |
| **9** | `domain-events` |
| **4** | `entitlements` (includes `supabase.ts`, `tenant-guards.ts`, `platform-admin.ts`), `duty-publication` |
| **3** | `projections`, `override-audit`, `driver-ops-notifications` |
| **2** | `compliance-engine`, `defect-automation`, `driver-training-centre`, `operational-exceptions` |
| **1 (command-api only)** | `application-scopes`, `attendance`, `body-condition`, `document-expiry-notifications`, `driver-activation-release`, `driver-devices`, `driver-job-execution`, `driver-requirements`, `duty-closeout`, `holiday-balance`, `hubs`, `interest-submissions`, `journey-handlers`, `journey-sequence-move`, `operational-trip-assign`, `vehicle-reports`, `yard-mutation-handlers` |
| **1 (helper only)** | `fcm-send` ← `driver-ops-notifications` |
| **0** | `command-api/index` (root) |

---

## 4. Module register

**Wrap helper:** `ctx` = already has `RequestContext` → `companyScopedServiceDb`. `cid` = takes `companyId` → `companyScopedServiceDbForCompany`. `self-auth` = calls `authenticate` internally — thread context or keep authenticate then wrap.

| # | Module | loc | Class | Wrap helper | Fan-in | Depends on (remaining 31) | Notes |
|---|--------|-----|-------|-------------|--------|---------------------------|-------|
| 1 | `duty-closeout` | 113 | **A leaf** | cid | 1 | audit-service, domain-events | One table `duty_closeouts`. First wrap. |
| 2 | `driver-job-execution` | 147 | **A leaf** | cid | 1 | domain-events | One table. Same shape as closeout. |
| 3 | `document-expiry-notifications` | 71 | **A leaf** | cid | 1 | notifications | Read `drivers` + notify. Tiny. |
| 4 | `compliance-engine` | 178 | **A leaf** | cid | 2 | — | Reads `company_compliance_settings`. Also imported by `rules-engine` (not on allowlist). |
| 5 | `defect-automation` | 133 | **A leaf** | cid | 2 | operational-exceptions | Writes/raises exceptions. Wrap before yard mutations. |
| 6 | `driver-devices` | 387 | **A leaf** | self-auth | 1 | — | Tenant devices + direct `audit_events` insert (not via audit-service). |
| 7 | `driver-activation-release` | 199 | **A leaf** | cid | 1 | notifications | Activation path. |
| 8 | `vehicle-reports` | 234 | **A leaf** | ctx | 1 | audit-service, domain-events | Matches fuel-records wrap style. |
| 9 | `hubs` | 607 | **A leaf** | cid | 1 | — | Read projections; already-wrapped stock/tyres/equipment callees. |
| 10 | `journey-sequence-move` | 409 | **A leaf** | cid | 1 | audit-service | Same family as already-wrapped sequence-ack/reorder. |
| 11 | `journey-handlers` | 486 | **A leaf** | ctx | 1 | audit-service, domain-events | |
| 12 | `yard-mutation-handlers` | 603 | **A leaf** | ctx | 1 | defect-automation | After defect-automation wrap. |
| 13 | `driver-training-centre` | 895 | **A leaf** | self-auth | 2 | notifications | Imported by driver-requirements. Wrap before requirements. |
| 14 | `driver-requirements` | 669 | **A leaf** | self-auth | 1 | training-centre, notifications | After training-centre. |
| 15 | `attendance` | 1095 | **A leaf** | self-auth | 1 | — | Large. Own PR. |
| 16 | `holiday-balance` | 1434 | **A leaf** | self-auth | 1 | notifications | Large. Own PR. |
| 17 | `body-condition` | 880 | **A leaf** | self-auth | 1 | — | Large. Own PR. |
| 18 | `operational-exceptions` | 408 | **A hub** | cid | 2 | audit-service | Needed by defect-automation. Wrap with or before defect-automation. |
| 19 | `driver-ops-notifications` | 236 | **A hub** | cid | 3 | fcm-send, notifications | After notifications/fcm classification. |
| 20 | `operational-trip-assign` | 376 | **A** | ctx | 1 | duty-publication, override-audit, projections | After those three. |
| 21 | `duty-publication` | 1259 | **A hub** | ctx | 4 | domain-events, driver-ops-notifications, override-audit | Includes `driver-write-guards` importer. Own PR. |
| 22 | `projections` | 3210 | **A hub** | cid | 3 | — | 29 tables, 71 `admin` tokens. Dispatch gates already wrapped. Own PR. |
| 23 | `notifications` | 168 | **A hub / notify** | cid | 10 | — | Company-scoped inserts + admin-role fan-out. Wrap as helper after first leaves. |
| 24 | `audit-service` | 45 | **B capability** | named `auditWriter` | 17 | — | Append-only `audit_events`. Do not leave as generic admin. |
| 25 | `domain-events` | 34 | **B capability** | named `domainEventWriter` | 9 | — | Append-only `domain_events`. |
| 26 | `override-audit` | 96 | **B capability** | named or A wrap | 3 | audit-service, domain-events | Append-only `override_audit_events`. |
| 27 | `fcm-send` | 191 | **B / review** | named `pushSender` | 1 | — | Reads `driver_devices` with **zero** `company_id` eq. Push credential path. Not Type A CRUD. |
| 28 | `interest-submissions` | 938 | **A mixed** | ctx | 1 | audit-service, notifications | Also `integration_api_keys`, RPC `next_interest_reference`, booking/customer writes. Treat as late mixed domain. |
| 29 | `application-scopes` | 151 | **Authority** | last | 1 | — | Every-request authz via `membership_application_access`. |
| 30 | `entitlements` | 153 | **Authority / B** | last | 4 | — | Imported by `supabase.ts` authenticate. Reads `plan_features` (platform) + company subscription. Split platform vs tenant before wrap. |
| 31 | `command-api/index` | 12044 | **Root mixed** | last | 0 | almost all of the above | Bare `admin` + **Auth Admin** + **Storage**. Split Type A route handlers from Type B (`auth.admin`, `storage.from`) into named capabilities. Do not wrap as one PR. |

---

## 5. Dependency-directed wrap order

```text
Batch 01  duty-closeout + driver-job-execution + document-expiry-notifications
                │
                ▼
Batch 02  compliance-engine + operational-exceptions + defect-automation
                │
                ▼
Batch 03  driver-devices + driver-activation-release + vehicle-reports + hubs
                │
                ▼
Batch 04  journey-sequence-move + journey-handlers
                │
                ▼
Batch 05  yard-mutation-handlers
                │
                ▼
Batch 06  driver-training-centre → driver-requirements
                │
                ▼
Batch 07  attendance          (own PR)
Batch 08  holiday-balance     (own PR)
Batch 09  body-condition      (own PR)
                │
                ▼
Batch 10  notifications  (helper; 10 importers)
          then driver-ops-notifications
                │
                ▼
Batch 11  override-audit + duty-publication
                │
                ▼
Batch 12  projections         (own PR)
                │
                ▼
Batch 13  operational-trip-assign
                │
                ▼
Batch 14  named capabilities: audit-service, domain-events, fcm-send
                │
                ▼
Batch 15  interest-submissions
                │
                ▼
Batch 16  application-scopes + entitlements split
                │
                ▼
Batch 17  command-api/index  (decompose; AuthAdmin + StorageSigner + remaining Type A)
```

The tree above is the **classification-time** dependency order. Execution refined it to one-module PRs after Batch 01. Do not restart from this tree as if Batches 01–11 had not landed. Classification-time “Batch 11” (`override-audit` + `duty-publication`) is **not** the executed Batch 11.

## 5a. Executed wraps (authority declaration only)

| Batch | Module(s) | PR | Merge |
|-------|-----------|----|-------|
| 01 | `duty-closeout`, `driver-job-execution`, `document-expiry-notifications` | #5 | `d3378a9` |
| 02 | `compliance-engine` | #6 | `d3e7886` |
| 03 | `defect-automation` | #7 | `29b92bb` |
| 04 | `vehicle-reports` | #8 | `d937056` |
| 05 | `driver-activation-release` | #9 | `b417667` |
| 06 | `journey-sequence-move` | #15 | `2a87de5` |
| 07 | `journey-handlers` | #16 | `9404e9f` |
| 08 | `hubs` | #17 | `6a3a05b` |
| 09 | `yard-mutation-handlers` | #18 | `9b5368d` |
| 10 | `operational-exceptions` | #19 | `d52000e` |
| 11 | `notifications` | #20 | `aa02c19` (**closed**) |

Batch 11 wrapped the helper only. Company-scoped admin-role fan-out and `company_id` inserts stay intact. Callers remain unchanged. **F-29** still holds: notifications do not create business state.

Still deferred at classification time: protected-last. Those are now cut over (see §5be–5cn). Residual Wave 3F privilege is named `projectionReader` + Type B allowlist — not another wrap batch.

**Next work is not another wrap.** Protected-last (`application-scopes`, `entitlements`, `body-condition`, `command-api/index`) are off the transitional allowlist (0 `company_scoped_service_role` importers). Remaining Wave 3F work is residual privilege: thread RequestContext into JWT-less projection callers, keep named capabilities owned/tested, then mark Wave 3F LOCKED when ordinary CRUD privilege bypasses are truly zero.

---

## 5b. RLS cutover 1 — `duty_closeouts`

| Field | Value |
|-------|--------|
| Module | `_shared/duty-closeout.ts` (already wrapped in Batch 01; not on the 18-list) |
| Table | `public.duty_closeouts` |
| Migration | `202608190001_wave3f_duty_closeouts_user_scoped.sql` |
| Authority | Membership: `userScopedDb`. Support-grant: `companyScopedServiceDb` (documented exception — membership RLS cannot authorize support JWTs). |
| Privileged side effects | `writeImmutableAudit` / `emitDomainEvent` remain service-role |
| Proof | Static grant allowlist (`wave3f-user-scoped-cutover-grants.unit.mjs`); JWT matrix INSERT own/foreign/anon in `rls-postgrest-isolation.unit.mjs` |

Hosted proof requires applying the migration and deploying `command-api` before treating production Command closeouts as RLS-backed.

---

## 5c. RLS cutover 2 — `driver_job_execution_events`

| Field | Value |
|-------|--------|
| Module | `_shared/driver-job-execution.ts` (already wrapped in Batch 01; not on the 18-list) |
| Table | `public.driver_job_execution_events` |
| Migration | `202608190002_wave3f_driver_job_execution_events_user_scoped.sql` |
| Authority | Membership: `userScopedDb`. Support-grant: `companyScopedServiceDb` (documented exception — membership RLS cannot authorize support JWTs). |
| Privileged side effects | `emitDomainEvent` remains service-role |
| Proof | Static grant allowlist (`wave3f-user-scoped-cutover-grants.unit.mjs`); JWT matrix INSERT own/foreign/anon in `rls-postgrest-isolation.unit.mjs` |

Hosted proof requires applying the migration and deploying `command-api` before treating production Command fuel writes as RLS-backed.

---

## 5d. RLS cutover 3 — `fuel_records`

| Field | Value |
|-------|--------|
| Module | `_shared/fuel-records.ts` (already wrapped; not on the 18-list) |
| Table | `public.fuel_records` |
| Migration | `202608190003_wave3f_fuel_records_user_scoped.sql` |
| Authority | Membership: `userScopedDb`. Support-grant: `companyScopedServiceDb`. |
| Privileged side effects | Vehicle lookup, `vehicle_reports` mirror, audit, domain events remain service-role |
| Proof | Static grant allowlist; JWT matrix INSERT own/foreign/anon in `rls-postgrest-isolation.unit.mjs` |

---

## 5e. RLS cutover 4 — `adblue_records`

| Field | Value |
|-------|--------|
| Module | `_shared/adblue-records.ts` |
| Table | `public.adblue_records` |
| Migration | `202608190004_wave3f_adblue_records_user_scoped.sql` |
| Authority | Membership: `userScopedDb`. Support-grant: `companyScopedServiceDb`. |
| Privileged side effects | Vehicle/driver lookup in `command-api` remains service-role |
| Proof | Static grant allowlist; JWT matrix INSERT own/foreign/anon |

---

## 5f. RLS cutover 5 — `vehicle_swap_requests`

| Field | Value |
|-------|--------|
| Module | `_shared/vehicle-swap-workflow.ts` |
| Table | `public.vehicle_swap_requests` |
| Migration | `202608190005_wave3f_vehicle_swap_requests_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/INSERT/UPDATE). Support-grant: `companyScopedServiceDb`. |
| Privileged side effects | `duties.vehicle_id` on approve, audit, events, notifications remain service-role |
| Proof | Static grant allowlist (INSERT+UPDATE pattern); JWT matrix INSERT own/foreign/anon |

---

## 5g. RLS cutover 6 — `vehicle_equipment_checks`

| Field | Value |
|-------|--------|
| Module | `_shared/vehicle-equipment-checks.ts` |
| Table | `public.vehicle_equipment_checks` |
| Migration | `202608190006_wave3f_vehicle_equipment_checks_user_scoped.sql` |
| Authority | Membership: `userScopedDb`. Support-grant: `companyScopedServiceDb`. |
| Privileged side effects | None in this module |
| Proof | Static grant allowlist; JWT matrix INSERT own/foreign/anon |

Hosted proof for cutovers 4–6 requires applying those migrations and deploying `command-api`.

---

## 5h. RLS cutover 7 — `journey_sequence_acknowledgements`

| Field | Value |
|-------|--------|
| Module | `_shared/journey-sequence-ack.ts` |
| Table | `public.journey_sequence_acknowledgements` |
| Migration | `202608190007_wave3f_journey_sequence_acknowledgements_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/INSERT/UPDATE). Support-grant: `companyScopedServiceDb`. |
| Privileged side effects | Duty/run/`duty_runs` lookups stay service-role; audit + driver notify stay privileged |
| Proof | Static grant allowlist; JWT matrix INSERT/UPDATE own/foreign/anon |

---

## 5i. RLS cutover 8 — `vehicle_reports`

| Field | Value |
|-------|--------|
| Module | `_shared/vehicle-reports.ts` (already wrapped in Batch 04; not on the 18-list) |
| Table | `public.vehicle_reports` |
| Migration | `202608190008_wave3f_vehicle_reports_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/INSERT/UPDATE). Support-grant: `companyScopedServiceDb`. |
| Privileged side effects | Vehicles, `vehicle_report_evidence`, `vehicle_report_status_history`, audit, events remain service-role |
| Proof | Static grant allowlist; JWT matrix INSERT/UPDATE own/foreign/anon |

Hosted proof requires applying the migration and deploying `command-api`.

---

## 5j. RLS cutover 9 — `incidents`

| Field | Value |
|-------|--------|
| Module | `_shared/incident-workflow.ts` |
| Table | `public.incidents` |
| Migration | `202608190009_wave3f_incidents_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/UPDATE). Support-grant: `companyScopedServiceDb`. Creates stay service-role (no authenticated INSERT). |
| Privileged side effects | Depot lookup stays service-role; audit / events / notify stay privileged |
| Proof | Static grant allowlist; JWT matrix SELECT/UPDATE own, INSERT denied, foreign deny |

---

## 5k. RLS cutover 10 — `operational_exceptions`

| Field | Value |
|-------|--------|
| Module | `_shared/operational-exceptions.ts` |
| Table | `public.operational_exceptions` |
| Migration | `202608190010_wave3f_operational_exceptions_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/INSERT/UPDATE). Support-grant: `companyScopedServiceDb`. Defect automation without JWT: `companyScopedServiceDbForCompany`. |
| Privileged side effects | `operational_exception_events`, users, depots stay service-role; audit stays privileged |
| Proof | Static grant allowlist; JWT matrix INSERT/UPDATE own/foreign/anon |

---

## 5l. RLS cutover 11 — `purchase_requests`

| Field | Value |
|-------|--------|
| Module | `_shared/purchase-requests.ts` |
| Table | `public.purchase_requests` |
| Migration | `202608190011_wave3f_purchase_requests_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/INSERT/UPDATE). Support-grant: `companyScopedServiceDb`. Hub list without JWT: `companyScopedServiceDbForCompany`. |
| Privileged side effects | Vehicles / depots lookups stay service-role; audit stays privileged |
| Proof | Static grant allowlist; JWT matrix INSERT/UPDATE own/foreign/anon. `202608170002` unchanged (SELECT-only). |

---

## 5m. RLS cutover 12 — `equipment_assets`

| Field | Value |
|-------|--------|
| Module | `_shared/equipment-assets.ts` |
| Table | `public.equipment_assets` |
| Migration | `202608190012_wave3f_equipment_assets_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/INSERT/UPDATE). Support-grant: `companyScopedServiceDb`. Hub/projection/Yard without JWT: `companyScopedServiceDbForCompany`. |
| Privileged side effects | `equipment_asset_events`, vehicles, depots stay service-role; audit stays privileged |
| Proof | Static grant allowlist; JWT matrix INSERT/UPDATE own/foreign/anon. `202608170002` unchanged (SELECT-only). |

---

## 5n. RLS cutover 13 — `tyre_assets`

| Field | Value |
|-------|--------|
| Module | `_shared/tyre-assets.ts` |
| Table | `public.tyre_assets` |
| Migration | `202608190013_wave3f_tyre_assets_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/INSERT/UPDATE). Support-grant: `companyScopedServiceDb`. Hub list without JWT: `companyScopedServiceDbForCompany`. |
| Privileged side effects | `tyre_asset_events`, vehicles, depots stay service-role; audit stays privileged |
| Proof | Static grant allowlist; JWT matrix INSERT/UPDATE own/foreign/anon. `202608170002` unchanged (SELECT-only). |

---

## 5o. RLS cutover 14 — `depot_stock_items`

| Field | Value |
|-------|--------|
| Module | `_shared/depot-stock.ts` |
| Table | `public.depot_stock_items` |
| Migration | `202608190014_wave3f_depot_stock_items_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/INSERT/UPDATE). Support-grant: `companyScopedServiceDb`. Hub/Yard without JWT: `companyScopedServiceDbForCompany`. |
| Privileged side effects | Movements, fuel cards, stock transfers, vehicles, depots, consumable levels stay service-role; audit stays privileged |
| Proof | Static grant allowlist; JWT matrix INSERT/UPDATE own/foreign/anon. `202608170002` unchanged (SELECT-only). |

---

## 5p. RLS cutover 15 — `equipment_asset_events`

| Field | Value |
|-------|--------|
| Module | `_shared/equipment-assets.ts` |
| Table | `public.equipment_asset_events` |
| Migration | `202608190015_wave3f_equipment_asset_events_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/INSERT, append-only). Support-grant / no JWT: `companyScopedServiceDb*`. |
| Privileged side effects | Vehicles / depots lookups stay service-role; audit stays privileged |
| Proof | Static grant allowlist; JWT matrix INSERT own/foreign/anon. `202608170002` unchanged (SELECT-only). |

---

## 5q. RLS cutover 16 — `tyre_asset_events`

| Field | Value |
|-------|--------|
| Module | `_shared/tyre-assets.ts` |
| Table | `public.tyre_asset_events` |
| Migration | `202608190016_wave3f_tyre_asset_events_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/INSERT, append-only). Support-grant / no JWT: `companyScopedServiceDb*`. |
| Privileged side effects | Vehicles / depots lookups stay service-role; audit stays privileged |
| Proof | Static grant allowlist; JWT matrix INSERT own/foreign/anon. `202608170002` unchanged (SELECT-only). |

---

## 5r. RLS cutover 17 — `depot_stock_movements`

| Field | Value |
|-------|--------|
| Module | `_shared/depot-stock.ts` |
| Table | `public.depot_stock_movements` |
| Migration | `202608190017_wave3f_depot_stock_movements_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/INSERT, append-only). Support-grant / no JWT: `companyScopedServiceDb*`. |
| Privileged side effects | Fuel cards, transfers, vehicles, depots, consumable levels stay service-role; audit stays privileged |
| Proof | Static grant allowlist; JWT matrix INSERT own/foreign/anon. `202608170002` unchanged (SELECT-only). |

---

## 5s. RLS cutover 18 — `fuel_cards`

| Field | Value |
|-------|--------|
| Module | `_shared/depot-stock.ts` |
| Table | `public.fuel_cards` |
| Migration | `202608190018_wave3f_fuel_cards_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/INSERT/UPDATE). Support-grant / no JWT: `companyScopedServiceDb*`. |
| Privileged side effects | `fuel_card_events`, vehicles, transfers, consumable levels stay service-role; audit stays privileged |
| Proof | Static grant allowlist; JWT matrix INSERT/UPDATE own/foreign/anon. Not in `202608170002` fleet matrix. |

---

## 5t. RLS cutover 19 — `fuel_card_events`

| Field | Value |
|-------|--------|
| Module | `_shared/depot-stock.ts` |
| Table | `public.fuel_card_events` |
| Migration | `202608190019_wave3f_fuel_card_events_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/INSERT, append-only). Support-grant / no JWT: `companyScopedServiceDb*`. |
| Privileged side effects | Vehicles, transfers, consumable levels stay service-role; audit stays privileged |
| Proof | Static grant allowlist; JWT matrix INSERT own/foreign/anon. Not in `202608170002` fleet matrix. |

---

## 5u. RLS cutover 20 — `stock_transfers`

| Field | Value |
|-------|--------|
| Module | `_shared/depot-stock.ts` |
| Table | `public.stock_transfers` |
| Migration | `202608190020_wave3f_stock_transfers_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/INSERT/UPDATE). Support-grant / no JWT: `companyScopedServiceDb*`. |
| Privileged side effects | Depot name lookups stay service-role; audit stays privileged |
| Proof | Static grant allowlist; JWT matrix INSERT/UPDATE own/foreign/anon. Not in `202608170002` fleet matrix. |

---

## 5v. RLS cutover 21 — `vehicle_consumable_levels`

| Field | Value |
|-------|--------|
| Module | `_shared/depot-stock.ts` |
| Table | `public.vehicle_consumable_levels` |
| Migration | `202608190021_wave3f_vehicle_consumable_levels_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/INSERT/UPDATE). Support-grant / no JWT: `companyScopedServiceDb*`. |
| Privileged side effects | Vehicle lookups stay service-role; audit stays privileged |
| Proof | Static grant allowlist; JWT matrix INSERT/UPDATE own/foreign/anon. Not in `202608170002` fleet matrix. |

---

## 5w. RLS cutover 22 — `company_compliance_settings`

| Field | Value |
|-------|--------|
| Module | `_shared/compliance-engine.ts` |
| Table | `public.company_compliance_settings` |
| Migration | `202608190022_wave3f_company_compliance_settings_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/INSERT/UPDATE). Support-grant: `companyScopedServiceDb`. No-JWT evaluate: `companyScopedServiceDbForCompany`. |
| Privileged side effects | None on this table; dispatch gate reads remain separate |
| Proof | Static grant allowlist; JWT matrix UPDATE/INSERT own/foreign/anon. Extends `202608170001` SELECT. |

---

## 5x. RLS cutover 23 — `operational_exception_events`

| Field | Value |
|-------|--------|
| Module | `_shared/operational-exceptions.ts` |
| Table | `public.operational_exception_events` |
| Migration | `202608190023_wave3f_operational_exception_events_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/INSERT, append-only). Support-grant / no JWT: `companyScopedServiceDb*`. |
| Privileged side effects | Users / depots lookups stay service-role; audit stays privileged |
| Proof | Static grant allowlist; JWT matrix INSERT own/foreign/anon. |

---

## 5y. RLS cutover 24 — `vehicle_report_status_history`

| Field | Value |
|-------|--------|
| Module | `_shared/vehicle-reports.ts` |
| Table | `public.vehicle_report_status_history` |
| Migration | `202608190024_wave3f_vehicle_report_status_history_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/INSERT, append-only). Support-grant: `companyScopedServiceDb`. |
| Privileged side effects | Vehicles stay service-role; audit / domain events stay privileged |
| Proof | Static grant allowlist; JWT matrix INSERT own/foreign/anon. |

---

## 5z. RLS cutover 25 — `vehicle_report_evidence`

| Field | Value |
|-------|--------|
| Module | `_shared/vehicle-reports.ts` |
| Table | `public.vehicle_report_evidence` |
| Migration | `202608190025_wave3f_vehicle_report_evidence_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/INSERT). Support-grant: `companyScopedServiceDb`. |
| Privileged side effects | Vehicles stay service-role; audit / domain events stay privileged |
| Proof | Static grant allowlist; JWT matrix INSERT own/foreign/anon. |

---

## 5aa. RLS cutover 26 — `journey_stops`

| Field | Value |
|-------|--------|
| Module | `_shared/journey-handlers.ts` |
| Table | `public.journey_stops` |
| Migration | `202608190026_wave3f_journey_stops_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/INSERT/UPDATE). Support-grant: `companyScopedServiceDb`. |
| Privileged side effects | Runs, duties, drivers, duty_runs, driver_app_accounts stay service-role; audit / domain events stay privileged |
| Proof | Static grant allowlist; JWT matrix INSERT/UPDATE own/foreign/anon. |

---

## 5ab. RLS cutover 27 — `notifications`

| Field | Value |
|-------|--------|
| Module | `_shared/notifications.ts` |
| Table | `public.notifications` |
| Migration | `202608190027_wave3f_notifications_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (INSERT; SELECT remains recipient+company). Support-grant / no JWT: `companyScopedServiceDb*`. |
| Privileged side effects | Memberships, roles, driver_app_accounts stay service-role. **F-29** holds. |
| Proof | Static grant allowlist; JWT matrix INSERT own/foreign/anon; recipient SELECT unchanged. |

## 5ac. RLS cutover 28 — `runs`

| Field | Value |
|-------|--------|
| Module | `_shared/journey-handlers.ts` |
| Table | `public.runs` |
| Migration | `202608190028_wave3f_runs_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/UPDATE). Support-grant: `companyScopedServiceDb`. Creates stay service-role. |
| Privileged side effects | Duties, drivers, duty_runs, driver_app_accounts, audit, domain events stay service-role. |
| Proof | Static grant allowlist; journey-handlers authority; JWT matrix SELECT/UPDATE own, INSERT deny, foreign deny. |

## 5ad. RLS cutover 29 — `defects`

| Field | Value |
|-------|--------|
| Module | `_shared/yard-mutation-handlers.ts` |
| Table | `public.defects` |
| Migration | `202608190029_wave3f_defects_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/INSERT/UPDATE). Support-grant: `companyScopedServiceDb`. |
| Privileged side effects | Vehicles, VOR, yard_movements, audit_events, exception automation stay service-role. |
| Proof | Static grant allowlist; yard-mutation-handlers authority; JWT matrix INSERT/UPDATE own, foreign/anon deny. |

## 5ae. RLS cutover 30 — `yard_movements`

| Field | Value |
|-------|--------|
| Module | `_shared/yard-mutation-handlers.ts` |
| Table | `public.yard_movements` |
| Migration | `202608190030_wave3f_yard_movements_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/INSERT). Support-grant: `companyScopedServiceDb`. |
| Privileged side effects | Vehicles operational_status + audit_events stay service-role. |
| Proof | Static grant allowlist; yard-mutation-handlers authority; JWT matrix INSERT own/foreign/anon. |

## 5af. RLS cutover 31 — `vor_cases`

| Field | Value |
|-------|--------|
| Module | `_shared/yard-mutation-handlers.ts` |
| Table | `public.vor_cases` |
| Migration | `202608190031_wave3f_vor_cases_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/UPDATE). Support-grant: `companyScopedServiceDb`. Creates stay service-role (body-condition). |
| Privileged side effects | Vehicles operational_status + audit_events stay service-role. |
| Proof | Static grant allowlist; yard-mutation-handlers authority; JWT matrix SELECT/UPDATE own, INSERT deny, foreign deny. |

## 5ag. RLS cutover 32 — `driver_app_devices`

| Field | Value |
|-------|--------|
| Module | `_shared/driver-devices.ts` |
| Table | `public.driver_app_devices` |
| Migration | `202608190032_wave3f_driver_app_devices_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/INSERT/UPDATE). Support-grant: `companyScopedServiceDb`. |
| Privileged side effects | `driver_app_accounts` count sync + `audit_events` stay service-role. Distinct from FCM `driver_devices`. |
| Proof | Static grant allowlist; driver-devices authority; JWT matrix INSERT/UPDATE own, foreign/anon deny; module left transitional allowlist (no bare `admin`). |

## 5ah. RLS cutover 33 — `duty_acknowledgements`

| Field | Value |
|-------|--------|
| Module | `_shared/duty-publication.ts` (ack path only) |
| Table | `public.duty_acknowledgements` |
| Migration | `202608190033_wave3f_duty_acknowledgements_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/INSERT/UPDATE). Support-grant: `companyScopedServiceDb`. |
| Privileged side effects | Duties lifecycle updates, `duty_assignment_events`, eligibility, notifications stay bare admin. Module remains on transitional allowlist. |
| Proof | Static grant allowlist; duty-acknowledgements authority; JWT matrix INSERT/UPDATE own, foreign/anon deny. |

## 5ai. RLS cutover 34 — `attendance_day_overrides`

| Field | Value |
|-------|--------|
| Module | `_shared/attendance.ts` (classify path) |
| Table | `public.attendance_day_overrides` |
| Migration | `202608190034_wave3f_attendance_day_overrides_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/INSERT/UPDATE). Support-grant: `companyScopedServiceDb`. Lookups: `companyScopedServiceDbForCompany`. |
| Privileged side effects | Leave, notes, RTW, duty/run projections stay bare admin. Module remains on transitional allowlist. |
| Proof | Static grant allowlist; attendance-day-overrides authority; JWT matrix INSERT/UPDATE own, foreign/anon deny. |

## 5aj. RLS cutover 35 — `duty_assignment_events`

| Field | Value |
|-------|--------|
| Module | `_shared/duty-publication.ts` (`recordDutyAssignmentEvent`); callers pass optional `context` |
| Table | `public.duty_assignment_events` |
| Migration | `202608190035_wave3f_duty_assignment_events_user_scoped.sql` |
| Authority | Membership JWT: `userScopedDb` (SELECT/INSERT). Support-grant / no JWT: `companyScopedServiceDb*`. |
| Privileged side effects | Duties / duty_runs stay bare admin. |
| Proof | Static grant allowlist; duty-assignment-events authority; JWT matrix INSERT own, foreign/anon deny. |

## 5ak. RLS cutover 36 — `driver_training`

| Field | Value |
|-------|--------|
| Module | `_shared/driver-training-centre.ts` |
| Table | `public.driver_training` |
| Migration | `202608190036_wave3f_driver_training_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/INSERT/UPDATE). Support / no JWT: `companyScopedServiceDb*`. |
| Privileged side effects | `driver_requirements`, `driver_app_accounts`, drivers stay service-role. Module left the transitional allowlist (no bare `admin`). |
| Proof | Static grant allowlist; driver-training authority; JWT matrix INSERT/UPDATE own, foreign/anon deny. |

## 5al. RLS cutover 37 — `interest_submissions`

| Field | Value |
|-------|--------|
| Module | `_shared/interest-submissions.ts` |
| Table | `public.interest_submissions` |
| Migration | `202608190037_wave3f_interest_submissions_user_scoped.sql` |
| Authority | Membership: `userScopedDb` (SELECT/INSERT/UPDATE). Integration intake / support: `companyScopedServiceDb*`. |
| Privileged side effects | Accept conversion (customers/passengers/bookings/trips), users, memberships, audit, integration keys, `next_interest_reference` RPC. Module left the transitional allowlist. |
| Proof | Static grant allowlist; interest-submissions authority; JWT matrix INSERT/UPDATE own, foreign/anon deny. |

---

## 5am–5ap. RLS cutovers 38–41 — attendance leave family

| Field | Value |
|-------|--------|
| Modules | `_shared/attendance.ts` (left allowlist); `_shared/holiday-balance.ts` leave paths |
| Tables | `attendance_leave_requests` (38), `attendance_leave_audit` (39), `attendance_notes` (40), `attendance_return_to_work` (41) |
| Migrations | `202608190038` … `202608190041` |
| Authority | Membership JWT: `userScopedDb` SIU. Support / companyId-only hub lookups: `companyScopedServiceDb*`. |
| Privileged side effects | Duties/drivers/depots/vehicles/runs stay service-role in attendance; holiday ledger tables stay bare admin in holiday-balance. |
| Proof | Grants allowlist; attendance-leave-family authority; JWT matrix INSERT/UPDATE + foreign/anon deny. |

---

## 5aq–5at. RLS cutovers 42–45 — holiday entitlement family

| Field | Value |
|-------|--------|
| Module | `_shared/holiday-balance.ts` (left allowlist) |
| Tables | `company_holiday_defaults` (42), `driver_holiday_profiles` (43), `holiday_ledger_entries` (44), `holiday_pay_records` (45) |
| Migrations | `202608190042` … `202608190045` |
| Authority | Membership JWT: `userScopedDb` SIU via `holidayTableDb`. Support / companyId-only: service-role. |
| Privileged side effects | `driver_app_accounts`, drivers, depots stay service-role. |
| Proof | Grants allowlist; holiday-balance authority; JWT matrix own INSERT + foreign/anon deny. |

---

## 5au–5ay. RLS cutovers 46–50 + named capabilities

| Field | Value |
|-------|--------|
| 46–47 | `driver_requirements`, `driver_requirement_requests` — `_shared/driver-requirements.ts` left allowlist |
| 48–50 | `override_audit_events`, `domain_events`, `audit_events` — SELECT/INSERT append-only |
| Named | `auditWriterDb`, `domainEventWriterDb`, `overrideAuditWriterDb`, `pushSenderDb` in `db-authority.ts`; modules no longer import bare `admin` |
| Proof | Grants allowlist; driver-requirements + named-capabilities authority; allowlist counter **7** transitional |

---

## 5az–5bd. RLS cutovers 51–55 — duty/trip core + hub exit from bare admin

| Field | Value |
|-------|--------|
| 51–52 | `trip_assignments`, `duties` SIU |
| 53–54 | `run_trips`, `duty_runs` SELECT/INSERT via parent-company join policies |
| 55 | `runs` INSERT (extends cutover 28 SELECT/UPDATE) |
| Hubs | `duty-publication`, `operational-trip-assign`, `projections` left transitional allowlist (no bare `admin`) |
| Residual | Protected-last only (**4**). Projections still uses company-scoped service-role for multi-table reads. |
| Proof | Grants allowlist; duty-trip-hubs authority; allowlist counter **4**; TI green after deploy |


## 5be–5cj. RLS cutovers 56–92 — protected-last + master data

| Field | Value |
|-------|--------|
| 56 | `membership_application_access` — application-scopes on `userScopedDb` |
| 57–64 | Body-condition family (audit events INSERT-only; inspections/media/damage/markers/reviews/acks SIU) |
| 65–86 | Master ops: drivers, vehicles, staff, depots, checks, documents, app accounts, messages, yard tasks, memberships, depot_access, live positions, invitations/events, files, customers, bookings, places, schools, bays, restrictions, eligibility |
| 87 | `companies` SELECT/UPDATE |
| 88–92 | roles, executive_policies/records, command_page_snapshots, role_permissions (join) |
| Hubs | entitlements → `entitlementReaderDb` / `platformAdminDb`; command-api ALS facade; body-condition off bare `admin` |
| Proof | Grants **91** tables (22+66+3); allowlist **0** transitional; TI green (`…_228`) |

---

## 5ck–5cn. RLS cutovers 93–96 — projection residual tables + JWT preference

| Field | Value |
|-------|--------|
| 93–95 | `trips`, `passengers`, `booking_legs` SIU |
| 96 | `users` SELECT-only company-peer policy (keeps self UPDATE) |
| Projections | `resolveProjectionDb` prefers `userScopedDb` when `enterActiveRequestContext` is bound; else named `projectionReaderDb` |
| ALS | Shared `AsyncLocalStorage` moved to `db-authority.ts`; command-api + projections share it |
| Proof | Grants **95** tables (22+69+3+1); named-capabilities + duty-trip-hubs + protected-last authority; `npm test` green; TI green (`…_229`) |

### Residual privilege inventory (Wave 3F LOCKED — justified exceptions only)

| Path | Authority | Why retained |
|------|-----------|--------------|
| `resolveTenantDb` JWT-less fallback | company-scoped service-role | cron / companyId-only helpers when no membership JWT/ALS |
| `interest_submissions_intake` | company-scoped service-role | website intake has no membership JWT |
| `supabase.ts` authenticate | authority_core `admin` | membership / JWT bootstrap before UserScopedDb |
| Named writers / readers (`auditWriter`, `domainEventWriter`, `overrideAuditWriter`, `pushSender`, `entitlementReader`, `platformAdmin`) | Type B | append-only events, push, billing catalogue |
| Auth Admin / Storage / seeds / executive / billing | privileged allowlist | Type B — not ordinary tenant CRUD |
| Support-grant sessions | `companyScopedServiceDb` | membership RLS cannot authorize non-member JWTs |

---

## 5co. `resolveTenantDb` + ALS preference (Wave 3F lock)

| Field | Value |
|-------|--------|
| Change | Shared `resolveTenantDb(companyId, reason, explicitContext?)` prefers JWT + RLS when request context / ALS is bound; falls back to company-scoped service-role only for JWT-less callers |
| Modules | hubs, duty-publication, attendance, compliance, notifications, purchase/ops/stock/equipment/tyre, journey family, defect automation, driver ops/guards, projections (`resolveProjectionDb`), etc. |
| Interest intake | Remains `companyScopedServiceDbForCompany(..., 'interest_submissions_intake')` (no membership JWT) |
| Proof | Authority unit scripts; `npm test`; TI green (`…_230`) |
| Exit | Ordinary authenticated Command/Driver request CRUD no longer uses unclassified service-role; Wave 3F **LOCKED** |

---

## 6. Batch 01 micro-gate (unchanged)

For each of `duty-closeout`, `driver-job-execution`, `document-expiry-notifications`:

1. Replace bare `admin` with `companyScopedServiceDbForCompany(companyId, '<module>')`.
2. Keep `company_id` filters as defence-in-depth.
3. Do **not** remove the module from the allowlist until the scanner agrees (stale entries fail CI).
4. Run: domain tests, allowlist, fresh-DB, tenant-isolation, storage isolation if relevant, Command API smoke, typecheck, build, full CI.
5. Own-company read/write and cross-company deny remain mandatory. Live tenant-isolation **push** job currently 401s on job-execution (pre-existing on `c605e33`); treat **PR CI** as the attested gate until that push job is fixed under PR-05/PR-09.

Batch 01 **landed**. Keep this micro-gate for later one-module wraps: own-company read/write and cross-company deny remain mandatory. Live tenant-isolation **push** job has historically 401’d on job-execution (`c605e33`); treat **PR CI** as the attested gate until that push job is fixed under PR-05/PR-09.

Do not combine a wrap PR with `command-api/index`, `entitlements`, or `application-scopes`. Do not mix TI-401 or CI-CANCEL-001 fixes into wrap PRs.
