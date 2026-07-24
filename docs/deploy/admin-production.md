# Veyvio Admin — production deploy

Command Admin is a **Vite static SPA** in `Veyvio admin /`. It talks to the hosted **Supabase `command-api`** Edge Function — there is no separate Admin backend.

## Platform

| Item | Value |
|------|--------|
| Supabase project | `qeckgqjrfbdyxchuncdt` |
| Supabase URL | `https://qeckgqjrfbdyxchuncdt.supabase.co` |
| Command API | `https://qeckgqjrfbdyxchuncdt.supabase.co/functions/v1/command-api` |

Deploy **migrations + command-api** before the frontend:

```bash
cd "Veyvio admin "
npm run backend:deploy
```

## Build-time environment variables

Set these in your CI/host **before** `npm run build:ci` (Vite inlines `VITE_*` at build time):

| Variable | Production value |
|----------|------------------|
| `VITE_MOCK_API` | `false` or unset |
| `VITE_OPERATIONS_MOCK` | `false` or unset |
| `VITE_API_URL` | `https://qeckgqjrfbdyxchuncdt.supabase.co/functions/v1/command-api` |
| `VITE_SUPABASE_ANON_KEY` | Supabase project anon key |
| `VITE_SUPABASE_URL` | `https://qeckgqjrfbdyxchuncdt.supabase.co` |

**Never set in production:** `VITE_DEV_BYPASS_AUTH`, `ALLOW_PLATFORM_BOOTSTRAP`, `MFA_DEV_MODE`.

Local template: `Veyvio admin /.env.example` → copy to `.env`.

## Build

```bash
cd "Veyvio admin "
npm ci
VALIDATE_PRODUCTION_ENV=true npm run validate:production-env
npm run build:ci
```

Output: `Veyvio admin /dist/` — serve as static files (SPA fallback to `index.html`).

## Hosting options

Any static host works. Typical pattern:

1. Connect repo (or upload `dist/`) to **Cloudflare Pages**, **Netlify**, **Vercel**, or **S3 + CloudFront**
2. Set build command: `cd "Veyvio admin " && npm ci && npm run build:ci`
3. Set output directory: `Veyvio admin /dist`
4. Configure the `VITE_*` variables above in the host's environment UI
5. Enable SPA routing: all paths → `index.html`

## CI (GitHub Actions)

`.github/workflows/ci.yml` already lint/tests/builds Admin on every PR and push to `main`.

Tenant isolation smoke (release gate):

```bash
cd "Veyvio admin "
node scripts/set-github-ci-secrets.mjs --repo LarixAi/BCT
```

Requires repo secrets: `VEYVIO_ANON_KEY`, `VEYVIO_API_URL`, `VEYVIO_SUPABASE_URL`, `VEYVIO_PLATFORM_EMAIL`, `VEYVIO_PLATFORM_PASSWORD`, `VEYVIO_ISOLATION_PASSWORD`.

## Post-deploy smoke

1. Sign in → select BCT company → sidebar data loads.
2. Switch company → lists refresh (no cross-tenant cache bleed).
3. Dial-a-Ride request → accept / decline.
4. Live ops / yard → depot-scoped data only.
