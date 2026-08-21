# Veyvio Admin — production deploy

Command Admin is a **Vite SPA** plus **Cloudflare Pages Functions session BFF** in `Veyvio admin /`.

**Wave 3E-1:** reusable access/refresh credentials are **HttpOnly cookies** set by Pages Functions on `command.veyvio.co.uk`. The SPA must not store Bearer tokens. Topology: [`docs/plan/wave-3e1-command-session-custody-topology.md`](../plan/wave-3e1-command-session-custody-topology.md).

## Platform

| Item | Value |
|------|--------|
| Supabase project | `qeckgqjrfbdyxchuncdt` |
| Supabase URL | `https://qeckgqjrfbdyxchuncdt.supabase.co` |
| Command API (server-side only) | `https://qeckgqjrfbdyxchuncdt.supabase.co/functions/v1/command-api` |
| Canonical Command host | `https://command.veyvio.co.uk` |

Deploy **migrations + command-api** before relying on live auth:

```bash
cd "Veyvio admin "
npm run backend:deploy
```

`backend:deploy` sets Edge secret `VEYVIO_DEPLOYMENT_SHA` to the current git HEAD so `/health` reports an immutable deploy identity.

## Release artifact guard (PR-06)

`npm run deploy:pages` builds with `VALIDATE_PRODUCTION_ENV=true`, then `pages-deploy.mjs` runs `assert-release-config.mjs` against `dist/` (rejects `example.supabase.co`, localhost, service_role patterns) before Wrangler Pages deploy.

Set these **before** `npm run build:ci` (Vite inlines `VITE_*`):

| Variable | Production value |
|----------|------------------|
| `VITE_MOCK_API` | `false` or unset |
| `VITE_OPERATIONS_MOCK` | `false` or unset |
| `VITE_API_URL` | `/api/command` (same-origin BFF — **required**) |

**Never set in production:** `VITE_DEV_BYPASS_AUTH`, `ALLOW_PLATFORM_BOOTSTRAP`, `MFA_DEV_MODE`, or a direct `https://*.supabase.co/functions/v1/command-api` `VITE_API_URL`.

## Pages Functions secrets / vars

Configure on Cloudflare Pages project `veyvio-admin`:

| Name | Purpose |
|------|---------|
| `COMMAND_API_URL` | Upstream `…/functions/v1/command-api` |
| `SUPABASE_URL` | Project URL for Auth refresh/logout |
| `SUPABASE_ANON_KEY` | Anon key for Auth + Edge gateway |
| `VEYVIO_COMMAND_CANONICAL_HOST` | `command.veyvio.co.uk` (also in `wrangler.toml`) |
| `VEYVIO_COMMAND_ENFORCE_CANONICAL_HOST` | `1` |

## Build + deploy

```bash
cd "Veyvio admin "
npm ci
npm run deploy:pages
```

This builds with `VITE_API_URL=/api/command` and runs:

`npx wrangler pages deploy dist --project-name=veyvio-admin`

Wrangler deploys `dist/` **and** the sibling `functions/` directory (session BFF).

## Custom domain — `command.veyvio.co.uk`

Canonical Command URL: `https://command.veyvio.co.uk/login`.

| Step | Action |
|------|--------|
| 1 | Pages → `veyvio-admin` → Custom domains → `command.veyvio.co.uk` |
| 2 | DNS CNAME `command` → `veyvio-admin.pages.dev` |
| 3 | Redirect `veyvio-admin.pages.dev` → `command.veyvio.co.uk` (Cloudflare Redirect Rule) |
| 4 | Smoke: sign in → confirm `localStorage`/`sessionStorage` have **no** `access_token` / `refresh_token` |

`veyvio-admin.pages.dev` is **not** a production login host for Wave 3E-1 (`__Host-` cookies are host-bound).

## CI

`.github/workflows/ci.yml` lint/tests/builds Admin on PR/push.

Tenant isolation smoke (release gate) still hits `command-api` directly with platform credentials — that path is server/tooling, not SPA custody.

## Post-deploy smoke (3E-1)

1. Open `https://command.veyvio.co.uk/login` (not pages.dev).
2. Sign in → MFA if required → select company.
3. DevTools → Application → Storage: no `access_token` / `refresh_token`.
4. Network: API calls to `/api/command/...` and `/api/session/...` same-origin; no browser refresh to Supabase `/auth/v1/token`.
5. Logout → cookies cleared → authenticated routes 401.
6. Sidebar data loads for active company (3A–3D still enforced on `command-api`).
