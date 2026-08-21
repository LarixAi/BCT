# Veyvio Production Readiness Blueprint v1

**Status:** Authoritative — engineering execution programme  
**Programme:** `VEYVIO-PROD` — Production Stabilisation  
**Version:** 1.0  
**Adopted:** 17 August 2026  
**PROD-0:** Partial — remote baseline verified; this document must land on `phase0/reproducibility` and pass CI before `production-stabilisation/2026` is created  
**Audience:** Engineering, product, operations, QA  
**Owner:** Engineering programme lead

This is the **engineering execution authority** for taking Veyvio from advanced pre-production into a controlled real-world pilot, then first paying customer, then staged commercial GA.

It is designed to be executed by engineers. Each track has a **boundary**, **owner**, **dependency**, and **measurable exit gate**.

| Layer | Authority | Role |
|-------|-----------|------|
| Product / architecture | [`Veyvio_Combined_Blueprint_v2.0.docx`](../blueprint/Veyvio_Combined_Blueprint_v2.0.docx) | What Veyvio is; Hard Rules F-01–F-35; product gates |
| **Production engineering** | **This document** | How we close production; freeze; tracks PR-00–PR-12; Gate A/B/C |
| Gap tracker | [veyvio-blueprint-alignment-plan.md](./veyvio-blueprint-alignment-plan.md) | Blueprint → code gaps |
| Historical gates tracker | [veyvio-production-gates.md](./veyvio-production-gates.md) | Gate 1–4 work already in flight |
| Wave 3F | [wave-3f-service-role-rls-isolation.md](./wave-3f-service-role-rls-isolation.md) | Privileged-access / RLS closure |
| F-03 | [veyvio-f03-mock-replacement-plan.md](./veyvio-f03-mock-replacement-plan.md) | Production truth / mock replacement |
| Reproducibility | [veyvio-phase0-freeze.md](./veyvio-phase0-freeze.md) | Phase 0 freeze branch |

**Conflict rule:** Combined Blueprint v2.0 remains product authority. This programme does not invent product scope. Where this document and older plan trackers disagree on **sequence or freeze**, this document wins until `VEYVIO-PROD` closes.

---

## 1. North-star architecture

The production architecture we are protecting is:

```text
                         VEYVIO PLATFORM
                               │
              ┌────────────────┼────────────────┐
              │                │                │
           Command           Driver            Yard
              │                │                │
              └─────────────── API ─────────────┘
                               │
                     Authenticated actor
                               │
                  Tenant/User-scoped DB client
                               │
                        PostgreSQL + RLS
                               │
                 Company-owned operational data
```

Privileged operations exist outside that normal path:

```text
Normal customer operation
        │
        ▼
UserScopedDb
        │
        ▼
RLS
        │
        ▼
Tenant data


Exceptional system operation
        │
        ▼
Explicit capability
        │
        ├── AuthAdmin
        ├── StorageSigner
        ├── BillingAdmin
        ├── PlatformSupport
        └── Migration/System Worker
                │
                ▼
           PrivilegedDb
```

That distinction is a **permanent architectural rule** (ADR-002 in §24).

---

## 2. Production programme structure

One temporary engineering programme:

**VEYVIO-PROD — Production Stabilisation**

No major new features enter the production line until this programme closes.

### Critical path

```text
Repository Authority
        │
        ├───────────────┐
        ▼               ▼
Wave 3F Security     Production Truth
        │               │
        ▼               │
Relational Integrity    │
        │               │
        └───────┬───────┘
                ▼
       Reproducible CI / DB
                │
                ▼
        Release Candidate
                │
      ┌─────────┼──────────┐
      ▼         ▼          ▼
   SaaS      Mobile    Reliability
      │         │          │
      └─────────┼──────────┘
                ▼
        Controlled Pilot
                │
                ▼
       First Paying Customer
                │
                ▼
        Staged Commercial GA
```

**Wave 3G is deliberately not on this critical path.**

Close Wave 3F first. Do not combine a tenancy architecture evolution (`organisation_id`) with production stabilisation.

---

## 3. TRACK PR-00 — Engineering control

**Priority:** P0

Before changing more code, establish engineering control.

### Actions

Create a formal feature freeze.

**Allowed**

- bug fixes
- security fixes
- production-readiness work
- test improvements
- release engineering
- necessary operational fixes

