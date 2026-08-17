# Phase 0 — Freeze and recover reproducibility

**Status:** Active  
**Branch:** `phase0/reproducibility`  
**Created:** 7 August 2026  
**Audit source:** full-folder audit 2026-08-07 (STOP — not production-safe)

## Freeze rules

Until Phase 0 closes **and** Phase 1 stop-ships (P0 security / durability findings) are addressed:

1. **No new production deploys** treated as release-ready (Command Pages, Yard Workers, Driver stores, Cost Control, Executive, Website).
2. **No real bank / Open Banking onboarding** and no real finance ledger use.
3. **No new multi-tenant customer onboarding** onto production as a system of record.
4. **Synthetic / pilot demo data only** for demonstrations.

`main` remains the published tip until this branch is reviewed and merged. This branch is the vehicle to make the audited working tree **reproducible from git**.

## Product authority (locked)

| Layer | Authority |
|-------|-----------|
| Platform | [`Veyvio_Combined_Blueprint_v2.0.docx`](../blueprint/Veyvio_Combined_Blueprint_v2.0.docx) (v2.0) |
| Production engineering | [veyvio-production-readiness-blueprint.md](./veyvio-production-readiness-blueprint.md) (`VEYVIO-PROD`) |
| Gap tracker | [veyvio-blueprint-alignment-plan.md](./veyvio-blueprint-alignment-plan.md) |
| Execution spine (historical) | [veyvio-production-gates.md](./veyvio-production-gates.md) |
| App specs | Cost Control, Executive, Website blueprints / product docs under `docs/blueprint/` and app `docs/` |

v1 Combined Blueprint is **superseded** and must not be cited as sole authority.

## Phase 0 close criteria

Phase 0 is complete when:

- [x] Intentional source for Yard, Command, Driver, Cost Control, Executive, Website, and docs is committed on `phase0/reproducibility`.
- [x] Generated artefacts (`**/supabase/.temp/`, `**/supabase/.branches/`) and secrets (`.env`, `.dev.vars`) are not in git.
- [x] [AGENTS.md](../../AGENTS.md) cites Blueprint v2.0.
- [x] A clean clone of the branch can install each app (`npm ci`) without missing intentional source trees (operator to confirm after push/fetch).

**Verified 7 Aug 2026 (shallow clone of `phase0/reproducibility` @ `76b7cff`):** secrets scan OK; `npm ci` succeeded for Yard, Admin, Driver, Website, Cost Control, and Executive.

**Intentionally left untracked:** `veyvio-driver-App/android/app/google-services.core-support-fleet.backup.json` (backup config; gitignored). Nested Executive `.git` was removed (backed up under `/tmp`) so the app is a normal monorepo tree, not a submodule.

Phase 0 does **not** require green Cost/Executive root CI (that is Phase 1 / P1-03) or fixing P0-01…P0-07.

## Clean-clone verification

```bash
git clone <repo-url> veyvio-phase0-check
cd veyvio-phase0-check
git checkout phase0/reproducibility

# Authority
grep -n 'Combined_Blueprint_v2' AGENTS.md

# Secrets / generated must be absent from the tree that git tracks
git ls-files | grep -E '(\.env$|\.dev\.vars$|supabase/\.temp/|supabase/\.branches/)' && echo FAIL || echo OK

# Install smoke (run where package.json exists)
npm ci
(cd "Veyvio admin " && npm ci)
(cd veyvio-driver-App && npm ci)
(cd veyvio-website && npm ci)
(cd veyvio-cost-control && npm ci)
(cd veyvio-executive && npm ci)
```

Optional deeper checks (not required to close Phase 0): each app’s existing `lint` / `test` / `build` scripts.

## After Phase 0

1. Open a PR from `phase0/reproducibility` → `main` when explicitly requested.
2. Begin Phase 1 — security stop-ships (RLS enablement, bank auth, Driver logging/revocation, dependency advisories, Cost/Executive in root CI).
