# Veyvio Full Remediation & Production Hardening Plan

**Document status:** ACTIVE  
**Primary branch:** `phase0/reproducibility`  
**Platform:** Veyvio Fleet / BCT  
**Engineering principle:** **Platform first, workflows second, screens third.**  
**Primary objective:** Fix the known architectural, security, reliability, offline, tenancy, CI/CD, finance, observability, testing, and repository-engineering issues without rewriting Veyvio or removing working product capability.

---

## 1. Purpose

This file converts the full distinguished-engineer audit into an executable remediation programme.

It is intended to be used by engineers and coding agents as the authoritative **fix backlog** for the current hardening phase.

The goal is not merely to make builds green. The goal is to make Veyvio trustworthy enough that:

> A transport operator can use Veyvio from the beginning of an operating day to the end of the day without fake operational facts, silent data loss, cross-tenant leakage, unaudited privileged actions, unsafe offline behaviour, or unverifiable releases.

This plan deliberately avoids a rewrite.

The intended architectural direction remains:

```text
Veyvio applications
    ↓
shared platform contracts
    ↓
Command application/API boundary
    ↓
tenant / permission / entitlement / safety enforcement
    ↓
domain modules
    ↓
transactional audit + outbox
    ↓
Supabase / Postgres / Storage / external integrations
```

---

# 2. Non-negotiable remediation rules

These rules apply to every fix in this document.

- [ ] Do not merge red required CI into `main`.
- [ ] Do not weaken or remove a security, tenant-isolation, production-truth, or safety test merely to make CI green.
- [ ] Do not add new production mock or demo fallbacks.
- [ ] Do not introduce a second authoritative write path.
- [ ] Do not let a client become the safety authority.
- [ ] Do not silently discard driver, defect, incident, vehicle-check, duty, handback, passenger, or finance data.
- [ ] Do not create unscoped offline state when company/membership context is missing.
- [ ] Do not allow malformed or unknown entitlement state to silently grant paid capabilities.
- [ ] Do not allow a live finance integration to fall back to synthetic data.
- [ ] Do not perform privileged support access without durable audit evidence.
- [ ] Do not store new long-lived credentials in browser/WebView `localStorage`.
- [ ] Do not add customer-specific provisioning to the universal database migration chain.
- [ ] Do not add substantial new route logic directly to the monolithic `command-api/index.ts`.
- [ ] Do not create microservices merely because Command is large.
- [ ] Keep Veyvio as a modular monolith until service boundaries are proven operationally.
- [ ] Every fix must include regression tests.
- [ ] Every P0/P1 fix must include a failure-path test.
- [ ] Every tenant/security fix must include a negative test proving forbidden access fails.
- [ ] Every offline fix must be tested across app/process restart.
- [ ] Every production-truth fix must prove no mock/synthetic data appears in a production build.
- [ ] Update this file with status and evidence as each item closes.

---

# 3. Completion states

Do not use percentage completion as release evidence.

Use:

```text
OPEN
IN_PROGRESS
IMPLEMENTED
INTEGRATED
TESTED
DEPLOYED
VERIFIED
DEVICE_VERIFIED
ACCEPTED
```

For security and safety issues, `IMPLEMENTED` is not enough.

---

# 4. Severity model

| Severity | Meaning |
|---|---|
| **P0 STOP-SHIP** | Can cause safety, tenant, financial-truth, authentication, audit, data-loss, or production-release failure. Must close before production/pilot expansion. |
| **P1 HIGH** | Significant security/reliability/platform risk. Close before broad production use. |
| **P2 MEDIUM** | Material maintainability, consistency, testing, observability, or operational-support debt. |
| **P3 IMPROVEMENT** | Engineering quality and scale improvement after core hardening. |

---

# 5. Phase R0 — Restore engineering truth first

No large new feature work should be layered on top of a red platform baseline.

---

## FIX-R0-001 — Restore Admin TypeScript correctness

**Severity:** P0 STOP-SHIP  
**Status:** TESTED  

### Evidence
- Tests: `cd "Veyvio admin " && npm run typecheck` (pass) and `npm test` (225 vitest + unit scripts pass, including `exceptions-port.test.ts`)
- Remaining limitations: production `api` still dynamically unions mock vs real at runtime; compile-time port is `ExceptionsPort` on both classes.

**Area:** Veyvio Command/Admin  
**Known symptoms:**

- Exceptions UI/API contract drift.
- `getExceptions` and exception mutation methods exist on one API implementation but not the other.
- Unknown result typing around raised exceptions.
- `mock-checks.ts` fixture/type mismatch around `modelYear`.
- `safe-hubs.ts` number/string comparison defect.

**Required fix:**

1. Introduce or extend an explicit Exceptions API contract.
2. Make both real and mock implementations satisfy the same compile-time interface.
3. Remove `ApiClient | MockApiClient` method-shape ambiguity for this domain.
4. Fix fixtures to satisfy production types instead of weakening the production type.
5. Fix invalid comparison logic in `safe-hubs.ts`.
6. Add compile-time tests for real/mock contract parity.

**Acceptance criteria:**

- [ ] Admin typecheck passes.
- [ ] Existing Admin tests stay green.
- [ ] Exceptions page compiles against one shared contract.
- [ ] Real and mock adapters cannot drift without CI failure.
- [ ] No `any` or unsafe cast is introduced solely to suppress errors.

---

## FIX-R0-002 — Repair Cost Control production build

**Severity:** P0 STOP-SHIP  
**Status:** TESTED  

### Evidence
- Tests: `cd veyvio-cost-control && npm test` (96 pass) and `npm run build` (tsc + vite production build pass)
- Remaining limitations: none for the PROD boolean/string contract.

**Area:** Cost Control  
**Known file:** `veyvio-cost-control/src/integrations/bank/types.ts`

**Known symptom:** TypeScript compares incompatible `string` and `boolean` values.

**Required fix:**

- Correct the underlying bank integration state type.
- Make environment/runtime modes explicit and strongly typed.
- Do not patch with a broad cast.

**Acceptance criteria:**

- [ ] Cost Control unit tests pass.
- [ ] Cost Control production build passes.
- [ ] Live/sandbox/disabled configuration is covered by tests.

---

## FIX-R0-003 — Repair Executive CI build/test ordering

**Severity:** P0 STOP-SHIP  
**Status:** TESTED  

### Evidence
- Tests: `cd veyvio-executive && npm test` — 58 pass including seven `rendered-html` assertions against `dist/server/index.js`
- Remaining limitations: GitHub `executive` job must be confirmed green on the pushed commit.

**Area:** Executive  
**Known file:** `veyvio-executive/tests/rendered-html.test.mjs`

**Problem:**

The test imports a built artifact such as `dist/server/index.js`, but the CI security-test stage executes before the required artifact exists.

**Required fix:**

Choose one explicit strategy:

### Preferred

```text
install
→ type/lint
→ build exact production artifact
→ artifact-based security tests
```

or split:

```text
pure source security tests
artifact security tests
```

and make the artifact tests depend on the build job.

**Acceptance criteria:**

- [ ] Executive CI no longer produces `ERR_MODULE_NOT_FOUND` for the worker artifact.
- [ ] The seven current failures are replaced by actual executed security assertions.
- [ ] No test is skipped solely to make the lane green.
- [ ] Production dependency audit remains enforced.

---

## FIX-R0-004 — Fix F-04 secret scanner false positives safely

**Severity:** P0 STOP-SHIP  
**Status:** TESTED  