**Temporarily blocked**

- new major modules
- large redesigns
- custom-service architecture
- large navigation changes
- new transport product areas
- non-critical refactors

### Labels / milestones

`VEYVIO-PROD` · `PROD-P0` · `PROD-P1` · `PROD-P2` · `SECURITY` · `TENANCY` · `PRODUCTION-TRUTH` · `RELEASE` · `MOBILE` · `SAAS` · `RELIABILITY`

Every production issue must have:

| Field | Required |
|-------|----------|
| Owner | yes |
| Severity | yes |
| Affected application | yes |
| Security impact | yes |
| Tenant impact | yes |
| Migration required? | yes |
| Rollback path | yes |
| Tests required | yes |
| Release gate affected | yes |
| Exit gate | yes |

### Exit gate

**PASS** only when there is one visible production backlog and every P0 has an owner.

---

## 4. TRACK PR-01 — Repository authority

**Priority:** P0

This is first because security means little if we don't know which code represents production.

### Target

`main` becomes the only production authority.

Not:

`main` + `phase0` + Wave branches + someone's laptop

But:

```text
feature/security branch
        ↓
PR
        ↓
required CI
        ↓
main
        ↓
immutable release SHA
        ↓
release artefacts
```

### Engineering work

Tag the current important heads before consolidation.

Then establish a temporary branch such as:

`production-stabilisation/2026`

Bring in only the known-good production work.

Do not blindly merge everything.

Review:

- `main`
- `phase0/reproducibility`
- Wave 3F branches
- storage isolation changes
- fresh DB changes
- F-03 changes
- CI changes

For every security migration, preserve chronological migration history.

### Branch protection

`main` should require:

- PR
- review
- resolved conversations
- build
- typecheck
- tests
- fresh DB
- tenant isolation
- storage isolation
- secret scan
- production-truth scan
- migration verification

No ordinary direct pushes.

### Exit gate

One SHA must answer: **What exactly is Veyvio production?**

If we cannot answer that with a commit hash, this gate fails.

---

## 5. TRACK PR-02 — Wave 3F privileged-access closure

**Highest technical priority**

**Priority:** P0 / STOP-SHIP

The most important remaining architecture problem.

Do **not** simply replace strings until the count reaches zero.

Every use must be classified.

### Source inventory (PROD-0 / PROD-1, 17 August 2026)

Do not rebuild the existing static gate. Extend it.

| Gate | Path |
|------|------|
| Allowlist | `Veyvio admin /scripts/service-role-admin-allowlist.mjs` |
| CI test | `Veyvio admin /scripts/service-role-allowlist.unit.mjs` |
| npm script | `test:service-role-allowlist` |

Already runs with fresh-DB, tenant-isolation, FORCE-RLS, same-company-trigger, and storage-isolation tests.

Three classes:

| Class | Meaning |
|-------|---------|
| `authority_core` | Client factory / tenant helpers |
| `privileged` | Genuine privileged capability (Auth, storage signing, billing, platform, support, seeds, Executive security) |
| `company_scoped_service_role` | Transitional tenant CRUD still on service-role + app filters — prefer tenant-db / future UserScopedDb |

**Source-confirmed count: 31 `company_scoped_service_role` modules remain.**

1. `application-scopes`
2. `attendance`
3. `audit-service`
4. `body-condition`
5. `compliance-engine`
6. `defect-automation`
7. `document-expiry-notifications`
8. `domain-events`
9. `driver-activation-release`
10. `driver-devices`
11. `driver-job-execution`
12. `driver-ops-notifications`
13. `driver-requirements`
14. `driver-training-centre`
15. `duty-closeout`
16. `duty-publication`
17. `entitlements`
18. `fcm-send`
19. `holiday-balance`
20. `hubs`
21. `interest-submissions`
22. `journey-handlers`
23. `journey-sequence-move`
24. `notifications`
25. `operational-exceptions`
26. `operational-trip-assign`
27. `override-audit`
28. `projections`
29. `vehicle-reports`
30. `yard-mutation-handlers`
31. `command-api/index`

That distinction is exactly ADR-PR-002. Zero ordinary tenant CRUD on service-role is the conversion target; retained privileged entries must still be reviewed so privilege is exposed through named capabilities, not a generic `admin` object.

### Classification

