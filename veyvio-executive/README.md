# Veyvio Executive

The company-owner, CEO and board workspace for the Veyvio application family.

## Product boundary

Veyvio Executive owns:

- company activation and setup;
- accountable officers and organisation structure;
- governance, board programme and reserved decisions;
- cross-application executive exceptions;
- application access and privileged-user oversight;
- company-level security posture.

It does not duplicate:

- scheduling, dispatch or fleet operations from Veyvio Command;
- cost ledgers, budgets or reconciliation from Veyvio Finance;
- yard tasks and vehicle movements from Veyvio Yard;
- driver duties, checks and journeys from Veyvio Driver.

The current version is a frontend foundation using realistic demonstration data. Production
identity, company and decision data will come from the shared Veyvio platform APIs.

## Current security boundary

- This build contains demonstration data only.
- Every Executive route requires both Sites sign-in and an active Veyvio account
  with an explicit `EXECUTIVE` application grant.
- Veyvio access and refresh tokens are held in secure, HTTP-only server cookies
  and are never stored in browser JavaScript storage.
- Executive accounts are invitation-only after the initial company owner.
- Do not upload board papers, bank details, safeguarding records or other sensitive material.
- The application displays a permanent demonstration warning until the production security
  launch gate has passed.
- Source and production bundles are scanned for high-confidence secret patterns.
- Production identity and live data must not be enabled until the Executive security blueprint
  blockers have been completed and evidenced.

## Development

```bash
npm install
npm run dev
npm run build
npm test
npm run security:scan
```

Local development runs on the URL printed by the development server.

### Local UI preview (no ChatGPT Sites / Command)

`/signin-with-chatgpt` only exists on ChatGPT Sites hosting. For a local browser preview:

```bash
VEYVIO_EXECUTIVE_LOCAL_DEMO=1 npm run dev
```

Then open the printed URL (often `http://localhost:3000` or `http://localhost:3001`).

This skips the outer Sites identity gate and the Veyvio company session check so the demonstration UI can load. The bypass is additionally restricted to a loopback host and cannot open a hosted URL. **Do not set this flag in production.**

## Executive server gateway

Authenticated Executive pages and `/api/executive/*` routes use a request-scoped
server gateway. It:

- verifies the token through the central Veyvio identity service;
- independently checks issuer, audience, expiry, user and revocable session ID;
- rebuilds company membership and the explicit Executive grant on each request;
- refreshes and rotates the central session inside sensitive request handling so
  a revoked session cannot complete the operation;
- keeps access and refresh credentials in server-only cookies;
- returns only the page fields required by the browser;
- applies private/no-store browser and CDN controls; and
- assigns a server-owned request reference for support and audit correlation.

The browser must not call Supabase or the Command API directly.