### Evidence
- Tests: `node scripts/audit-secrets.unit.mjs` (pass) and `npm run audit:secrets` (pass)
- Remaining limitations: `scripts/audit-secrets.unit.mjs` is a narrow path allowlist so realistic PEM samples in that file do not fail the repo scan.

**Area:** CI / Security  
**Known files:**

- `scripts/audit-secrets.mjs`
- `Veyvio admin /scripts/fcm-send.unit.mjs`
- `Veyvio admin /supabase/functions/_shared/fcm-send.ts`

**Problem:**

The current private-key regex flags PEM marker strings used by parser code and obvious dummy test fixtures.

**Required fix:**

- Keep detection of real PEM private keys.
- Distinguish parser/source markers from plausible private-key material.
- Prefer confidence-based detection or a narrowly documented path/pattern exception.
- Never globally ignore `BEGIN PRIVATE KEY`.

**Required tests:**

- [ ] Realistic committed private key fixture => scanner FAIL.
- [ ] Dummy `ABC` test fixture => scanner PASS.
- [ ] Parser source containing PEM marker strings => scanner PASS.
- [ ] RSA / EC / OpenSSH real-looking material => scanner FAIL.

---

## FIX-R0-005 — Restore live tenant-isolation certification

**Severity:** P0 STOP-SHIP  
**Status:** TESTED  

### Evidence
- Login/MFA/select-tenant fail closed with the exact stage that lost `accessToken`.
- Isolation seed now sets `mfa_enabled: false` and clears TOTP methods (command-api deployed to `qeckgqjrfbdyxchuncdt`).
- Command-without-driver-account check uses the platform session for `/driver/journey-sequence-acknowledgements`.
- Negative probes treat 4xx/5xx as fail-closed (must not return 2xx).
- Remaining limitations: none for Wave 1 required CI. GitHub run https://github.com/LarixAi/BCT/actions/runs/31905556784 on `cee131c` is green, including tenant isolation.

**Area:** Tenancy / Supabase / CI  
**Problem:**

The live tenant-isolation job currently fails before it can certify isolation because one or both test sessions fail to receive valid access tokens.

**Important:** This does **not** prove a tenant leak. It means the commit cannot prove isolation.

**Required fix:**

- Repair the test account/session/bootstrap path.
- Verify test users exist and are active.
- Verify expected memberships exist and are active.
- Verify each account has a distinct company.
- Verify authentication/bootstrap does not depend on stale local state.
- Keep failure closed when accounts cannot authenticate.

**Acceptance criteria:**

- [ ] Both tenant test sessions authenticate.
- [ ] Tenant A can access Tenant A resources.
- [ ] Tenant A cannot access Tenant B resources.
- [ ] Tenant B cannot access Tenant A resources.
- [ ] Cross-company IDs supplied manually are rejected.
- [ ] Direct authenticated Supabase reads cannot bypass tenant rules.
- [ ] Test is run against actual production RLS/business code.

---

## FIX-R0-006 — Correct signed Android AAB release ordering

**Severity:** P1 HIGH  
**Status:** IMPLEMENTED  

### Evidence
- `.github/workflows/driver-android-aab.yml` now builds the release web artifact, scans that `dist`, then Capacitor sync, then `bundleRelease`, and records commit SHA + AAB sha256.
- Remaining limitations: a signed AAB was not produced in this wave (`workflow_dispatch` / `driver-v*` only).

**Area:** Driver release engineering  
**Problem:**

The release lane can perform a production scan in skip-build mode before the exact release web artifact has been created.

**Required release order:**

```text
clean checkout
→ install
→ production web build
→ scan exact build artifact
→ Capacitor sync
→ Android release build
→ sign
→ verify signature
→ generate provenance/checksums
→ publish/stage
```

**Acceptance criteria:**

- [ ] No stale build directory can satisfy the scan.
- [ ] Scan runs against the artifact being packaged.
- [ ] Release checksum and commit SHA are captured.
- [ ] Production mock/Base44 guard runs against the exact release artifact.

---

# 6. Phase R1 — Driver offline durability and safety

This is the highest-risk product-engineering area discovered in the audit.

---

## FIX-P0-001 — Eliminate false-success offline queue writes

**Severity:** P0 STOP-SHIP  
**Status:** TESTED (Wave 2 hardening — not ACCEPTED / not DEVICE_VERIFIED)  
**Area:** Driver offline mutation system

### Evidence
- Durable store: IndexedDB `veyvio_driver_durable` with put+get verify (`veyvio-driver-App/src/lib/driver-durable-kv.js`). localStorage is migration source only.
- Tests: `driver-ops-outbox.storage.test.js` (restart reload, corrupt queue, tenant fail-closed), `driver-ops-outbox.service.test.js` (persist failure is not queued-success).
- Driver `npm test`: 151 pass. `npm run typecheck` pass. Device restart not yet verified on handset.

**Current risk:**

Operational mutations use browser/WebView storage patterns where:

```text
storage write
→ exception swallowed
→ caller can still report queued/success
```

This can produce:

> “Saved on this device”

when the mutation was not durably stored.

**Required architecture:**

```text
Driver action
    ↓
validate locally
    ↓
create immutable mutation envelope
    ↓
atomic durable write
    ↓
read/verify or storage-confirmation
    ↓
ONLY THEN acknowledge "saved on device"
    ↓
sync through Command
```

**Required storage characteristics:**

- Native/transactional where possible.
- Survives app restart.
- Survives process kill.
- Supports indexed retrieval by tenant/user/status.
- Supports idempotency key.
- Supports mutation version.
- Supports evidence/media references.
- Supports retry state and last error.
- Supports dead-letter/reconciliation state.

**Do not use plain `localStorage` as the authoritative operational outbox.**

**Acceptance criteria:**

- [ ] Storage failure produces visible failure, never queued-success.
- [ ] App kill immediately after "saved" does not lose the mutation.
- [ ] Device restart does not lose the mutation.
- [ ] Duplicate submission cannot create duplicate server state.
- [ ] Corrupt storage does not silently become an empty queue.
- [ ] Existing queued items have a migration path.

---

## FIX-P0-002 — Persistent dead-letter/reconciliation queue

**Severity:** P0 STOP-SHIP  
**Status:** TESTED (Wave 2 hardening — not ACCEPTED / not DEVICE_VERIFIED)  
**Area:** Driver offline sync

**Current risk:**

Permanent 4xx rejections can be removed from the queue and only exposed in the current in-memory flush result.

**Required behaviour:**

```text
PENDING
→ SENDING
→ ACCEPTED
or
→ RETRYABLE_FAILURE
or
→ RECONCILIATION_REQUIRED
```

Never:

```text
PENDING
→ 4xx
→ DELETE
```

for safety/operational evidence.

**Persist at minimum:**

- mutation ID
- tenant/company
- membership
- driver
- domain type
- created timestamp
- last attempted timestamp
- server response/error code
- reconciliation reason
- payload checksum
- evidence references
- retry count

**Acceptance criteria:**

- [ ] Permanent server rejection survives app restart.
- [ ] Driver can see that action needs attention.
- [ ] Command/operator can reconcile high-risk rejected operations where appropriate.
- [ ] Resolved dead-letter entries remain historically auditable.

---

## FIX-P0-003 — Remove unscoped Driver outbox fallback

**Severity:** P0 STOP-SHIP  
**Status:** TESTED (Wave 2 hardening — not ACCEPTED / not DEVICE_VERIFIED)  
**Area:** Driver tenancy

**Current risk:**

When company/membership context is unavailable, legacy storage can fall back to a key based only on driver identity.

