# PROD-1 — Service-role call-path classification

**Status:** Classification complete — conversion not started  
**Date:** 17 August 2026  
**Baseline SHA:** `9f5001851214bc009a38d858160ea32c7eb9aefb` (`prod0-phase0-authority-20260817`)  
**Branch:** `production-stabilisation/2026`  
**Authority:** [veyvio-production-readiness-blueprint.md](./veyvio-production-readiness-blueprint.md) tracks PR-02 / PROD-1  
**Static gate (extend, do not rebuild):** `Veyvio admin /scripts/service-role-allowlist.unit.mjs`  
**CI reliability (separate from wraps):** [prod-1-ci-reliability.md](./prod-1-ci-reliability.md)

This document is the source-confirmed call-path register for the **31** remaining `company_scoped_service_role` modules. It does **not** convert any of them.

---

## 1. What “conversion” can mean right now

`userScopedDb()` in `_shared/db-authority.ts` **throws**. Authenticated PostgREST writes remain fail-closed. FIX-P0-011 is locked; hosted Wave 3F verification is **CLOSED** (17 Aug 2026), so FIX-P1-012 importer wraps may resume.

The proven wrap pattern (fuel-records, journey-sequence-ack, …) is:

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
| **RLS cutover** | `userScopedDb` → PostgreSQL RLS | Blocked until mutation grants exist |
| **Named capability** | `auditWriter` / `storageSigner` / … | Required for Type B before Wave 3F closes |

PROD-1 batches below are **wraps**, matching existing Wave 3F work. Do not claim Wave 3F closed when the counter hits 0 wraps. ADR-PR-002 still requires named capabilities for retained privilege, and ADR-PR-001 still requires RLS for ordinary tenant data.

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

**Batch 01 is the first conversion PR.** Three small `companyId`-in-signature leaves. No auth-path modules. No hubs. Matches `companyScopedServiceDbForCompany` used by journey-sequence-ack.

---

## 6. Batch 01 micro-gate (unchanged)

For each of `duty-closeout`, `driver-job-execution`, `document-expiry-notifications`:

1. Replace bare `admin` with `companyScopedServiceDbForCompany(companyId, '<module>')`.
2. Keep `company_id` filters as defence-in-depth.
3. Do **not** remove the module from the allowlist until the scanner agrees (stale entries fail CI).
4. Run: domain tests, allowlist, fresh-DB, tenant-isolation, storage isolation if relevant, Command API smoke, typecheck, build, full CI.
5. Own-company read/write and cross-company deny remain mandatory. Live tenant-isolation **push** job currently 401s on job-execution (pre-existing on `c605e33`); treat **PR CI** as the attested gate until that push job is fixed under PR-05/PR-09.

Do not start Batch 01 until this classification is accepted. Do not combine Batch 01 with `command-api/index`, `entitlements`, or `application-scopes`.
