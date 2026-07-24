# Frontend production deploy (Admin, Yard, Driver)

Production builds must use live Command API and Supabase — mock flags are blocked by `validate-production-env.mjs` (Admin) and production config tests (Yard).

- **Admin:** `docs/deploy/admin-production.md`
- **Yard:** `docs/deploy/yard-production.md`
- **Driver:** section below

## Required environment variables

### Veyvio Admin (`Veyvio admin /`)

| Variable | Production value |
|----------|------------------|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Project anon key |
| `VITE_API_URL` | `https://<project-ref>.supabase.co/functions/v1/command-api` |
| `VITE_MOCK_API` | **unset** or `false` |
| `VITE_OPERATIONS_MOCK` | **unset** or `false` |

Copy from `.env.example` and fill secrets. Local dev:

```bash
cd "Veyvio admin "
cp .env.example .env
# set VITE_OPERATIONS_MOCK=false (never true)
```

Hosted deploy: see `docs/deploy/admin-production.md` — set `VITE_*` in your CI/static host, build `dist/`, enable SPA fallback.

Build:

```bash
cd "Veyvio admin "
npm ci
npm run validate:production-env   # VALIDATE_PRODUCTION_ENV=true
npm run build:ci                  # CI / deploy (skips tsc gate)
# npm run build                   # full local build with tsc
```

### Veyvio Yard (repo root)

See **`docs/deploy/yard-production.md`** — Cloudflare Workers (Nitro), build env, Wrangler deploy, Capacitor/Android path, and yard map smoke.

Quick build:

```bash
npm ci
npm run build
npx nitro deploy --prebuilt   # after wrangler login
```

### Veyvio Driver (`veyvio-driver-App/`)

| Variable | Production value |
|----------|------------------|
| `VITE_SUPABASE_URL` | Same Supabase project |
| `VITE_SUPABASE_ANON_KEY` | Project anon key |
| `VITE_COMMAND_API_BASE_URL` | Command API URL |
| `VITE_AUTH_API_BASE_URL` | Command API URL (auth routes) |
| `VITE_DRIVER_APP_URL` | Public driver app URL |

```bash
cd veyvio-driver-App
npm ci
npm run build
```

## Backend (deploy before frontend)

Migrations and `command-api` must be live before pointing Admin at production:

```bash
cd "Veyvio admin "
npm run backend:deploy
# or: supabase db push && supabase functions deploy command-api --no-verify-jwt
```

Post-deploy smoke:

```bash
cd "Veyvio admin "
npm run test:tenant-isolation
VALIDATE_PRODUCTION_ENV=true npm run validate:production-env
```

## GitHub Actions secrets (CI tenant isolation)

Configure in **Settings → Secrets and variables → Actions**:

| Secret | Purpose |
|--------|---------|
| `VEYVIO_ANON_KEY` | Supabase anon key for smoke tests |
| `VEYVIO_API_URL` | Command API base URL |
| `VEYVIO_SUPABASE_URL` | Supabase project URL |
| `VEYVIO_PLATFORM_EMAIL` | Platform admin test user |
| `VEYVIO_PLATFORM_PASSWORD` | Platform admin password |
| `VEYVIO_ISOLATION_PASSWORD` | Isolation test user password |

Without `VEYVIO_ANON_KEY`, CI skips the tenant isolation job with a warning. Add secrets before merging tenant-isolation work to `main`.

## Manual smoke after deploy

1. Sign in to Admin → select BCT company → confirm sidebar data loads.
2. Switch company → confirm lists refresh (no stale cross-tenant cache).
3. Dial-a-Ride request detail → accept / decline.
4. Yard live map → vehicles and bays for active depot only.
5. Driver app → company picker → walkaround queue scoped to org.