**Required fix:**

The minimum offline key must include authoritative tenant context.

Example conceptual key:

```text
driver_outbox:v2:<companyId>:<membershipId>:<driverId>
```

If tenant context is unavailable:

```text
OFFLINE_CONTEXT_NOT_READY
```

and persistence must be blocked.

**Acceptance criteria:**

- [ ] No production code creates a tenantless operational queue.
- [ ] Tenant switch cannot expose prior tenant offline data.
- [ ] Logout clears/unmounts active tenant context without deleting unresolved evidence.
- [ ] Re-login to another tenant cannot replay another tenant's queue.

---

## FIX-P0-004 — Replace mirrored tenant-storage tests

**Severity:** P1 HIGH  
**Status:** TESTED (Wave 2 hardening — not ACCEPTED / not DEVICE_VERIFIED)  
**Area:** Driver tests

**Problem:**

A tenant storage test reimplements the production workspace-key algorithm instead of importing/exercising production code.

**Required fix:**

- Export the production key builder from a testable module.
- Test that implementation directly.
- Add negative tenant-switch and malformed-context cases.

**Acceptance criteria:**

- [ ] Changing production key behaviour causes the test to fail.
- [ ] The test contains no duplicate implementation of the production algorithm.

---

## FIX-P1-005 — Harden Driver media durability

**Severity:** P1 HIGH  
**Status:** TESTED (Wave 2 hardening — not ACCEPTED / not DEVICE_VERIFIED)  
**Area:** Driver offline media/evidence

**Risk:**

Memory fallback cannot be described as durable because process termination loses it.

**Required fix:**

- Persistent media queue for safety-critical evidence.
- If durable storage is unavailable, do not claim the media has been saved.
- Separate optional UI media from required regulatory evidence.
- Store checksums and upload state.

**Acceptance criteria:**

- [ ] Required defect/incident evidence survives app kill/restart.
- [ ] Failed media persistence is visible to the user.
- [ ] Orphaned media can be reconciled/cleaned safely.

---

## FIX-P1-006 — Prove degraded Driver mode cannot bypass server safety gates

**Severity:** P1 HIGH  
**Status:** TESTED (Wave 2 hardening — not ACCEPTED / not DEVICE_VERIFIED)  
**Area:** Driver compliance / safety

**Context:**

The UI intentionally exposes useful sections during degraded connectivity/compliance-readiness conditions.

This can remain, but the server must remain authoritative.

**Required tests:**

- [ ] Expired/ineligible driver cannot start a prohibited duty through a handcrafted API request.
- [ ] VOR vehicle cannot be dispatched through a handcrafted request.
- [ ] Missing policy/compliance state cannot be interpreted client-side as eligibility.
- [ ] Offline replay is revalidated after reconnect.
- [ ] Stale client state cannot override current server compliance.

---

# 7. Phase R2 — Authentication, session custody, MFA and privileged access

---

## FIX-P1-007 — Remove long-lived Command refresh credentials from `localStorage`

**Severity:** P1 HIGH  
**Status:** OPEN  
**Known file:** `Veyvio admin /src/lib/api/real-client.ts`

**Current risk:**

Both access and refresh tokens are JavaScript-readable.

An XSS vulnerability can therefore become durable account/session theft.

**Target direction:**

Preferred:

```text
browser
→ HttpOnly Secure SameSite session cookie
→ BFF / Command session gateway
→ upstream identity
```

If SPA bearer tokens must temporarily remain:

- access token short-lived and preferably in memory
- refresh token not JavaScript-readable
- strict CSP
- no inline script exceptions
- token rotation
- device/session revocation
- refresh replay detection

**Acceptance criteria:**

- [ ] Refresh token is not available through `window.localStorage`.
- [ ] Logout invalidates server-side/session authority.
- [ ] Session revocation takes effect without waiting for long token expiry.
- [ ] XSS-focused security test proves refresh credential is inaccessible.

---

## FIX-P1-008 — Move Driver credentials to native secure storage

**Severity:** P1 HIGH  
**Status:** OPEN  
**Area:** Driver auth

**Target:**

- iOS Keychain
- Android Keystore-backed secure storage
- Capacitor bridge/secure-storage abstraction
- web fallback only for genuine browser deployment, with separate risk model

**Acceptance criteria:**

- [ ] Native refresh/session credentials are not in WebView localStorage.
- [ ] Credential storage survives legitimate app restart.
- [ ] Logout securely removes/revokes credentials.
- [ ] Device/session revocation is respected.

---

## FIX-P1-009 — Remove plaintext TOTP seed storage

**Severity:** P1 HIGH  
**Status:** OPEN  
**Known migration:** `Veyvio admin /supabase/migrations/202607220019_mfa_totp_secret.sql`

**Current risk:**

TOTP seed material is stored as plaintext database text.

**Preferred fix order:**

1. Prefer Supabase/provider-native MFA if it satisfies Veyvio requirements.
2. Otherwise use envelope encryption:
   - KMS/Vault-managed encryption key
   - database stores ciphertext only
   - key not stored beside ciphertext
   - rotation supported
   - access auditable

**Acceptance criteria:**

- [ ] Database dump alone cannot reveal active TOTP seeds.
- [ ] Existing plaintext seeds are migrated/re-enrolled securely.
- [ ] No seed appears in application logs/audit metadata.
- [ ] MFA reset/recovery has explicit audit records.

---

## FIX-P1-010 — Make privileged support audit mandatory

**Severity:** P1 HIGH  
**Status:** OPEN  
**Area:** Command privileged/support access

**Current risk:**

Privileged support action can succeed even when the audit write fails.

**Required fix:**

For high-risk privileged access:

```text
grant/use privilege
+
durable security audit
```

must be one fail-closed workflow.

Recommended pattern:

- transactional audit when possible
- or guaranteed outbox record in same transaction
- audit event has actor, target tenant, purpose, request ID, timestamp, expiry and action

**Acceptance criteria:**

- [ ] Simulated audit persistence failure blocks privileged operation.
- [ ] Support grant use is searchable by tenant and actor.
- [ ] Expired/revoked support grants cannot be reused.

---

# 8. Phase R3 — Tenant isolation and database authority

---

## FIX-P0-011 — Prove complete RLS coverage from a clean database

**Severity:** P0 STOP-SHIP  
**Status:** **LOCKED** — 17 Aug 2026 (Wave 3F proof chain; accepted boundaries documented in `docs/plan/evidence/wave-3f-p0-011-lock.json`)  
**Area:** Supabase/Postgres

**Context:**

Several historical RLS defects have already been repaired, including join-table parent-company enforcement and stale JWT membership fallback. Do not reopen those as unfixed defects unless a regression is found.

The remaining requirement is **complete proof**.

**Required work:**

1. Build the database from zero using the current migration chain.
2. Inventory every table/view/function/storage policy reachable by authenticated clients.
3. Classify each as:
   - public by design
   - tenant-scoped
   - self-scoped
   - platform-only
   - service-role-only
4. Verify RLS is enabled where required.
5. Verify `FORCE ROW LEVEL SECURITY` where appropriate.
6. Verify security-definer functions have safe search paths and execute grants.
7. Verify parent/child tables cannot create cross-company links.
8. Verify storage buckets use tenant-aware access rules.
9. Add automated RLS inventory checks.

**Acceptance criteria:**