#### Type A — normal tenant CRUD

Examples: jobs, drivers, vehicles, routes, defects, maintenance, attendance, documents, operations.

These must use:

```text
authenticated request
     ↓
UserScopedDb
     ↓
RLS
```

#### Type B — genuine privileged capability

Potential examples:

- Supabase Auth administration
- signed storage URL creation
- billing webhook reconciliation
- platform administration
- controlled support tooling
- database repair/migration

These may retain privilege.

Not through a generic `admin.from(...)` scattered throughout the codebase.

Instead:

- `authAdmin`
- `storageSigner`
- `billingAdmin`
- `platformAdmin`

Each exposes the minimum necessary capability.

### Conversion batches (dependency-directed, 17 August 2026)

Do not convert 31 modules in one PR. Product grouping (1A–1F) is **not** the PR order.

Call-path register: [prod-1-service-role-classification.md](./prod-1-service-role-classification.md).

`userScopedDb` is disabled. Batches below are **companyScopedServiceDb\* wraps** (existing Wave 3F pattern), not RLS cutover.

Do not start with `command-api/index`, `audit-service` as a generic admin leftover, `entitlements`, or `application-scopes`.

| Batch | Modules | Why this order |
|-------|---------|----------------|
| **01** | `duty-closeout`, `driver-job-execution`, `document-expiry-notifications` | Small Type A leaves; `companyId` already in signature |
| **02** | `compliance-engine`, `operational-exceptions`, `defect-automation` | Small; exceptions before yard |
| **03** | `driver-devices`, `driver-activation-release`, `vehicle-reports`, `hubs` | Independent leaves |
| **04** | `journey-sequence-move`, `journey-handlers` | Same family as already-wrapped sequence modules |
| **05** | `yard-mutation-handlers` | After defect-automation |
| **06** | `driver-training-centre` → `driver-requirements` | Training before requirements |
| **07–09** | `attendance`, `holiday-balance`, `body-condition` | Large self-auth leaves; one PR each |
| **10** | `notifications` then `driver-ops-notifications` | Helper hub (10 importers) |
| **11** | `override-audit`, `duty-publication` | Publication has 4 importers |
| **12** | `projections` | 3210 loc; own PR |
| **13** | `operational-trip-assign` | After publication + projections |
| **14** | named capabilities: `audit-service`, `domain-events`, `fcm-send` | ADR-PR-002 |
| **15** | `interest-submissions` | Mixed domain + integration keys |
| **16** | `application-scopes`, `entitlements` split | Request bootstrap |
| **17** | `command-api/index` decomposed | AuthAdmin + StorageSigner + remaining Type A |

Companion: [wave-3f-service-role-rls-isolation.md](./wave-3f-service-role-rls-isolation.md).

### Per-module micro-gate

For every module:

```text
BEFORE
service-role admin
    +
company_id application filter

AFTER
authenticated actor
    ↓
UserScopedDb / tenant-db
    ↓
PostgreSQL RLS
    ↓
application filtering as defence-in-depth
```

Then prove:

- own-company SELECT / INSERT / UPDATE / DELETE where permitted
- other-company SELECT invisible/denied; INSERT / UPDATE / DELETE denied
- anonymous denied
- invalid membership denied
- suspended/disabled actor behaviour correct
- same-company FK integrity
- unit/domain tests
- service-role allowlist
- fresh DB
- tenant isolation
- storage isolation when relevant
- Command API smoke
- typecheck
- build
- full CI

Only then remove the module from `company_scoped_service_role`. The counter moves 31 → 30 → … → 0 ordinary tenant service-role paths. Zero is not enough by itself: retained privileged entries must still satisfy ADR-PR-002.

### Permanent CI invariant

```text
PRODUCTION MODULE
     ↓
generic privileged DB client


        = CI FAILURE
```

Only approved capability wrappers may access privileged credentials.

### Exit criteria

Wave 3F cannot close until:

- Unclassified privileged imports = **0**
- Ordinary tenant CRUD using service role = **0**
- Privileged exceptions without justification = **0**
- Privileged exceptions without owner = **0**
- Privileged exceptions without tests = **0**

That is much stronger than simply saying “31 became zero.”

---

## 6. TRACK PR-03 — Structural tenant integrity

**Priority:** P0/P1

The residual 40+ dual-FK / same-company relationships should not all automatically become P0.

