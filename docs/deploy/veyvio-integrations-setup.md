# HubSpot + Resend setup for veyvio.co.uk demo form

One-time setup for live CRM and email on `POST /api/demo`. After you have keys, run:

```bash
cd veyvio-website
cp .env.integrations.example .env.integrations
# paste keys into .env.integrations
cd ..
npm run setup:integrations
```

---

## Part 1 — HubSpot (CRM contacts)

### 1. Create account (free)

1. Go to [hubspot.com/products/crm](https://www.hubspot.com/products/crm)
2. Sign up with **`veyvio@outlook.com`** (keeps everything on brand)
3. Complete onboarding — skip paid upgrades

### 2. Create a private app token

1. HubSpot → **Settings** (gear) → **Integrations** → **Private Apps**
2. **Create private app** → name: `Veyvio Website Demo`
3. **Scopes** tab → enable:
   - `crm.objects.contacts.write`
   - `crm.objects.contacts.read` (optional, for debugging)
4. **Create app** → copy the **Access token** (`pat-na1-...`)

### 3. Optional custom contact properties

The demo form sends these extra fields. HubSpot ignores unknown properties, but for clean reporting create them:

**Settings → Data Management → Properties → Contact properties → Create property**

| Label | Internal name | Type |
|-------|---------------|------|
| Veyvio service type | `veyvio_service_type` | Single-line text |
| Veyvio fleet size | `veyvio_fleet_size` | Single-line text |
| Veyvio demo reference | `veyvio_demo_reference` | Single-line text |

---

## Part 2 — Resend (outbound email)

### 1. Create account

1. Go to [resend.com/signup](https://resend.com/signup)
2. Sign up with **`veyvio@outlook.com`**

### 2. Add and verify `veyvio.co.uk`

1. Resend dashboard → **Domains** → **Add domain** → `veyvio.co.uk`
2. Resend shows DNS records (DKIM, SPF, etc.)
3. In **Cloudflare** → `veyvio.co.uk` → **DNS** → add each record Resend lists  
   (usually CNAME for DKIM + TXT for SPF — use **DNS only** / grey cloud unless Resend says proxied)
4. Back in Resend → **Verify** (can take a few minutes)

### 3. Create API key

1. Resend → **API Keys** → **Create API Key**
2. Name: `veyvio-website-production`
3. Permission: **Sending access** (full access is fine for a single-purpose key)
4. Copy the key (`re_...`) — shown once

### 4. Sender address

After domain verification, use:

```
Veyvio <info@veyvio.co.uk>
```

Until the domain is verified, Resend allows test sends from `onboarding@resend.dev` only (limited).

---

## Part 3 — Fill `.env.integrations`

```bash
cd veyvio-website
cp .env.integrations.example .env.integrations
```

Edit `.env.integrations`:

```env
HUBSPOT_ACCESS_TOKEN=pat-na1-your-token-here
RESEND_API_KEY=re_your_key_here
DEMO_FROM_EMAIL=Veyvio <info@veyvio.co.uk>
DEMO_NOTIFY_EMAIL=info@veyvio.co.uk
CALENDAR_BOOKING_URL=
CRM_PROVIDER=hubspot
EMAIL_PROVIDER=resend
```

`DEMO_NOTIFY_EMAIL` receives internal alerts when someone submits the demo form. It forwards to **`veyvio@outlook.com`** via Cloudflare Email Routing once Outlook is verified.

---

## Part 4 — Deploy

```bash
npm run setup:integrations
```

This uploads secrets to the Cloudflare Worker, switches providers from stub → live, and redeploys.

### Verify

```bash
curl -s -X POST https://veyvio.co.uk/api/demo \
  -H 'Content-Type: application/json' \
  -d '{"name":"Live Test","email":"you@example.com","organisation":"Test Op","serviceType":"community-transport","fleetSize":"1-10","consent":true}'
```

Check:

- HubSpot → **Contacts** — new contact appears
- Resend → **Emails** — confirmation + internal notification sent
- **`veyvio@outlook.com`** — internal notification arrives (via `info@` forward)

---

## Part 5 — Outlook forwarding (Cloudflare)

Inbound mail to `info@`, `support@`, etc. forwards to **`veyvio@outlook.com`**.

1. Check **`veyvio@outlook.com`** inbox + Junk for Cloudflare verification email
2. Click **Verify email address**
3. Run:

```bash
npm run setup:email
```

---

## Part 6 — Cal.com (optional booking after submit)

1. Sign up at [cal.com](https://cal.com) with **`veyvio@outlook.com`**
2. **Event types** → **New** → e.g. “Veyvio demonstration” (30 min)
3. Copy the public link, e.g. `https://cal.com/veyvio-fleet/veyvio-demo`
4. Add to `.env.integrations`:

```env
CALENDAR_BOOKING_URL=https://cal.com/your-username/veyvio-demo
```

5. Run `npm run setup:integrations` again — thank-you page shows **Book a calendar slot**

Name and email are prefilled in the Cal.com URL from the form submission.

---

## Part 7 — Deploy everything

```bash
npm run setup:integrations   # HubSpot + Resend + Cal.com secrets
npm run setup:email          # After Outlook verified in Cloudflare
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| HubSpot 401 | Regenerate private app token; check scopes |
| Resend domain not verified | Re-check DNS records in Cloudflare match Resend exactly |
| Email not received | Check Resend logs; confirm `DEMO_FROM_EMAIL` uses verified domain |
| `setup:email` fails | Outlook not verified in Cloudflare yet — wait 2 min and retry |