- [x] Every tenant table has an explicit access classification (inventory + zero-policy closed; evidence `wave-3fb-*`).
- [x] Every tenant table has a negative cross-company test (PostgREST JWT 72/72 + Storage 66/66 + forge 13/13).
- [x] New tenant tables fail CI if RLS/access classification is missing (`admin-fresh-db` inventory gate).
- [x] Fresh migration produces the same security posture as long-lived environments (FIX-P1-048 CI green).

**Accepted boundaries at lock (not failures):**

- `cost_control` — BFF/service-role until Wave 3G (no authenticated PostgREST path).
- FIX-P1-013 — 40+ dual-FK tables in later waves (first wave closed).

**Non-blocking debt:** GitGuardian flags Supabase local demo keys in Wave 3F test scripts — track explicit cleanup ticket; does not reopen this fix.

---

## FIX-P1-012 — Reduce service-role blast radius in Command

**Severity:** P1 HIGH  
**Status:** OPEN  
**Area:** Command backend

**Current architecture:**

Authenticated business requests often execute using the administrative/service-role database client.

**Risk:**

RLS is bypassed, so every application query becomes responsible for perfect tenant filtering.

**Target direction:**

Use two explicit database authorities:

```text
UserScopedDb
  respects authenticated/RLS context

PrivilegedDb
  service-role
  narrow, explicit, audited
```

Service-role access should be required by exception, not default.

**Acceptance criteria:**

- [ ] Business routes declare which DB authority they use.
- [ ] Normal tenant reads prefer RLS-respecting context.
- [ ] Privileged service-role calls require explicit reason/code path.
- [ ] Static test detects accidental privileged client use in ordinary domain modules.

---

## FIX-P1-013 — Make cross-tenant relationship constraints structural

**Severity:** P1 HIGH  
**Status:** OPEN  
**Area:** Database integrity

Continue the same pattern already introduced by same-company triggers.

For every relationship connecting two tenant-owned parents:

```text
left.company_id == right.company_id
```

must be structurally proven.

**Acceptance criteria:**

- [ ] Cross-tenant foreign relationship cannot be created even through service role.
- [ ] Tests cover forged IDs.
- [ ] Domain API cannot rely solely on client-provided company IDs.

---

# 9. Phase R4 — Transactional audit, idempotency and event truth

---

## FIX-P1-014 — Transactional business mutation + audit/outbox

**Severity:** P1 HIGH  
**Status:** OPEN  
**Areas:** Incoming Interests, API keys, support actions, and then all material domains

**Current risk:**

Some business writes succeed first and then attempt an audit write which can fail independently.

**Required platform pattern:**

```text
BEGIN
  validate tenant / actor / permission
  perform domain mutation
  append domain event
  append audit event
  append integration/outbox event if needed
COMMIT
```

Notifications and external delivery happen after commit.

**Required mutation envelope:**

```ts
{
  requestId,
  idempotencyKey,
  actorUserId,
  companyId,
  membershipId,
  application,
  domain,
  action,
  occurredAt,
  payloadVersion
}
```

**Acceptance criteria:**

- [ ] If audit/outbox persistence fails, material mutation does not commit.
- [ ] Retrying the same idempotency key cannot duplicate the business state.
- [ ] Audit event points to the final authoritative record ID.
- [ ] External notification failure cannot roll back valid business state.

---

## FIX-P1-015 — Standard platform idempotency

**Severity:** P1 HIGH  
**Status:** OPEN  
**Area:** Command mutations / Driver replay / public intake

**Required scope:**

- Driver offline actions
- public Incoming Interests
- dispatch assignments
- duty state changes
- vehicle checks
- incidents
- defects
- handback/closeout
- integration webhook processing
- finance webhook processing

**Acceptance criteria:**

- [ ] Duplicate request with same key returns original outcome.
- [ ] Duplicate key with different payload is rejected.
- [ ] Idempotency record is tenant-scoped.
- [ ] Expiry/retention policy is documented.

---

# 10. Phase R5 — Finance and commercial truth

---

## FIX-P0-016 — Make Open Banking fail closed

**Severity:** P0 STOP-SHIP  
**Status:** OPEN  
**Area:** Cost Control / finance integrations

**Current risk:**

A supposedly live/Open Banking configuration can fall into sandbox/synthetic behaviour when required live infrastructure is absent.

**Required runtime state machine:**

```text
DISABLED
UNCONFIGURED
SANDBOX
LIVE
ERROR
```

No implicit transitions.

**LIVE requires all mandatory configuration**, including as applicable:

- provider
- client identity
- callback allowlist
- token proxy
- consent/auth endpoint
- PKCE/state support
- secure credential storage
- webhook verification
- account binding
- audit configuration

If any required value is missing:

```text
BANK_INTEGRATION_CONFIGURATION_INVALID
```

**Required UI behaviour:**

- Show configuration error.
- Show no invented accounts.
- Show no invented balances.
- Show no invented transactions.

**Acceptance criteria:**

- [ ] `LIVE` cannot instantiate sandbox adapter.
- [ ] Missing live config fails visibly.
- [ ] Production build cannot enable demo-live through accidental defaults.
- [ ] Synthetic finance rows are clearly isolated to test/sandbox environments.

---

## FIX-P0-017 — Make entitlement resolution fail closed

**Severity:** P0 STOP-SHIP for commercial SaaS  
**Status:** OPEN  
**Area:** Entitlements/licensing

**Current risk:**

Missing/unknown entitlement or subscription state can result in granted capability.

**Required model:**

```text
KNOWN_ALLOWED
KNOWN_DENIED
CONFIGURATION_ERROR
```

Not:

```text
missing → allow
unknown → active
no limit → unlimited
```

**Migration strategy:**

1. Inventory all existing companies.
2. Backfill explicit plan/entitlement state.
3. Add validation queries.
4. Only then switch resolver to fail closed.

**Acceptance criteria:**

- [ ] Unknown plan => deny/configuration error.
- [ ] Unknown subscription status => deny/configuration error.
- [ ] Missing usage limit cannot become unlimited unless the plan explicitly represents unlimited.
- [ ] Existing pilot/company entitlements are explicitly migrated before enforcement.

---

## FIX-P1-018 — One authoritative entitlements implementation

**Severity:** P1 HIGH  
**Status:** OPEN  
**Area:** Shared platform packages / Edge runtime

**Current risk:**

`@veyvio/entitlements` source is copied into an Edge `_shared` file by `sync:edge`.

This creates two physical implementations.

**Required fix:**

Preferred:
- import/bundle the canonical package directly in every runtime.

If runtime constraints temporarily prevent this:
- generate the Edge artifact deterministically
- add a CI byte/hash equality check
- generated copy must clearly state `DO NOT EDIT`
- CI must fail if stale

**Acceptance criteria:**

- [ ] Developers edit entitlement rules in one place only.
- [ ] Edge and web cannot ship different entitlement logic.
- [ ] Entitlement package receives its own lint/type/test CI lane.

---

# 11. Phase R6 — Modularise Command without rewriting it

---

## FIX-P1-019 — Stop growing `command-api/index.ts`

**Severity:** P1 HIGH  
**Status:** OPEN  
**Known file:** `Veyvio admin /supabase/functions/command-api/index.ts`

**Problem:**

The central Command API router/orchestrator has become a very large multi-domain concentration point.

**Decision:**

Do **not** rewrite Command.

Do **not** split into microservices yet.

Move toward a modular monolith.

**Target structure:**

```text
command-api/
  kernel/
    auth/
    request-context/
    tenant/
    application-scope/
    permissions/
    entitlements/
    idempotency/
    audit/
    errors/

  modules/
    operations/
    dispatch/
    journeys/
    jobs/
    drivers/
    fleet/
    yard/
    maintenance/
    safety/
    compliance/
    customers/
    interests/
    communications/
    documents/
    reports/
    finance/
```

