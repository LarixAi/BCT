# Agent and contributor notes

## Product authority

**Combined Blueprint v2.0** ([`docs/blueprint/Veyvio_Combined_Blueprint_v2.0.docx`](docs/blueprint/Veyvio_Combined_Blueprint_v2.0.docx)) is the platform product and architecture authority. The v1 Combined Blueprint is superseded.

Before cross-app or product work, read the relevant blueprint section and check [docs/plan/veyvio-blueprint-alignment-plan.md](docs/plan/veyvio-blueprint-alignment-plan.md). **Production engineering programme:** [docs/plan/veyvio-production-readiness-blueprint.md](docs/plan/veyvio-production-readiness-blueprint.md) (`VEYVIO-PROD`, tracks PR-00–PR-12). Historical gate tracker: [docs/plan/veyvio-production-gates.md](docs/plan/veyvio-production-gates.md). Freeze / reproducibility: [docs/plan/veyvio-phase0-freeze.md](docs/plan/veyvio-phase0-freeze.md). Cursor rules: `.cursor/rules/veyvio-combined-blueprint.mdc`, `.cursor/rules/veyvio-production-readiness.mdc`.

App-level specs (Cost Control, Executive, Website) sit under `docs/blueprint/` and each app’s `docs/` and must not contradict Combined Blueprint v2.0 on tenancy, security, or Hard Rules.

## Repository layout

| App | Path | Stack |
|-----|------|--------|
| **Veyvio Yard** | repo root (`src/`) | TanStack Start + Vite + Nitro → Cloudflare Workers |
| **Veyvio Admin (Command)** | `Veyvio admin /` | Vite SPA + Supabase `command-api` |
| **Veyvio Driver** | `veyvio-driver-App/` | Vite SPA |
| **Veyvio Cost Control** | `veyvio-cost-control/` | Vite SPA — cost-only CEC budget platform (separate product) |
| **Veyvio Executive** | `veyvio-executive/` | Next.js BFF — executive governance / security surface |
| **Veyvio Website** | `veyvio-website/` | Vite SPA (public marketing site) |
| **Shared packages** | `shared/`, `packages/` | TypeScript libs |

Backend: Supabase Postgres + Edge Function `command-api` under `Veyvio admin /supabase/`.

## Git workflow

- Default branch: `main`
- Avoid force-pushing `main` or rewriting published history other collaborators may have pulled
- CI runs on every push/PR to `main` (Yard, Admin, Driver, tenant isolation)
- Deploy backend (`npm run backend:deploy` in Admin) before pointing frontends at production API

## Production environment

See `docs/deploy/frontend-production.md`, `docs/deploy/admin-production.md`, and `docs/deploy/yard-production.md`.

Non-negotiables for production builds:

- `VITE_MOCK_API` / `VITE_OPERATIONS_MOCK` must not be `true`
- All reads/writes scoped by active `company_id` / JWT `active_company_id`
- Run `npm run test:tenant-isolation` (Admin) before release

## Local dev

```bash
# Yard
npm ci && npm run dev

# Admin (folder name includes trailing space)
cd "Veyvio admin " && npm ci && npm run dev

# Driver
cd veyvio-driver-App && npm ci && npm run dev

# Public website (veyvio.com)
cd veyvio-website && npm ci && npm run dev
```

Deploy: `docs/deploy/website-production.md`. Homepage spec: `docs/blueprint/veyvio-homepage-blueprint-v2.md`.
