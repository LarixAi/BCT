# Veyvio Yard — production deploy

Veyvio Yard is a **TanStack Start** app at the repo root. Production builds target **Cloudflare Workers** via **Nitro** (`cloudflare-module` preset) — SSR for routes plus static assets in `.output/public/`.

Yard reads live data from the same **Supabase `command-api`** as Admin (`/yard/hub`, auth, mutations). There is no separate Yard backend.

## Platform

| Item | Value |
|------|--------|
| Supabase project | `qeckgqjrfbdyxchuncdt` |
| Supabase URL | `https://qeckgqjrfbdyxchuncdt.supabase.co` |
| Command API | `https://qeckgqjrfbdyxchuncdt.supabase.co/functions/v1/command-api` |

Deploy **migrations + command-api** before Yard (from Admin):

```bash
cd "Veyvio admin "
npm run backend:deploy
```

Yard-specific backend includes yard layout seeds and realtime (`vehicle_locations`, `parking_bays`) — see `Veyvio admin /supabase/migrations/202607240001_live_yard_map.sql` and related BCT yard migrations.

## Build-time environment variables

Set these **before** `npm run build` (Vite inlines `VITE_*` at build time):

| Variable | Production value |
|----------|------------------|
| `VITE_USE_MOCK_AUTH` | `false` |
| `VITE_USE_MOCK_API` | `false` or unset |
| `VITE_API_URL` | `https://qeckgqjrfbdyxchuncdt.supabase.co/functions/v1/command-api` |
| `VITE_SUPABASE_URL` | `https://qeckgqjrfbdyxchuncdt.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase project anon key |

`VITE_COMMAND_API_BASE_URL` is accepted as an alias for `VITE_API_URL` in some routes; prefer `VITE_API_URL` for consistency with Admin.

**Never set in production:** `VITE_DEV_BYPASS_AUTH`, `VITE_E2E`, `VITE_USE_MOCK_API=true`.

Local template: copy `.env.example` → `.env` (gitignored). For live local dev, copy Command URL + anon key from `Veyvio admin /.env`.

Production guard: `src/platform/yard/production-config.test.ts` fails CI builds if mock/bypass flags are enabled in production mode.

## Build (web / Cloudflare)

From repo root:

```bash
npm ci
npm run build
```

Outputs (gitignored):

| Path | Purpose |
|------|---------|
| `.output/server/` | Cloudflare Worker entry (`index.mjs`, `wrangler.json`) |
| `.output/public/` | Static assets (bound as `ASSETS` in the worker) |
| `.wrangler/deploy/config.json` | Wrangler pointer to generated config |

Default worker name in generated `wrangler.json`: `larixai-bct` (rename in Nitro/Wrangler config if you run multiple environments).

## Preview locally

After `npm run build`:

```bash
npx vite preview
# or, from Nitro output:
npx wrangler --cwd .output/server dev
```

Sign in with a real yard-capable user (BCT membership). Mock auth is off when `VITE_API_URL` + `VITE_SUPABASE_ANON_KEY` are set.

## Deploy to Cloudflare

### Prerequisites (one-time)

1. `npx wrangler login` (OAuth — browser)
2. Register a **workers.dev subdomain** for your Cloudflare account (account-level, not per worker). Either:
   - Open [Workers onboarding](https://dash.cloudflare.com/?to=/:account/workers/onboarding) and complete the subdomain step, **or**
   - Run deploy interactively in a terminal (not CI) and answer **yes** when Wrangler prompts to register (e.g. `larixai-veyvio` → `https://larixai-veyvio.workers.dev`)

Until this is done, deploy fails with: *"You need to register a workers.dev subdomain before publishing"*.

### Build + deploy

```bash
npm ci
# ensure .env has live VITE_* (see above)
npm run build
npx wrangler deploy --config .output/server/wrangler.json
```

Worker URL after deploy: `https://larixai-bct.<your-account-subdomain>.workers.dev` (name from generated `wrangler.json`).

**Note:** Prefer `wrangler deploy --config .output/server/wrangler.json` from repo root. `npx nitro deploy --prebuilt` can conflict when both `.output/server/wrangler.json` and `.wrangler/deploy/config.json` exist.

Optional helper (interactive TTY required): `scripts/wrangler-deploy-yard.expect`

Verify upload without publishing:

```bash
npx wrangler deploy --config .output/server/wrangler.json --dry-run
```

### CI (GitHub Actions → Cloudflare)

Typical pipeline on push to `main`:

1. `npm ci`
2. Set `VITE_*` env vars in the workflow (or Cloudflare build env)
3. `npm run build`
4. `npx wrangler --cwd .output/server deploy`

Store `CLOUDFLARE_API_TOKEN` (Workers deploy) in GitHub secrets. Restrict token to the target account/zone.

### Cloudflare dashboard

Workers & Pages → Create → connect repo or upload `.output/server` + assets binding per generated `wrangler.json` (`ASSETS` → `../public`).

## Android (Capacitor) — separate artefact

Outdoor yard phones use a **static SPA** build, not the Cloudflare Worker:

```bash
npm run build:mobile   # VITE_MOBILE_BUILD=true — skips Nitro
npm run cap:sync
npm run android:debug  # or release pipeline
```

Set the same `VITE_*` live API vars for mobile builds. `VITE_DRIVER_APP_URL` is not required for Yard APK.

## Auth and tenancy

- Sign-in goes through Command API (`commandApiUrl('/auth/...')`) with Supabase anon key on requests.
- Active `company_id` / depot come from the session — yard hub and map are depot-scoped.
- Live map uses Supabase Realtime when `VITE_SUPABASE_URL` + anon key are configured; otherwise hub polling fallback.

## CI (GitHub Actions)

`.github/workflows/ci.yml` **Yard** job on every PR/push to `main`:

- `npm run lint`
- `npm test`
- `npm run build`

No Cloudflare deploy step in CI today — add when you have a Workers token and production worker name.

## Post-deploy smoke

1. Open deployed URL → sign in (not mock/demo bypass).
2. Home board loads depot summary for active company.
3. **Yard map** (`/yard/map`) → BCT Main Depot layout, bays, vehicle markers.
4. Realtime: move a vehicle in Admin/yard hub → map updates without full refresh (or polling within ~10s if Realtime unavailable).
5. Vehicle detail → condition / checks → data matches depot, not another tenant.
6. Offline/sync indicator honest (no silent mock data).

E2E reference: `e2e/live-yard-map.spec.ts` (uses dev bypass locally only).

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Mock sign-in despite production URL | `VITE_USE_MOCK_AUTH` must be `false`; both `VITE_API_URL` and `VITE_SUPABASE_ANON_KEY` set at **build** time |
| Blank map / 403 on hub | User membership + depot entitlements; `command-api` deployed; yard layout migration applied for depot |
| Stale vehicles | Realtime migration `202607240004_vehicle_locations_realtime.sql`; RLS scoped by `company_id` |
| Worker deploy fails | `nodejs_compat` flag in `wrangler.json`; Wrangler ≥ 3.x logged into correct account |

## Related docs

- Admin deploy: `docs/deploy/admin-production.md`
- All apps overview: `docs/deploy/frontend-production.md`
- Live yard map plan: `docs/plan/live-yard-map.md`