**Migration method:**

- Extract one domain at a time.
- Preserve routes and response shapes.
- No big-bang rewrite.
- Add contract tests before moving a route.
- Keep one deployable API.

**Acceptance criteria:**

- [ ] No new substantial domain implementation is added directly to the root router.
- [ ] Extracted modules have explicit dependency boundaries.
- [ ] Kernel security code is shared and not duplicated.
- [ ] Existing endpoint compatibility remains tested.

---

## FIX-P1-020 — Standard request security context

**Severity:** P1 HIGH  
**Status:** OPEN  
**Area:** Command API

**Every authenticated request should resolve a single server-owned context:**

```ts
type RequestContext = {
  requestId: string
  userId: string
  companyId: string
  membershipId: string
  application: 'COMMAND' | 'DRIVER' | 'YARD' | 'COST_CONTROL' | 'EXECUTIVE'
  roleIds: string[]
  permissions: string[]
  entitlements: string[]
  depotIds: string[]
  deviceId?: string
}
```

Client input must not be authoritative for these fields.

**Acceptance criteria:**

- [ ] Domain route receives context, not raw tenant claims from request bodies.
- [ ] Forged `companyId` in body cannot switch tenant.
- [ ] Missing required context blocks the request.

---

## FIX-P1-021 — Declarative route security requirements

**Severity:** P1 HIGH  
**Status:** OPEN  
**Area:** Command API governance

**Target concept:**

```ts
route({
  auth: 'required',
  application: 'COMMAND',
  module: 'operations',
  permission: 'dispatch.assign',
  tenant: 'required',
  depot: 'required',
  idempotency: 'required',
  audit: 'dispatch.assignment.created',
})
```

**Acceptance criteria:**

- [ ] CI can identify an authenticated mutation route missing an audit declaration.
- [ ] CI can identify a tenant-owned route missing tenant policy.
- [ ] Security requirements are visible without reading the entire handler.

---

# 12. Phase R7 — Platform API contracts

---

## FIX-P1-022 — Replace real/mock union drift with domain ports

**Severity:** P1 HIGH  
**Status:** OPEN  
**Known files:**

- `Veyvio admin /src/lib/api/real-client.ts`
- `Veyvio admin /src/lib/api/mock-client.ts`
- `Veyvio admin /src/lib/api/types.ts`

**Target:**

```ts
interface ExceptionsPort {}
interface DriversPort {}
interface VehiclesPort {}
interface DispatchPort {}
interface BookingsPort {}
interface YardPort {}
```

Then:

```ts
class RealVeyvioApi implements VeyvioApi {}
class MockVeyvioApi implements VeyvioApi {}
```

**Acceptance criteria:**

- [ ] Missing method on either adapter is a compile failure.
- [ ] UI code depends on domain ports, not implementation union types.
- [ ] Mock fixtures cannot silently diverge from response schemas.

---

## FIX-P1-023 — Shared runtime schemas for API boundaries

**Severity:** P1 HIGH  
**Status:** OPEN  
**Area:** Platform contracts

**Use a shared schema system such as the existing Zod ecosystem for:**

- request bodies
- query parameters
- response models
- event payloads
- webhook payloads
- integration configuration
- versioned offline mutation payloads

**Acceptance criteria:**

- [ ] Server validates external input at runtime.
- [ ] Client types are derived from the same contract where practical.
- [ ] Unknown/malformed payloads fail predictably.
- [ ] Schemas are versioned for durable offline replay.

---

# 13. Phase R8 — Production truth and mock isolation

---

## FIX-P1-024 — Production artifacts must exclude operational mock graphs

**Severity:** P1 HIGH  
**Status:** OPEN  
**Area:** Yard, Command, Driver

**Current direction is improved**, including dynamic Command mock imports and fail-closed production mock flags.

The final standard should be stronger.

**Production artifact must contain:**

```text
zero operational demo datasets
zero demo auth bypasses
zero demo tenant bootstrap
zero simulated business-state fallbacks
```

where technically feasible.

**Required CI:**

- build production
- inspect module graph/artifact
- scan for forbidden operational mock imports
- run production runtime configuration guard

**Acceptance criteria:**

- [ ] A production build cannot load demo operational records by toggling a browser flag.
- [ ] Demo data packages are excluded from the production graph.
- [ ] Storybook/test/demo builds still work separately.

---

## FIX-P1-025 — No fake truth from empty/error states

**Severity:** P1 HIGH  
**Status:** OPEN  
**Area:** All apps

For every operational screen:

```text
loading ≠ empty
empty ≠ demo
error ≠ demo
not configured ≠ demo
```

**Required UI states:**

- loading
- genuine empty
- permission denied
- configuration required
- network unavailable
- server error
- stale cached data, explicitly labelled

**Acceptance criteria:**

- [ ] No operational UI fills unknown state with plausible fake records.
- [ ] Stale cached data shows freshness metadata.
- [ ] Error paths never display seeded production-looking records.

---

# 14. Phase R9 — Repository and dependency engineering

---

## FIX-P2-026 — Choose one authoritative package manager

**Severity:** P2 MEDIUM  
**Status:** OPEN

**Problem:**

Root tracks multiple lockfile ecosystems while CI primarily uses npm.

**Required fix:**

- Declare authoritative package manager in root metadata/docs.
- Keep only lockfiles intentionally required for specific isolated subprojects.
- Document exceptions.
- CI validates the expected lockfile.

**Acceptance criteria:**

- [ ] Clean clone install is deterministic.
- [ ] Contributors cannot accidentally update a competing root lockfile.

---

## FIX-P2-027 — Remove generated TypeScript build state from Git

**Severity:** P2 MEDIUM  
**Status:** OPEN

**Required fix:**

- Remove tracked `*.tsbuildinfo`.
- Add `*.tsbuildinfo` to appropriate `.gitignore`.
- Confirm CI rebuilds it locally.

---

## FIX-P2-028 — Give `packages/**` and `shared/**` first-class CI

**Severity:** P2 MEDIUM  
**Status:** OPEN

**Required minimum lanes:**

```text
lint
typecheck
unit tests
contract tests
```

for shared platform code.

**Acceptance criteria:**

- [ ] Shared contract regression fails before application builds.
- [ ] Entitlements and other security-sensitive packages have dedicated tests.

---

## FIX-P2-029 — Standardise supported Node/toolchain versions

**Severity:** P2 MEDIUM  
**Status:** OPEN

**Required fix:**

- Root toolchain policy.
- `.nvmrc` / `.node-version` or equivalent.
- `packageManager` metadata.
- CI uses same major runtime.
- App-level exceptions documented.

---

## FIX-P2-030 — Plan Driver framework modernisation separately

**Severity:** P2 MEDIUM  
**Status:** OPEN  
**Area:** Driver

Driver diverges from newer React/Vite/Capacitor generations and retains legacy Base44 packages.

**Do not combine this upgrade with P0 offline/security remediation.**

**Required sequence:**

1. Stabilise Driver safety/offline.
2. Lock behaviour with tests.
3. Remove unused Base44 packages.
4. Consolidate duplicate libraries.
5. Upgrade framework/tooling deliberately.
6. Device regression test after each stage.

---

## FIX-P2-031 — Consolidate duplicate Driver libraries

**Severity:** P2 MEDIUM  
**Status:** OPEN