Classify them.

Suppose:

- `job.company_id` = Company A
- `job.driver_id` = Driver belonging to Company B

Even with RLS, that relationship should ideally be **structurally impossible**.

### Risk classification

**P0** — could create:

- cross-company disclosure
- cross-company mutation
- cross-company assignment
- cross-company document access
- cross-company financial association
- cross-company dispatch

Fix before pilot.

**P1** — application + RLS strongly protect it, but structural enforcement is still desirable.

Can follow after controlled pilot if formally accepted.

**P2** — low-risk internal integrity improvement.

### Preferred database protections

Depending on schema:

- composite foreign keys
- CHECK constraints
- database triggers
- secured RPC
- tenant ownership helper

Application checks remain defense-in-depth. They are **not** the final authority.

### Migration pattern

Never immediately add a constraint to potentially dirty production data.

```text
audit existing data
      ↓
repair violations
      ↓
add constraint NOT VALID
      ↓
validate constraint
      ↓
activate enforcement
```

### Exit gate

P0 cross-company integrity gaps = **0**

Other residuals require: owner, reason, risk, closure milestone, expiry/review date.

---

## 7. TRACK PR-04 — Production Truth / F-03

**Priority:** P0 / STOP-SHIP

This is a product-integrity requirement, not cosmetic cleanup.

Veyvio must obey this rule:

**Unavailable real operational data must never silently turn into believable fake operational data.**

Correct:

```text
API unavailable
       ↓
Unable to load jobs
Retry
```

Incorrect:

```text
API unavailable
       ↓
show demo jobs
```

Companion: [veyvio-f03-mock-replacement-plan.md](./veyvio-f03-mock-replacement-plan.md). Combined Blueprint Hard Rule **F-03**.

### Production code boundary

```text
src/
    Production code

test-support/
    factories and builders

e2e/fixtures/
    Playwright data

dev-only/
    explicit demo/dev mode
```

Runtime production code may never depend on the last three.

### Add CI scanning

Block:

- `return mockJobs;`
- `return demoDrivers;`
- `realData ?? SAMPLE_DATA;`
- `catch { return fixtures; }`

Block runtime imports containing designated fixture/mock modules.

### Failure tests

Intentionally inject:

- HTTP 500
- network timeout
- empty database
- expired authentication
- 403
- malformed response

Then assert: **fake operational rows displayed = 0**

### Exit gate

- Production fixture imports = **0**
- Production believable fallback records = **0**
- Production fake acknowledgement / write behaviour = **0**

Playwright can still use mocks. The application cannot.

---

## 8. TRACK PR-05 — Database and CI reproducibility

**Priority:** P0

A production system should be rebuildable from the repository.

Database truth:

```text
empty PostgreSQL/Supabase
        ↓
repository migrations
        ↓
complete schema
        ↓
RLS
        ↓
functions
        ↓
storage policies
        ↓
tests
        ↓
PASS
```

No manual mystery SQL.

### Required permanent release gates

- fresh DB
- tenant isolation
- storage isolation
- same-company integrity
- migration ordering
- migration immutability
- Command API smoke
- Driver build
- Admin build
- Yard build
- Website build
- Cost Control build
- Executive build
- secret scan
- dependency scan
- production-truth scan

### Migration rule

Once deployed anywhere shared: **never edit that migration.** Fix forward with another migration.

### Build provenance

Every release should record:

- Veyvio version
- Git SHA
- migration head
- dependency-lock hash
- build ID
- environment
- Android checksum
- iOS build
- web artefact
- deployment time

### Exit gate

A clean checkout must reproduce the release candidate.

---

## 9. TRACK PR-06 — Secrets, environments and supply-chain security

**Priority:** P0/P1

This is its own technical track.

The Driver debug CI pipeline has used an example Supabase host. That is acceptable only for explicitly non-production builds.

It must be impossible for a production artefact to contain:

- `example.supabase.co`
- `localhost`
- test credentials
- development API URL
- debug signing identity

### Environments

Define explicitly:

- local
- test
- development
- staging
- production

No ambiguous `ENV=prod-ish`.

### Secrets

Production secrets live in:

- CI secret store
- platform secret manager
- mobile signing vault

Never:

- `.env` committed
- hardcoded TypeScript
- frontend bundle
- documentation containing real secrets

