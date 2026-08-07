# Veyvio email forwarding — veyvio.co.uk

Cloudflare **Email Routing** on zone `veyvio.co.uk`. All aliases forward to the verified destination Gmail until dedicated mailboxes are added.

## Destination

| Field | Value |
|-------|--------|
| Destination | `veyvio@outlook.com` |
| Status | Pending verification — check Outlook inbox (and junk) for Cloudflare email |

## Forwarding rules

| Alias | Forwards to |
|-------|-------------|
| `info@veyvio.co.uk` | Gmail |
| `support@veyvio.co.uk` | Gmail |
| `accounts@veyvio.co.uk` | Gmail |
| `bookings@veyvio.co.uk` | Gmail |
| `hr@veyvio.co.uk` | Gmail |
| `hello@veyvio.co.uk` | Gmail (website legacy alias) |

## DNS (auto-managed by Cloudflare)

MX records point to `*.mx.cloudflare.net`. SPF includes `include:_spf.mx.cloudflare.net`.

Do not add competing MX records at the registrar.

## Website contact defaults

| Purpose | Address |
|---------|---------|
| Sales / general | `info@veyvio.co.uk` |
| Support | `support@veyvio.co.uk` |
| Demo notifications (Worker) | `info@veyvio.co.uk` via `SALES_EMAIL` |

## Change destination or add aliases

**Dashboard:** Cloudflare → Email → Email Routing → `veyvio.co.uk` → Routing rules

**Switch destination after verifying Outlook:**

```bash
npm run setup:email
```

Verifies `veyvio@outlook.com` is active, then updates all forwarding rules from the previous Gmail destination.

## Sending email (outbound)

Email Routing is **inbound forward only**. For outbound (demo confirmations, transactional mail), use **Resend** with a verified domain — see `docs/deploy/website-production.md`.