Examples include multiple date and mapping ecosystems.

**Required fix:**

- Inventory actual usage.
- Choose platform-preferred library per responsibility.
- Remove unused dependency.
- Measure bundle impact.

Do not replace a mature dependency simply for uniformity if the alternate cannot support existing functionality.

---

# 15. Phase R10 — Code-quality and service decomposition

---

## FIX-P2-032 — Break up oversized Driver services by capability

**Severity:** P2 MEDIUM  
**Status:** OPEN

Large service files are a signal that UI/app services may be accumulating domain decisions.

**Target pattern:**

```text
UI orchestration
↓
driver application service
↓
shared domain contract
↓
Command
```

The handset may perform optimistic/local validation but the server owns final business/safety rules.

**Acceptance criteria:**

- [ ] No duplicated authoritative compliance calculation in Driver.
- [ ] No driver-side state transition can override server rules.
- [ ] Services are organised by bounded responsibility.

---

## FIX-P2-033 — Resolve Admin React hook correctness warnings

**Severity:** P2 MEDIUM  
**Status:** OPEN

Operational UI hook dependency warnings can produce stale closures and stale operational state.

**Required fix:**

- Review each warning.
- Fix dependency arrays or refactor unstable callbacks.
- Do not blanket-disable hook rules.
- Add regression tests to pages where stale data could affect actions.

---

## FIX-P2-034 — Production configuration must fail validation

**Severity:** P1 HIGH  
**Status:** OPEN  
**Known file:** `Veyvio admin /src/lib/api/real-client.ts`

**Current smell:**

Development-friendly localhost fallback exists in core client configuration.

**Required fix:**

- Development may use localhost.
- Production build/start must validate mandatory environment.
- Missing API URL is a hard configuration error.
- Never silently route production to localhost.

**Acceptance criteria:**

- [ ] Production mode without API URL fails build/start.
- [ ] Configuration validation is tested.

---

## FIX-P2-035 — Missing JWT expiry must not be treated as healthy

**Severity:** P2 MEDIUM  
**Status:** OPEN  
**Known file:** `Veyvio admin /src/lib/api/auth-session.ts`

**Required fix:**

For client refresh timing:

```text
missing exp
→ refresh/reauth required
```

not:

```text
missing exp
→ assume valid
```

Server verification remains authoritative.

---

# 16. Phase R11 — Governance and human review

---

## FIX-P1-036 — Replace placeholder CODEOWNERS security team

**Severity:** P1 HIGH  
**Status:** OPEN

**Required fix:**

- Replace placeholder security-review identity with a real GitHub user/team.
- Cover:
  - migrations
  - Command API
  - auth
  - RLS/security helpers
  - Executive sensitive actions
  - finance
  - release workflows
  - secret scanning
  - entitlements

**Acceptance criteria:**

- [ ] Required reviewers exist.
- [ ] Security-sensitive PR cannot merge without required review.

---

## FIX-P1-037 — Branch protection and required checks

**Severity:** P1 HIGH  
**Status:** OPEN

For `main`:

- required CI
- no force push
- no direct unreviewed merge for protected paths
- conversation resolution
- required security/code-owner review
- signed/verified release process where practical

---

## FIX-P1-038 — Independent review for Phase 0

**Severity:** P1 HIGH  
**Status:** OPEN

Phase 0 has a wide security and architecture blast radius.

Before merge:

- [ ] Independent review of tenant changes.
- [ ] Independent review of auth/session changes.
- [ ] Independent review of production mock/truth changes.
- [ ] Independent review of migrations.
- [ ] Independent review of release/security workflow changes.

---

# 17. Phase R12 — Dependency and supply-chain hardening

---

## FIX-P2-039 — Add dependency update automation

**Severity:** P2 MEDIUM  
**Status:** OPEN

Use Dependabot/Renovate or equivalent with controlled grouping.

**Rules:**

- Security patches fast-tracked.
- Framework major updates separate from security patches.
- Lockfile changes reviewed.
- No auto-merge of high-risk auth/build changes without tests.

---

## FIX-P2-040 — Standard dependency vulnerability policy

**Severity:** P2 MEDIUM  
**Status:** OPEN

Define one repo policy:

- production critical => block
- production high => block unless explicit time-limited waiver
- dev-only vulnerabilities => assessed separately
- waivers require owner, reason, expiry
- no permanent silent allowlists

---

# 18. Phase R13 — Release engineering

---

## FIX-P1-041 — Build once, verify exact release artifact

**Severity:** P1 HIGH  
**Status:** OPEN

Every release pipeline should bind:

```text
commit SHA
source tree
dependency lock
build artifact hash
security scan
release signature
environment
```

**Acceptance criteria:**

- [ ] Artifact scanned is artifact deployed.
- [ ] Rebuild drift is detectable.
- [ ] Release provenance is retained.

---

## FIX-P2-042 — Protected Play/App Store publication flow

**Severity:** P2 MEDIUM  
**Status:** OPEN

Current publication still contains manual/scaffold elements.

Long-term target:

- protected GitHub environment
- dedicated release credential
- least privilege
- staged/internal track first
- manual approval before production rollout
- release notes tied to commit
- rollback procedure documented

---

# 19. Phase R14 — Observability and production operations

---

## FIX-P1-043 — Add common production observability

**Severity:** P1 HIGH  
**Status:** OPEN

Domain audit logs are not a replacement for technical observability.

Add a common redacted telemetry model using Sentry/OpenTelemetry or equivalent.

**Minimum signals:**

### API
- request ID
- route
- status
- latency
- error class
- release/version
- tenant identifier in privacy-safe form where required

### Driver
- crashes
- outbox queue depth
- oldest pending age
- reconciliation count
- sync failures
- media upload failures
- app version/device OS

### Yard
- bootstrap failures
- sync failures
- mutation failures
- realtime/disconnect health

### Integrations
- webhook failures
- retry counts
- provider latency
- configuration errors

**Never log:**

- passwords
- refresh tokens
- access tokens
- TOTP seeds
- full private keys
- unnecessary passenger sensitive data

---

## FIX-P2-044 — Standard error taxonomy

**Severity:** P2 MEDIUM  
**Status:** OPEN

Introduce typed/common errors:

```text
VALIDATION
AUTHENTICATION
AUTHORIZATION
TENANT_BOUNDARY
ENTITLEMENT
SAFETY_GATE
CONFLICT
IDEMPOTENCY_CONFLICT
CONFIGURATION
NETWORK_RETRYABLE
UPSTREAM_RETRYABLE
PERMANENT_REJECTION
RECONCILIATION_REQUIRED
INTERNAL
```

**Acceptance criteria:**

- [ ] Driver can distinguish retryable from permanent.
- [ ] UI can render truthful recovery guidance.
- [ ] Telemetry groups meaningful failures.

---

# 20. Phase R15 — Accessibility and performance

---

## FIX-P2-045 — Accessibility gates across operational apps

**Severity:** P2 MEDIUM  
**Status:** OPEN

Website already has stronger accessibility coverage than the operational apps.

Add:

- automated axe checks
- keyboard-only navigation tests
- focus management
- semantic labels
- modal/drawer focus traps
- contrast checks
- screen-reader smoke for critical flows

Critical flows:

- login
- dispatch
- Driver duty
- vehicle check
- defect report
- incident report
- Yard task/action
- safety warnings

---

## FIX-P2-046 — Bundle/performance budgets

**Severity:** P2 MEDIUM  
**Status:** OPEN

Add per-app budgets.

Monitor:

