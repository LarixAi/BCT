# Executive edge, Worker and browser protection

Applies to the Veyvio Executive Cloudflare Worker / BFF hosted at the approved production hostname.

## Production host and callbacks

Approved hosts:

- `veyvio-executive.adataintelligence.chatgpt.site`
- local development: `localhost`, `127.0.0.1`

Approved authentication callback / return paths:

- `/`
- `/login`
- `/signin-with-chatgpt`
- `/signout-with-chatgpt`
- `/callback`

Set `VEYVIO_EXECUTIVE_ENFORCE_HOST=1` on production Workers when the deployment must reject unexpected Host headers.

## Browser security headers

Every private Executive response sets:

- Content-Security-Policy (enforcement, no `script-src unsafe-inline` / `unsafe-eval`)
- Strict-Transport-Security (`max-age=31536000; includeSubDomains`, preload not submitted yet)
- X-Content-Type-Options: nosniff
- Referrer-Policy: no-referrer
- X-Frame-Options: DENY (+ CSP `frame-ancestors 'none'`)
- Permissions-Policy (camera, mic, geolocation, payment and related features disabled)
- Cross-Origin-Opener-Policy / Cross-Origin-Resource-Policy: same-origin

## CSRF and CORS

- Cookie-authenticated mutations require a matching `Origin` and reject cross-site `Sec-Fetch-Site` values.
- Cross-origin browser requests are denied; no `Access-Control-Allow-*` headers are emitted.

## Rate limits and abuse controls

- Worker-local rate limiting protects `/api/auth/*` mutation routes (20 attempts / 15 minutes / client key).
- Failure messages do not disclose whether an account exists.
- Production still requires Cloudflare WAF managed rules, bot fight / bot management, and durable login rate limits in front of the Worker. The in-Worker counter is a best-effort backstop only.

## Cloudflare Access

Decision: **deferred**. ChatGPT Sites owner-only identity is the current outer approved-user gate. Re-evaluate Cloudflare Access after cutting over to a dedicated non-Sites production hostname.
