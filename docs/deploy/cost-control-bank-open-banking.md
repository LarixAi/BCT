# Cost Control — Open Banking bank feed setup

Cost Control integrates the **business bank account as a read-only AIS feed** for balance and payment reconciliation. It does **not** initiate payments (Blueprint §11 / §12.9).

## Architecture

```text
Bank (NatWest, etc.)
   → Authorised AIS partner (TrueLayer / Yapily / …)
   → Token proxy API (server holds client_secret)
   → Cost Control bank adapter
   → BankAccount + BankTransaction domain
   → /bank UI + cost ledger matching
```

The SPA never stores Open Banking client secrets. Production always uses `VITE_BANK_TOKEN_PROXY_URL`.

## What ships today

| Piece | Location |
|-------|----------|
| Adapter contract | `veyvio-cost-control/src/integrations/bank/types.ts` |
| Demo adapter | `.../demo-adapter.ts` |
| Open Banking AIS adapter | `.../open-banking-adapter.ts` |
| Connect UI | Settings → **Business bank** |
| Balance UI | `/bank` |

**Sandbox connect (no partner account required):**  
Settings → **Connect bank** (with `VITE_BANK_TOKEN_PROXY_URL` pointing at `finance-api`) → consent callback → AIS-shaped payload persisted in `cost_control.bank_*` → `/bank` shows Open Banking feed.

Without `VITE_BANK_TOKEN_PROXY_URL`, the SPA still supports a local-only sandbox redirect (not persisted).

## Environment variables

Create `veyvio-cost-control/.env.local`:

```bash
# demo_live (default) | open_banking | disconnected
VITE_BANK_FEED_MODE=open_banking

# truelayer_sandbox | truelayer | yapily_sandbox | yapily | generic_ais
VITE_BANK_PROVIDER=truelayer_sandbox

# Public client id only (optional until proxy exists)
VITE_BANK_CLIENT_ID=

# Backend that holds secrets and talks to the partner — required for live
VITE_BANK_TOKEN_PROXY_URL=

# Consent return URL (defaults to this app’s /settings?bank_callback=1)
VITE_BANK_REDIRECT_URI=http://localhost:5176/settings?bank_callback=1
```

## Token proxy API (next backend slice)

When `VITE_BANK_TOKEN_PROXY_URL` is set, the adapter calls:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/bank/consent/start` | Return partner consent URL |
| POST | `/bank/consent/complete` | Exchange auth code; store tokens in vault |
| GET | `/bank/accounts` | List accounts + balances |
| GET | `/bank/accounts/:id/transactions` | List transactions |
| POST | `/bank/consent/revoke` | Disconnect |

Every request must include `organisation_id`. Tokens are keyed by organisation and never returned to the browser.

## Partner checklist (TrueLayer example)

1. Create a TrueLayer console app (AIS only — no PIS).
2. Add redirect URI matching `VITE_BANK_REDIRECT_URI`.
3. Implement the token proxy against TrueLayer Auth + Data API.
4. Set env vars and reconnect from Settings.
5. Confirm `/bank` shows `feedMode: open_banking` and masked account numbers.

## Explicit non-goals

- Payment initiation / Faster Payments  
- Storing full account numbers as system of record  
- Treating credits as CEC income budget lines  
- Claiming Open Banking match is the official accounting reconciliation (Sage remains primary — see [`cost-control-sage.md`](./cost-control-sage.md))  

## Verify locally

```bash
cd veyvio-cost-control
npm test
npm run dev
# Settings → Connect bank (sandbox) → open /bank
```