- entry JS
- route chunks
- map libraries
- image payloads
- time-to-interactive
- mobile startup
- memory pressure

Lazy-load non-critical:
- maps
- reporting tools
- image/studio tools
- admin-only heavy components

Do not lazy-load safety-critical state required for immediate operation.

---

# 21. Phase R16 — Database migration and environment hygiene

---

## FIX-P1-047 — Remove future customer/operator provisioning from schema migrations

**Severity:** P1 HIGH  
**Status:** OPEN  
**Known examples:**

- `202607240007_link_laronelaing_bct_membership.sql`
- `202607250004_link_admin_bct_membership.sql`

**Problem:**

Universal migration history contains named account/customer provisioning.

**Do not rewrite applied migration history casually.**

Instead:

1. Mark old migrations as historical bootstrap debt.
2. Stop adding new customer/operator provisioning migrations.
3. Create explicit environment bootstrap tooling.
4. Create explicit audited operator provisioning tooling.
5. Add CI rule detecting obvious named-account provisioning in new schema migrations.

**Target structure:**

```text
migrations/
  schema and deterministic security evolution only

bootstrap/
  environment setup

fixtures/
  test/demo data

ops/
  explicit customer/user provisioning
```

**Acceptance criteria:**

- [ ] New clean production DB does not automatically provision customer staff unless an explicit bootstrap command is run.
- [ ] Provisioning is attributable and auditable.

---

## FIX-P1-048 — Fresh-database migration gate

**Severity:** P1 HIGH  
**Status:** OPEN

CI should create a clean database and apply the full migration chain.

Then run:

- schema checks
- RLS inventory
- core auth/tenant smoke
- representative write/read
- critical indexes/constraints
- no missing dependency on manual database edits

---

# 22. Phase R17 — Testing architecture

---

## FIX-P1-049 — Stop testing reimplementations of production logic

**Severity:** P1 HIGH  
**Status:** OPEN

Security and safety tests must call:

- actual production helper
- actual route
- actual database policy
- actual build artifact

not a copied implementation.

**Acceptance criteria:**

- [ ] Tenant-storage test imports production key builder.
- [ ] Production guard tests inspect exact build.
- [ ] Security artifact tests run the built artifact.
- [ ] RLS tests execute against Postgres policies.

---

## FIX-P1-050 — Add negative-path security matrix

**Severity:** P1 HIGH  
**Status:** OPEN

Test:

- wrong company
- wrong application
- wrong role
- missing membership
- suspended membership
- revoked invitation
- expired support grant
- disabled entitlement
- missing depot permission
- forged parent ID
- stale client state
- duplicate idempotency key with changed body
- VOR vehicle
- ineligible driver

---

# 23. Phase R18 — Veyvio Golden Operational Journey

This is the final platform release proof.

**Severity:** P0 RELEASE GATE  
**Status:** OPEN

The test must demonstrate a genuine end-to-end operating day.

```text
Booking / service demand
→ planning
→ route/job/run creation
→ driver allocation
→ vehicle allocation
→ publish duty
→ Driver receives duty
→ driver sign-on
→ compliance revalidation
→ vehicle check
→ duty/journey execution
→ live dispatch change
→ passenger/job events
→ defect/incident
→ Yard receives action
→ VOR/safety state where applicable
→ maintenance/Yard resolution
→ vehicle handback
→ driver closeout
→ Command audit/compliance evidence
→ operational report
```

### Mandatory failure scenarios

- [ ] Airplane mode.
- [ ] Poor/intermittent network.
- [ ] App force-kill after offline save.
- [ ] Device restart.
- [ ] Duplicate submission.
- [ ] Stale mutation replay.
- [ ] Rejected offline mutation.
- [ ] Expired driver compliance.
- [ ] VOR vehicle.
- [ ] Last-minute driver substitution.
- [ ] Last-minute vehicle substitution.
- [ ] Tenant switch.
- [ ] Session revocation.
- [ ] Media upload interruption.
- [ ] Server transient failure.
- [ ] Notification delivery failure.
- [ ] Command unavailable temporarily.
- [ ] Driver unavailable temporarily.
- [ ] Yard unavailable temporarily.

### Device matrix

- [ ] Real Android handset.
- [ ] Real iPhone.
- [ ] Browser Command desktop.
- [ ] Tablet-size Command/Yard where intended.

### Pass condition

A failure may delay work, but it must not:

```text
invent facts
lose accepted evidence
cross tenant boundaries
silently discard an action
bypass a safety rule
manufacture financial data
hide a reconciliation problem
```

---

# 24. Issues that are NOT currently open findings

Do not spend engineering time "fixing" these unless new evidence proves a regression.

### NOT-ISSUE-001 — Old open join-table RLS policies

Older policies allowed broad authenticated reads for certain join tables, but later tenant-hardening migrations already drop those policies, add parent-company RLS checks and same-company triggers.

**Action:** Keep regression tests; do not report the historical policy as currently unfixed.

### NOT-ISSUE-002 — `--no-verify-jwt` by itself

Command performs its own authentication/token validation.

**Real concern:** service-role blast radius and consistent server-side request context.

### NOT-ISSUE-003 — FCM private key leak

The current FCM secret scan issue is caused by PEM parser/test marker strings and dummy fixture material.

**Real concern:** scanner precision without weakening real secret detection.

### NOT-ISSUE-004 — Seven Executive auth failures

Those failures are currently build-order/artifact-availability failures.

**Action:** Repair pipeline ordering, then evaluate the actual security assertions.

### NOT-ISSUE-005 — Any file named `mock-*` is automatically a production vulnerability

The relevant question is reachability and runtime/build inclusion.

**Action:** Keep demo/test tooling isolated and prove it cannot become operational truth in production.

---

# 25. Recommended execution order

Do not run all fixes simultaneously.

## Wave 1 — Green baseline

1. FIX-R0-001 Admin typecheck
2. FIX-R0-002 Cost Control build
3. FIX-R0-003 Executive pipeline
4. FIX-R0-004 secret scanner
5. FIX-R0-005 tenant test authentication
6. FIX-R0-006 Android release ordering

**Exit:** same commit has required CI green.

---

## Wave 2 — Driver data safety

1. FIX-P0-001 durable outbox
2. FIX-P0-002 reconciliation queue
3. FIX-P0-003 tenant-scoped offline storage
4. FIX-P0-004 real storage tests
5. FIX-P1-005 durable media
6. FIX-P1-006 server safety-gate proof

**Exit:** no false queued-success and no silent offline discard.

**Wave 2 gate:** Architecture APPROVED. Implementation TESTED — DEVICE BLOCKER FOUND. `e6bf354` failed the device evidence gate (`veyvio_driver_media` v1 with zero stores; walkaround did not false-succeed). DEVICE_VERIFIED OPEN. ACCEPTED NO. Wave 3 BLOCKED. Narrow media-schema / offline-submit patch only; preserve the handset empty v1 media DB as the migration fixture. Do not change storage architecture.

### Handset acceptance evidence to capture

Record facts, not screenshots-only:

- Driver build / git SHA
- Device and OS
- Authenticated `auth/driver-session` (or `driver/session`) payload: `userId`, `companyId`, `membershipId` (= `company_memberships.id`), `driverId`
- Proof that invalid/missing membership yields `OFFLINE_CONTEXT_NOT_READY` (no fallback storage identity)
- Queued mutation idempotency keys (defect + evidenced vehicle check)
- Force-stop and reboot: both queue items and media still present
- After reconnect/flush: Command record IDs; one authoritative row per idempotency key; local drop only after server acceptance
- Separate 403 path: status `RECONCILIATION_REQUIRED` after force-stop and reboot; no automatic Command call until explicit revalidate → `PENDING`

