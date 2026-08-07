# Veyvio public website — production deploy

Marketing site at `veyvio-website/`. Static SPA (Vite) + **Cloudflare Worker** for `POST /api/demo`.

## Architecture

| Component | Technology |
|-----------|------------|
| Frontend | Vite + React → `dist/` |
| Demo API | `worker/index.ts` → `/api/demo` |
| Hosting | Cloudflare Workers + static assets binding |
| CRM | HubSpot (optional) |
| Email | Resend (optional) |
| Calendar | Cal.com URL (optional, query-prefilled after form submit) |

## Build-time variables (`VITE_*`)

Set before `npm run build` — inlined into the client bundle:

| Variable | Example |
|----------|---------|
| `VITE_SITE_URL` | `https://veyvio.co.uk` |
| `VITE_LEGAL_COMPANY_NAME` | `Veyvio Ltd` |
| `VITE_SALES_EMAIL` | `info@veyvio.co.uk` |
| `VITE_SUPPORT_EMAIL` | `support@veyvio.co.uk` |
| `VITE_SIGN_IN_URL` | `https://veyvio-admin.pages.dev/login` |
| `VITE_DATA_HOSTING_REGION` | `United Kingdom / European Union` |
| `VITE_CALENDAR_BOOKING_URL` | `https://cal.com/veyvio/demo` |
| `VITE_ANALYTICS_ENDPOINT` | Optional consent-gated analytics URL |

Copy `veyvio-website/.env.example` → `.env.production` locally (gitignored).

## Worker secrets (runtime — never in client bundle)

```bash
cd veyvio-website

# Required for live integrations
wrangler secret put HUBSPOT_ACCESS_TOKEN
wrangler secret put RESEND_API_KEY
wrangler secret put DEMO_FROM_EMAIL      # e.g. Veyvio <hello@veyvio.com>
wrangler secret put DEMO_NOTIFY_EMAIL    # internal sales inbox
wrangler secret put CALENDAR_BOOKING_URL # Cal.com event link

# Optional overrides
wrangler secret put CRM_PROVIDER         # hubspot | stub
wrangler secret put EMAIL_PROVIDER       # resend | stub
```

### HubSpot setup

1. Private app token with `crm.objects.contacts.write`
2. Create custom contact properties: `veyvio_service_type`, `veyvio_fleet_size`, `veyvio_demo_reference` (optional — API ignores unknown properties if not created)
3. Set `CRM_PROVIDER=hubspot` in Worker vars

### Resend setup

1. Verify sending domain (`veyvio.com`)
2. Set `EMAIL_PROVIDER=resend` and `DEMO_FROM_EMAIL`
3. Confirmation + internal notification emails send on successful enquiry

### Cal.com setup

1. Create a demo event type
2. Set `CALENDAR_BOOKING_URL` to the public booking link
3. Returned to visitor after form submit with name/email prefilled via query params

## Build and deploy

```bash
cd veyvio-website
npm ci
npm run deploy
```

**Production URL (workers.dev):** `https://veyvio-website.larixai-veyvio.workers.dev`

The deploy script uses `--config ./wrangler.toml` to avoid conflicting with the Yard worker config at the repo root.

Or from repo root:

```bash
npm run deploy:website
```

## Staging

Create a separate Worker + `wrangler.toml` environment:

```bash
wrangler deploy --env staging
```

Staging must return `X-Robots-Tag: noindex` (configure in Cloudflare dashboard or worker). Never point staging structured data at production URLs.

## Custom domain

Production: `veyvio.co.uk` + `www.veyvio.co.uk` on Worker `veyvio-website`. See `docs/deploy/veyvio-dns-setup.md`.

Email forwarding: `docs/deploy/veyvio-email-routing.md`.

## Verification after deploy

```bash
curl -s -X POST https://veyvio.co.uk/api/demo \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","email":"you@example.com","organisation":"Test Op","serviceType":"community-transport","fleetSize":"1-10","consent":true}'
```

Check HubSpot contact, Resend delivery, and calendar link in response.

## Local development

```bash
cd veyvio-website
npm run dev          # Vite on :5175 with /api/demo middleware
npm run preview:worker  # after build — worker + assets locally
```

## Legal before launch

- [x] Privacy, terms and cookies published (founder-approved 28 July 2026) — `/legal/*`
- [ ] Confirm registered company name with Companies House (still provisional: `Veyvio Ltd`)
- [x] Claims register review file present (`docs/plan/veyvio-homepage-claims-register.md`)
- [x] Custom domain live (`veyvio.co.uk` / `www`)
- [x] HubSpot / Resend / Cal.com secrets present in `.env.integrations` (re-push via `npm run setup:integrations` after deploy)