### Supply chain

Introduce:

- dependency vulnerability scanning
- lockfile verification
- secret scanning
- GitHub dependency alerts
- pinned CI actions
- minimum permissions on workflows

### Exit gate

Final production artefacts contain **zero** development credentials/endpoints.

**Status (21 Aug 2026):** Action SHA pins + default `contents: read`; Dependabot weekly; `security:audit` on Yard/Admin/Driver CI; Admin/Yard/Driver `assert-release-config` on release paths; Admin `VALIDATE_PRODUCTION_ENV` no longer treats `CI=true` as production.

---

## 10. TRACK PR-07 — SaaS commercial architecture

**Priority:** P1

Required for first paying customer / self-service commercial launch, **not** necessarily for a controlled manually provisioned pilot.

Do not rebuild the entitlement foundation. **Extend it.**

Companion: [veyvio-multi-tenant-saas-roadmap.md](./veyvio-multi-tenant-saas-roadmap.md).

### Target lifecycle

```text
Sign up
   ↓
Create company
   ↓
Owner membership
   ↓
Select plan
   ↓
Checkout
   ↓
Payment provider
   ↓
Signed webhook
   ↓
Subscription state
   ↓
Entitlements
   ↓
Create first depot
   ↓
Onboarding
   ↓
Veyvio Command
```

### Subscription state machine

Something similar to:

- `trialing`
- `active`
- `past_due`
- `grace_period`
- `suspended`
- `cancelled`

The exact commercial rules must become a PM + engineering ADR.

For example: what does Veyvio do if payment becomes `past_due`? Do we block dispatch? Probably not immediately.

Possible policy (example, not decided):

| Day | State | Effect |
|-----|--------|--------|
| 0 | `past_due` | warn |
| 1–7 | grace | continue operations |
| 7 | restrict | administrative changes blocked |
| later | suspend | new operations blocked |

That is a **business decision**, not something individual API developers should invent.

---

## 11. Server-side entitlements

UI hiding is insufficient.

Incorrect:

```ts
if (plan === "pro") {
  showCostControl();
}
```

Necessary authoritative control:

```text
request
   ↓
requireEntitlement(company, feature)
   ↓
allowed / denied
```

Protect:

- modules
- drivers
- vehicles
- users
- depots
- premium reporting
- Cost Control
- multi-depot
- advanced features

### Direct API tests

A Basic customer calling a Pro endpoint manually must still receive **403 / entitlement denied**.

### Exit gate

- UI bypass → forbidden feature = **impossible**
- Seat-limit bypass = **impossible**
- Plan-limit bypass = **impossible**

---

## 12. TRACK PR-08 — Mobile production engineering

**Priority:** P1

Driver itself does not need rebuilding. Finish the release chain.

### Android

Production requirement:

```text
release SHA
    ↓
production environment
    ↓
release signing
    ↓
AAB
    ↓
internal Play track
    ↓
physical device
    ↓
staged production
```

Verify: login, offline mode, vehicle selection, duties, defects, camera, location if used, notifications, background/resume, process death, sync recovery.

Record: SHA, version, versionCode, AAB hash, CI run, Play build.

### iOS

Need: App ID, distribution certificate, provisioning profile, APNs, production configuration, archive, TestFlight, physical iPhone testing, App Store metadata, privacy declaration.

**Simulator testing does not close this gate.**

---

## 13. TRACK PR-09 — Observability and SRE

**Priority:** P1

Before real customers, Veyvio needs to answer: **What is broken right now?** — without a customer telling us.

### Four telemetry layers

**Application**

- error rate
- API latency
- 5xx
- failed mutations
- failed background jobs

**Security**

- login failures
- RLS denials
- cross-tenant attempts
- privileged operations
- suspicious support actions

**Business**

- failed dispatches
- job creation failures
- Driver sync failures
- billing failures
- onboarding failures

**Mobile**

- crash-free sessions
- startup failures
- sync backlog
- network errors
- background processing failures

Every production alert gets: owner, severity, runbook, escalation.

---

## 14. TRACK PR-10 — Backup / disaster recovery

**Priority:** P1

“Supabase has backups” is not enough. We must **prove restore**.

```text
backup
   ↓
isolated restore
   ↓
schema verification
   ↓
RLS verification
   ↓
tenant isolation
   ↓
API smoke
   ↓
data verification
```