Invariant: once Driver says an operational action is saved on the device, that action and required evidence survive process death/reboot until Command accepts it or it remains visibly recoverable as reconciliation-required.

### Device verification protocol (required before ACCEPTED)

Prerequisites: deploy `command-api` from `e6bf354` to the handset environment; confirm `GET auth/driver-session` (and `driver/session`) returns real `userId`, `companyId`, `membershipId` (`company_memberships.id`), `driverId`; confirm missing membership cannot obtain offline storage context.

Handset sequence (one defect **and** one vehicle check with image/signature):

1. ONLINE — sign in; confirm company + membership.
2. AIRPLANE MODE — submit defect; UI must say saved on device. Submit vehicle check with evidence; UI must say saved on device.
3. FORCE STOP — reopen; both records and media still exist.
4. REBOOT — reopen; both still exist.
5. RECONNECT — flush; Command has exactly one authoritative record per idempotency key; local items drop only after server acceptance.
6. Separate 403 path — queued op rejected as VOR/ineligible → `RECONCILIATION_REQUIRED` survives force-stop and reboot; automatic sync must not call Command for it; explicit `revalidateOpsCommand` returns it to `PENDING`.
7. Storage-failure (if practical) — IDB/media write fail must show could-not-save, never queued-success.

### Non-blocking follow-ups (do not reopen Wave 2 architecture)

- FIX-P2-W2-A — `session.service.js` currently repeats `userId` on the returned session object; remove the duplicate key.
- FIX-P1-W2-B — make destructive media helpers tenant-explicit (delete currently keyed mainly by media id).
- FIX-P2-W2-C — persist media as Blob/Uint8Array via IDB structured clone instead of a JS number array, if large photos hit quota/memory on device.

---

## Wave 3 — Identity and tenant hardening

1. FIX-P1-007 Command session custody
2. FIX-P1-008 Driver secure storage
3. FIX-P1-009 MFA secret protection
4. FIX-P1-010 privileged audit
5. FIX-P0-011 full RLS proof
6. FIX-P1-012 service-role reduction
7. FIX-P1-013 structural tenant relationships

**Exit:** tenant and identity security independently reviewed.

---

## Wave 4 — Truth and commercial controls

1. FIX-P1-014 transactional audit/outbox
2. FIX-P1-015 idempotency
3. FIX-P0-016 finance fail-closed
4. FIX-P0-017 entitlements fail-closed
5. FIX-P1-018 entitlement single source

**Exit:** no synthetic live finance and no fail-open paid capability.

---

## Wave 5 — Platform architecture

1. FIX-P1-019 Command modularisation
2. FIX-P1-020 request context
3. FIX-P1-021 declarative route policy
4. FIX-P1-022 domain ports
5. FIX-P1-023 shared schemas

**Exit:** new feature work can be added without increasing the monolithic hotspot.

---

## Wave 6 — Production artifact and engineering consistency

1. FIX-P1-024 mock artifact exclusion
2. FIX-P1-025 truthful empty/error states
3. FIX-P2-026 through FIX-P2-035 repository/toolchain fixes
4. governance/review fixes
5. release/supply-chain fixes
6. migration hygiene

---

## Wave 7 — Production operations

1. observability
2. error taxonomy
3. accessibility
4. performance budgets
5. negative-path matrix
6. Golden Operational Journey

**Exit:** pilot-production acceptance decision.

---

# 26. Definition of done for every fix

An issue may move to `ACCEPTED` only when all applicable boxes are complete.

- [ ] Implementation complete.
- [ ] No new feature regression.
- [ ] Unit tests.
- [ ] Integration tests.
- [ ] Negative/failure test.
- [ ] Tenant/security test where applicable.
- [ ] Offline restart test where applicable.
- [ ] Production build test where applicable.
- [ ] Documentation updated.
- [ ] Audit/telemetry updated where applicable.
- [ ] Independent review for P0/P1.
- [ ] CI green.
- [ ] Device verification for Driver/Yard/mobile.
- [ ] Evidence recorded below the issue.

Suggested evidence block:

```md
### Evidence
- Commit:
- PR:
- Tests:
- CI run:
- Device:
- Database migration:
- Reviewer:
- Remaining limitations:
```

---

# 27. Product rule during remediation

Until the P0 stop-ships are closed:

> Prefer vertical operational completion over horizontal feature expansion.

New features should only proceed if they:

- close a named hard-rule gap,
- support remediation,
- are required to prove the Golden Journey,
- or are isolated enough not to increase operational/safety risk.

The planned configurable/custom Service feature should therefore be designed against stable platform primitives after the operational/security baseline is reliable.

It should become a configurable service definition layered on top of authoritative domains, not a replacement for Jobs, Journeys, Duties, Bookings, Compliance, Dispatch, Driver, or Yard truth.

---

# 28. Architecture target after remediation

```text
┌──────────────────────────────────────────────────────────────┐
│                         VEYVIO APPS                          │
│ Command │ Driver │ Yard │ Cost Control │ Executive │ Web    │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                   PLATFORM CONTRACT LAYER                   │
│ Schemas │ Domain ports │ IDs │ Errors │ Events │ Versions   │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                      COMMAND KERNEL                          │
│ Auth │ Tenant │ App Scope │ Permission │ Entitlement        │
│ Depot │ Idempotency │ Request ID │ Audit │ Safety           │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                     DOMAIN MODULES                           │
│ Operations │ Dispatch │ Drivers │ Fleet │ Yard               │
│ Compliance │ Maintenance │ Safety │ Customers │ Finance      │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│             TRANSACTIONAL TRUTH / EVENT LAYER                │
│ Domain mutation │ Audit event │ Outbox │ Idempotency         │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                         DATA                                 │
│ PostgreSQL │ RLS │ Storage │ Integration credentials        │
└──────────────────────────────────────────────────────────────┘
```

---

# 29. Final release criteria

Veyvio should not be represented as production-ready until:

- [ ] Required CI is green on the release commit.
- [ ] Tenant isolation is certified against live/fresh database state.
- [ ] Driver offline writes are durable and cannot return false success.
- [ ] Rejected offline evidence cannot silently disappear.
- [ ] Mobile credentials use secure storage.
- [ ] Command session architecture is hardened.
- [ ] MFA seed exposure is addressed.
- [ ] Privileged actions are durably auditable.
- [ ] Material business mutations have transactional audit/outbox guarantees.
- [ ] Finance cannot fall back to synthetic data in live mode.
- [ ] Entitlements fail closed after explicit backfill.
- [ ] Production artifacts cannot load operational mocks.
- [ ] New schema is proven from a fresh migration.
- [ ] Service-role database use is constrained and reviewed.
- [ ] Real CODEOWNERS/review protection exists.
- [ ] Release artifact provenance is verifiable.
- [ ] Production observability is active.
- [ ] Golden Operational Journey passes on Android and iOS.
- [ ] Failure scenarios pass without invented truth, silent loss, or safety bypass.

---

# 30. Engineering decision

**Do not rebuild Veyvio.**

The remediation strategy is:

```text
stabilise
→ make truth durable
→ harden security
→ prove tenancy
→ make audit transactional
→ modularise contracts and Command
→ standardise engineering
→ prove the operational journey
→ resume product expansion
```

That gives Veyvio the strongest path from a broad advanced platform into a production-grade transport operating system without discarding the domain work already built.
