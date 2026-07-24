# Agent and contributor notes

## Repository layout

| App | Path | Stack |
|-----|------|--------|
| **Veyvio Yard** | repo root (`src/`) | TanStack Start + Vite + Nitro |
| **Veyvio Admin (Command)** | `Veyvio admin /` | Vite SPA + Supabase `command-api` |
| **Veyvio Driver** | `veyvio-driver-App/` | Vite SPA |
| **Shared packages** | `shared/`, `packages/` | TypeScript libs |

Backend: Supabase Postgres + Edge Function `command-api` under `Veyvio admin /supabase/`.

## Git workflow

- Default branch: `main`
- Avoid force-pushing `main` or rewriting published history other collaborators may have pulled
- CI runs on every push/PR to `main` (Yard, Admin, Driver, tenant isolation)
- Deploy backend (`npm run backend:deploy` in Admin) before pointing frontends at production API

## Production environment

See `docs/deploy/frontend-production.md` and `docs/deploy/admin-production.md`.

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
```