Record actual: RPO, RTO, restore duration, missing-data window.

Do not invent an arbitrary SLO until we measure it.

---

## 15. TRACK PR-11 — Security assurance

**Priority:** P1

External penetration testing should focus heavily on Veyvio's tenant architecture.

**Scope:** authentication, authorization, BOLA/IDOR, RLS, cross-company reads, cross-company writes, storage, signed URLs, service-role paths, support/admin, RPC, webhooks, mobile APIs, session/token handling, privilege escalation, secrets.

### Launch requirement

- Critical unresolved = **0**
- High tenant/auth/data findings = **0**

---

## 16. TRACK PR-12 — Repository hygiene

**Priority:** P2

Do this separately from behavioural/security PRs.

Fix:

- `"Veyvio admin "` trailing-space directory
- root README
- canonical package manager
- root package naming
- environment documentation
- repository map
- development setup
- testing commands
- release process

Do **not** rename a huge directory while simultaneously modifying its tenant-security implementation.

Separate PR.

---

## 17. Wave 3G — deliberately deferred

Wave 3G `organisation_id` is architecture evolution.

It should start only after **Wave 3F = LOCKED**.

The controlled pilot may start before Wave 3G unless organisation hierarchy is essential to that pilot.

Otherwise we would stabilise tenancy **and** redesign tenancy at the same time. That is exactly what a principal engineer should avoid.

---

## 18. What we should NOT rebuild

Do not rebuild:

- Supabase backend
- RLS architecture
- Driver app
- Command/Admin
- Yard
- existing entitlement foundation
- existing Wave 3F security tooling
- fresh-DB testing
- storage-isolation testing
- F-03 architecture
- CI from scratch

We improve and close them.

Veyvio has passed the point where rewriting is likely to reduce risk. A rewrite would probably **increase** production risk.

---

## 19. Product release gates

There are three different definitions of “production ready.”

### Gate A — Controlled Pilot

Required:

- Wave 3F ordinary CRUD privilege bypasses = 0
- P0 cross-company FK risks = 0
- production mock leakage = 0
- fresh DB green
- tenant isolation green
- storage isolation green
- one release SHA
- production environment verified
- basic observability
- backup/restore proven
- rollback procedure
- Driver pilot build tested

Billing can still be manually provisioned.

**Decision after this:** GO — controlled real-world pilot.

Maps to Combined Blueprint Gate 4 (pilot), not store launch.

---

## 20. Gate B — First Paying Customer

Everything from Pilot plus:

- real billing
- subscription lifecycle
- server-side entitlements
- usage/seat limits
- onboarding
- support workflow
- billing reconciliation
- incident response
- production mobile distribution
- privacy/store requirements

**Decision after this:** GO — limited commercial production.

---

## 21. Gate C — General Availability

Everything above plus:

- external penetration test
- resolved critical/high findings
- observability baselines
- on-call ownership
- tested DR
- tested rollback
- mobile physical-device matrix
- staged rollout
- performance/load assessment
- security monitoring
- commercial support procedures
- operational pilot evidence

**Decision then:** GO — broad commercial Veyvio launch.

---

## 22. Recommended implementation waves

| Wave | Engineering objective | Release significance |
|------|------------------------|----------------------|
| **PROD-0** | Freeze + inventory + authoritative branch | Establish control |
| **PROD-1** | Remaining service-role classification and first conversion batches | P0 |
| **PROD-2** | Finish service-role conversion + P0 dual-FK constraints | P0 |
| **PROD-3** | F-03 production-truth closure | P0 |
| **PROD-4** | Fresh-DB / CI / release-authority hardening | P0 |
| **PROD-5** | Production config, secrets, supply-chain | P0/P1 |
| **PROD-6** | Android/iOS release chain | P1 |
| **PROD-7** | Billing / onboarding / entitlement enforcement | P1 |
| **PROD-8** | Observability + backups + DR + incident response | P1 |
| **PROD-9** | External security + controlled pilot | Release gate |
| **PROD-10** | Pilot fixes + staged commercial launch | GA |

---

## 23. Engineering dashboard

Not: “Veyvio is 92% production ready.”

Instead:

