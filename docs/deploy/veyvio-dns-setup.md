# Veyvio DNS setup — veyvio.co.uk (production)

**Primary domain:** `veyvio.co.uk` (`.com` unavailable — not used)

## Current state

| Host | Cloudflare | Public DNS | App |
|------|------------|------------|-----|
| `veyvio.co.uk` | Zone active | Cloudflare NS | Marketing Worker — **live** |
| `www.veyvio.co.uk` | Custom domain | Proxied | Marketing Worker |
| `command.veyvio.co.uk` | Pages custom domain | CNAME pending | Command Admin |
| Email (`info@`, `support@`, etc.) | Email Routing | MX → Cloudflare | → Gmail |

## Command sign-in

| Type | Host | Target |
|------|------|--------|
| **CNAME** | `command` | `veyvio-admin.pages.dev` |

Verify: `curl -sI https://command.veyvio.co.uk/login` → `200`

## Marketing site

Attached via `npm run setup:domains` — Worker custom domains on zone `veyvio.co.uk`.

## Email forwarding

See `docs/deploy/veyvio-email-routing.md`.

## Legacy veyvio.com

Not on Cloudflare. Ignore unless `.com` is acquired later.

## Troubleshooting — “DNS address could not be found”

`veyvio.co.uk` was registered **25 July 2026**. Cloudflare, Google (8.8.8.8), and Cloudflare (1.1.1.1) all resolve it correctly. Some **home router / ISP resolvers** cache “no record” for new domains for up to ~30 minutes.

**Quick fix on Mac:**

1. **System Settings → Network → Wi‑Fi → Details → DNS**
2. Add `1.1.1.1` and `8.8.8.8`, remove or move below `192.168.x.x`
3. Terminal: `sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder`
4. Reload the browser (or try a private window)

**Brave:** check `brave://settings/security` — if “Use secure DNS” is on, try Cloudflare or Google as the provider.

**Verify DNS is working:**

```bash
dig @1.1.1.1 veyvio.co.uk +short
curl -sI https://veyvio.co.uk/ | head -1
```

Expected: two Cloudflare IPs (`104.21.x.x` / `172.67.x.x`) and `HTTP/2 200`.

## Automation script

`scripts/setup-veyvio-domains.mjs` — requires `npx wrangler login`.

## Fallback URLs (always work)

| App | URL |
|-----|-----|
| Marketing | `https://veyvio-website.larixai-veyvio.workers.dev` |
| Marketing (co.uk) | `https://veyvio.co.uk` |
| Command | `https://veyvio-admin.pages.dev/login` |

## Related runbooks

- `docs/deploy/website-production.md` — marketing Worker deploy
- `docs/deploy/admin-production.md` — Command Pages deploy
