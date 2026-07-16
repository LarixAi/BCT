# Veyvio Yard — Phone brand surfaces

Inventory of where the phone brand must appear. Use with [veyvio-yard-brand-foundation.md](./veyvio-yard-brand-foundation.md) and [design-tokens.md](./design-tokens.md).

## Must show Veyvio Yard identity

| Surface | Component / route | Brand notes |
|---------|-------------------|-------------|
| Splash | `SplashBrandMark`, `/splash` | Midnight, lockup + campaign line + soft Yard Teal glow |
| Sign-in / public | `PublicShell` | Compact lockup + master promise; Teal accent rail |
| App chrome | `AppShell` header | Midnight, Teal rail, lockup, depot, scan, sync |
| Bottom nav | `BottomNav` | Midnight bar on hubs; active = Yard Teal; hubs: `/`, `/checks`, `/yard`, `/yard/map`, `/more` |
| Home | `/` | Operational headline first (never generic welcome); attention before KPIs |
| Checks | `/checks` | Queue awaiting check + recent outcomes |
| Vehicles | `/yard` | Fleet inventory; reg-first cards; zone/status filters |
| Yard | `/yard/map` | Physical location and bay occupancy (not the same as Vehicles) |
| More | `/more` | Teal identity strip, ops links, Account / Settings / About |
| Account | `/more/account` | Identity, depot, role, company |
| Settings | `/more/settings` | Sync, security entry points |
| About | `/more/about` | `About — Veyvio Yard`, campaign + master promise |
| Browser titles | route `head` | `… — Veyvio Yard` via `yardPageTitle()` |
| Android theme | Capacitor / theme-color | `#0B1526` |

## Focused workflows (bottom nav kept for now)

| Flow | Path pattern | Reason |
|------|--------------|--------|
| Yard check wizard | `/yard/$id/check` | Guided check focus |
| Vehicle condition / damage | `/yard/$id/condition…` | Evidence capture |
| VOR case | `/vor/$caseId` | Safety-critical decision |
| More subpages | `/more/*` (except hub) | Account, settings, sync, about |

Hub tabs remain on the five primary hubs. Scan stays a header action (not a sixth tab).

## Bottom navigation policy

Brand target: **Home · Checks · Vehicles · Yard · More**

| Brand tab | Route | Owns |
|-----------|-------|------|
| Home | `/` | Attention, departures, inventory snapshot |
| Checks | `/checks` | Yard / DVSA checks due |
| Vehicles | `/yard` | Vehicle record, condition, equipment, status |
| Yard | `/yard/map` | Physical location, movements, bays |
| More | `/more` | Tasks, inspections, VOR, defects, account |

## Assets

| Asset | Path |
|-------|------|
| Wordmark | `src/components/brand/BrandWordmark.tsx` |
| Splash mark | `src/components/brand/SplashBrandMark.tsx` |
| Copy constants | `src/components/brand/brand-copy.ts` |
| Operational copy | `src/copy/yard-messages.ts` |
| Phone canvas | [canvases/veyvio-yard-brand-phone.canvas.tsx](./canvases/veyvio-yard-brand-phone.canvas.tsx) |
| Splash wordmark SVG | `scripts/icons/splash-wordmark.svg` |

## Install recall (APK)

After brand chrome changes, rebuild with `npm run android:run` (or `cap:sync` + install). If the phone still shows an old shell, force-stop or clear app storage once — WebView can cache assets.
