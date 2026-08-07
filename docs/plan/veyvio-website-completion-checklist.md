# Veyvio website — completion checklist

**Scope:** `veyvio-website/` (formerly BCT brand → Veyvio).  
**Audit date:** 28 July 2026.  
**Last progress:** 28 July 2026 (customer readiness close-out — demo email probe + CH residual).  
**Canonical domain:** `https://veyvio.co.uk` (confirmed).

Live homepage: `Hero` + `BelowFoldPreview` only. Header/hero locked unless explicitly approved.

---

## Stop-ship (P0)

- [x] **CI** — Website job in `.github/workflows/ci.yml`
- [x] **Canonical domain** — `.co.uk` confirmed and aligned
- [x] **Legal notices published** — Privacy / cookies / terms founder-approved 28 July 2026
- [ ] **Companies House name** — provisional (`Veyvio Ltd`) — **operator-only** (see step below)
- [x] **Custom domain** — `veyvio.co.uk` + `www` live (HTTP 200)
- [x] **Integrations secrets** — HubSpot / Resend / Cal.com pushed via `setup:integrations` and redeployed

### Companies House residual (single owner step)

1. Confirm the registered company name with Companies House (do not invent a name in product copy).  
2. Set `VITE_LEGAL_COMPANY_NAME` to that exact string in the website Cloudflare/Pages env.  
3. Redeploy `veyvio-website` (`npm run deploy` from `veyvio-website/`).  
4. Tick the P0 checkbox above.

Until then, public legal pages correctly state the name is provisional.

---

## High priority (P1)

- [x] **Claims enforcement** — `scripts/verify-claims-publish.mjs` + `npm run verify:claims` in CI
- [x] **CSP + HSTS** — On Worker responses (HSTS enabled after domain confirmed)
- [x] **Demo rate limit** — 8 / min / IP best-effort
- [x] **Page meta** — Contact / Demo / community / Planned
- [x] **Sitemap/robots** — From `VITE_SITE_URL`
- [x] **Homepage orphans** — **Decision: keep BelowFoldPreview**; deleted unused section components
- [x] **Integrations** — Secrets live; probe with `npm run verify:demo-email` (reports `emailDelivered`)
- [x] **Lint** — `eslint.config.js` + CI job (28 Jul 2026)
- [x] **Cookie dialog** — Escape dismisses (essential-only) + basic focus trap (28 Jul 2026)
- [ ] **A11y gate** — axe-core / WCAG AA beyond smoke (`npm run test:a11y` covers basics)
- [ ] **Resend domain** — if `verify:demo-email` shows `emailDelivered: false`, verify sending domain for `DEMO_FROM_EMAIL` in Resend + Cloudflare DNS *(operator)*

---

## Later (P2)

- [ ] Analytics coverage gaps
- [x] BCT rename in `command-dispatch.svg`
- [x] Footer Terms link
- [ ] `/compare` route decision
- [ ] Unit tests for demo validation + claims helpers
- [ ] Production analytics endpoint or document deferred

---

## Homepage decision (recorded)

**Keep `BelowFoldPreview`.** It is the curated below-fold composition (ecosystem, operator fit, differentiators, operating-model comparison, solution finder, pilot/CTA). The older multi-section stack (`ProductEcosystem`, `ConsultationBand`, `HowItWorks`, etc.) was unused dead code and has been removed.

Kept: `Hero.tsx`, `BelowFoldPreview.tsx`.

---

## Residual ops note

```bash
cd veyvio-website && npm run verify:demo-email
```

API returns `ok: true` with `emailDelivered` true|false. If false, check Resend dashboard and that `DEMO_FROM_EMAIL` uses a verified domain. HubSpot contacts should still appear for probe refs (`VY-DEMO-*`).
