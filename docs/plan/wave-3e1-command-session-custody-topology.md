# Wave 3E-1 — Command/Admin session custody topology

**Status:** APPROVED — Cloudflare Pages Functions BFF  
**Coding:** UNBLOCKED / in progress  
**Canonical host:** `command.veyvio.co.uk`  
**Does not touch:** Driver (3E-2), Wave 2, RLS/service-role (3F), organisation_id (3G)

---

## Locked architecture

```
Browser
  |
  | https://command.veyvio.co.uk
  v
Cloudflare Pages (veyvio-admin)
  ├── Static Vite SPA
  └── Pages Functions BFF  (/functions)
        |
        | server-side Authorization / refresh
        v
Supabase Auth + command-api
```

## Session contract

| Cookie | Flags |
|--------|--------|
| `__Host-veyvio_at` | HttpOnly; Secure; Path=/; SameSite=Strict; no Domain |
| `__Host-veyvio_rt` | same |

- SPA never receives access/refresh token values.
- Login / MFA confirm / tenant select → `/api/session/*` Pages Functions.
- Ordinary API → `/api/command/*` proxy (Bearer attached server-side).
- Refresh rotates HttpOnly cookies inside the BFF.
- Logout revokes (best-effort) and expires both cookies.
- CSRF: Origin + `Sec-Fetch-Site` on state-changing cookie-authenticated requests.
- No auth credentials in `localStorage` / `sessionStorage`.
- Initial implementation: credentials in HttpOnly cookies (no KV/DO session store).

## Canonical host

`veyvio-admin.pages.dev` must not create production sessions. BFF refuses session creation when `VEYVIO_COMMAND_ENFORCE_CANONICAL_HOST=1` and Host ≠ `command.veyvio.co.uk`. Production SPA also redirects `.pages.dev` → `command.veyvio.co.uk`. Prefer a Cloudflare Redirect Rule on the pages.dev hostname as ops belt-and-braces.

## Localhost

`VEYVIO_COMMAND_LOCAL_COOKIE=1` (or hostname localhost) uses non-`__Host-` cookie names without Secure for `wrangler pages dev`.

## Deploy

```bash
cd "Veyvio admin "
# One-time secrets on the Pages project:
npx wrangler pages secret put COMMAND_API_URL --project-name=veyvio-admin
npx wrangler pages secret put SUPABASE_URL --project-name=veyvio-admin
npx wrangler pages secret put SUPABASE_ANON_KEY --project-name=veyvio-admin

npm run deploy:pages
```

Build must set `VITE_API_URL=/api/command`.