```text
┌──────────────────────────────────────────────┐
│ VEYVIO PRODUCTION READINESS                  │
├──────────────────────────────────────────────┤
│ Unclassified privileged paths          0/??  │
│ Ordinary service-role CRUD             0/??  │
│ P0 same-company integrity gaps         0/??  │
│ Production mock violations             0/??  │
│ Fresh DB                               PASS  │
│ Tenant isolation                       PASS  │
│ Storage isolation                      PASS  │
│ Required CI skipped                       0  │
│ Production config contamination           0  │
│ Release SHA                           xxxxx  │
│ Backup restore                         PASS  │
│ Rollback rehearsal                     PASS  │
│ Pen-test blockers                         0  │
│ Android RC                             PASS  │
│ iOS RC                                 PASS  │
│ Pilot gate                         GO/NO-GO  │
└──────────────────────────────────────────────┘
```

No percentage completion as release evidence (Combined Blueprint F-rule). Use Designed → Implemented → Integrated → Tested → Deployed → Verified → Device verified → Accepted.

---

## 24. Architectural decisions to lock

Create formal ADRs for these (files under `docs/adr/` as they are accepted):

| ADR | Title | Decision |
|-----|-------|----------|
| **ADR-PR-001** | Tenant authority | Postgres RLS is authoritative for ordinary tenant data access. |
| **ADR-PR-002** | Privileged capabilities | Generic privileged DB access is forbidden outside explicitly approved capability boundaries. |
| **ADR-PR-003** | Production truth | Production runtime may never substitute believable mock operational information. |
| **ADR-PR-004** | Release authority | `main` + immutable release SHA define production. |
| **ADR-PR-005** | Migration immutability | Released migrations are never edited; corrections are forward migrations. |
| **ADR-PR-006** | Entitlement authority | Commercial capabilities are enforced server-side. |
| **ADR-PR-007** | Mobile release provenance | Every production mobile binary maps back to an immutable repository SHA. |
| **ADR-PR-008** | Wave 3G sequencing | `organisation_id` migration cannot be mixed into Wave 3F closure. |

These decisions stop the platform drifting back into the same problems later.

Numbered `ADR-PR-*` so they do not collide with existing `docs/adr/001-web-first-phase-1.md`.

---

## 25. Immediate starting point

The blueprint begins with **PROD-0** and **PROD-1**, not SaaS and not mobile.

### PROD-0 preflight (17 August 2026)

Remote verified:

| Ref | SHA |
|-----|-----|
| `main` | `9955805fcf87d37ac446e6ffb7ef8062c5d25536` |
| `phase0/reproducibility` (pre-authority) | `c605e3311aaad896698e41145162a1b67bce6048` |
| CI run #115 | completed successfully against that Phase 0 SHA |
| `production-stabilisation/2026` | **does not exist** — do not create it from `c605e33` |

The “no new privileged importer” CI gate already exists (`test:service-role-allowlist`). Extend it; do not rebuild it.

**Do not create the stabilisation branch until this authority document is on `phase0/reproducibility` and CI is green on that new SHA.** Branching from `c605e33` would freeze an older governance state and violate release authority (PR-01).

Required sequence:

```text
Local production-authority changes
            │
            ▼
Commit to phase0/reproducibility
            │
            ▼
Push
            │
            ▼
Full CI on NEW exact SHA
            │
         PASS?
        /     \
      NO       YES
      │         │
     fix        ▼
          annotated baseline tags
                │
                ▼
      production-stabilisation/2026
                │
                ▼
      regenerate Wave 3F inventory
                │
                ▼
          PROD-1 Batch 01 (dependency-checked)
```

Safety tags (annotated; not a substitute branch):

- `prod0-main-baseline-20260817` → `9955805fcf87d37ac446e6ffb7ef8062c5d25536`
- `prod0-phase0-authority-20260817` → new verified SHA after this authority commit

The authority commit is **docs/rules/tracker wiring only**. Do not mix Wave 3F code conversion into it.

---

## Final production rule

The ultimate Veyvio production gate becomes:

- Zero unclassified privileged paths.
- Zero ordinary tenant CRUD bypasses.
- Zero P0 cross-tenant integrity gaps.
- Zero production fixture leakage.
- One reproducible database state.
- One fully attested release SHA.
- One tested rollback path.

Once those conditions are true, Veyvio has moved from advanced pre-production into a platform that can take a **controlled real-world production pilot**.
