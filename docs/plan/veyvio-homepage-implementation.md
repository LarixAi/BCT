# Veyvio homepage — implementation progress

**Blueprint:** `docs/blueprint/veyvio-homepage-blueprint-v2.md`  
**App:** `veyvio-website/`  
**Claims register:** `docs/plan/veyvio-homepage-claims-register.md`

## Part F.1 — Tier 1 (homepage launch scope)

| Page / capability | Status |
|-------------------|--------|
| Homepage (§7 all sections) | Done |
| Platform overview + 5 app pages | Done |
| Solutions hub + 7 solution pages | Done |
| 8 industry pages + industries hub | Done |
| Trust Centre + security + tenant isolation | Done |
| Pricing (no list prices) | Done |
| Implementation + pilot programme | Done |
| Resource Centre + 6 guide articles | Done |
| Demo + contact + sign-in redirect | Done |
| Legal pages (draft content) | Done — Legal review pending |
| Integrations (honest “none listed”) | Done |
| Community transport landing (`/community-transport`) | Done — OD #3 |
| Status + support | Done (scaffold) |

## Part F.2 — Tier 2 (post-launch)

| Page | Status |
|------|--------|
| About, mission, partners, careers, customer success, release notes | Done |
| Resources sub-hubs (guides, templates, FAQs, glossary, insights) | Done |

## SEO & quality

| Item | Status |
|------|--------|
| XML sitemap (59 URLs) | `public/sitemap.xml` — generated at build |
| Per-page meta + OG tags | `usePageMeta` hook |
| Favicon + OG image | `public/favicon.svg`, `og-image.png` |
| a11y smoke tests | `npm run test:a11y` (Playwright) |
| Staging `noindex` | `wrangler deploy --env staging` |
| API health check | `GET /api/health` |

## Legal (draft — Legal review required)

| Page | Status |
|------|--------|
| Privacy, cookies, terms, vulnerability disclosure | Draft in `legal-pages.ts` |
| Accessibility statement | Done |

## Production deploy

| Item | Status |
|------|--------|
| Cloudflare Worker + static assets | `wrangler.toml` + `worker/index.ts` |
| Deploy runbook | `docs/deploy/website-production.md` |
| HubSpot / Resend / Cal.com | Adapters ready — set Worker secrets |

## Hero imagery

| Asset | Source |
|-------|--------|
| Driver | Real Gate 1 handset screenshot |
| Command / Yard | Representative SVG — swap for product captures when ready |

## Part H — Definition of Ready

| Criterion | Status |
|-----------|--------|
| Positioning grounded (Part A) | Done in copy |
| Claims register (Part E) | Done — review each release |
| Tenant isolation copy matches engineering (Part C.2) | Draft — Security sign-off pending |
| F.1 IA committed | Done |
| Brand components (§9) | Done — hero, cards, footer |
| CRM / calendar / consent selected enough to build | Adapters built — credentials pending |
| Legal identity / contact placeholders | Provisional defaults in `open-decisions.ts` |
| Named owners | **Assign** content, technical, accessibility owners |

## §19 — Not yet done (Definition of Done)

- [x] Production deploy (workers.dev) — `https://veyvio-website.larixai-veyvio.workers.dev`
- [ ] Custom domain `veyvio.com` attached in Cloudflare
- [ ] WCAG 2.2 AA formal acceptance review
- [ ] Core Web Vitals field monitoring in production
- [ ] CRM + email live credentials and delivery monitoring
- [ ] Legal-approved privacy, terms, cookie notice
- [ ] Production deploy + `noindex` on staging
- [ ] Real product screenshots (hero uses styled compositions)
- [ ] Device verification on iOS/Android browsers

## Next recommended slices

1. Legal review of privacy, terms, cookie notice  
2. Production deploy (static site + form API)  
3. HubSpot / Resend / Cal.com credentials  
4. Capture real Command/Driver/Yard screenshots for hero  
5. Tier 2 company pages  
6. Automated accessibility scan in CI
