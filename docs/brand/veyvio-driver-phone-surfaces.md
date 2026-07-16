# Veyvio Driver — Phone brand surfaces

Inventory of where the phone brand must appear. Use with [veyvio-driver-brand-foundation.md](./veyvio-driver-brand-foundation.md).

## Must show Veyvio Driver identity

| Surface | Component / route | Brand notes |
|---------|-------------------|-------------|
| Splash | `SplashBrandMark`, `/splash` | Midnight, lockup + campaign line + soft blue glow |
| Sign-in / public | `BrandPublicHeader` | Compact lockup + master promise |
| App chrome | `AppChromeHeader` | Thick Driver Blue rail, lockup, depot, sync |
| Bottom nav | `BottomNav` | Light bar on **primary hubs only** (`/`, `/trips`, `/checks`, `/messages`, `/more`); active = Driver Blue soft fill; hidden on focused workflows |
| Duty strip | `DutySubnav` | Under chrome; not a second bottom tab bar |
| Home | `CleanHomeScreen` on `/` | Status strip first (safe-area) → quiet lockup + utilities → headline → map → one CTA → flat Today rows |
| Duties list | `DutiesWorkspaceScreen` on `/trips` | Full-bleed map workspace: floating Home/Safety + duty pill, adaptive bottom sheet, duties list overlay |
| Checks | `ChecksWorkspaceScreen` on `/checks` | Full-bleed vehicle canvas + floating Home/Safety + reg pill, adaptive check sheet, previous-checks overlay |
| Messages | `MessagesWorkspaceScreen` on `/messages` | Full-bleed thread canvas + floating Home/Safety + unread pill, adaptive message sheet, inbox overlay |
| More | `MoreHub` on `/more` | Driver Blue profile strip, identity header, compliance attention, grouped settings rows (bottom nav kept) |
| About | More → About | `About — Veyvio Driver`, campaign + promise |
| Map nav header | `NavShell` | Product line on Midnight journey chrome |
| Browser titles | route `head` | `… — Veyvio Driver` via `driverPageTitle()` |
| Android theme | Capacitor / theme-color | `#0B1526` |

## Full-bleed (chrome hidden)

| Flow | Path pattern | Reason |
|------|--------------|--------|
| Open / end journey | `/journey/(open\|end)` | Wizard focus |
| In-trip map nav | `/duties/*/nav…` | Driving focus |
| Duties workspace | `/trips` | Map + adaptive sheet + hub tabs |
| Checks workspace | `/checks` | Vehicle canvas + adaptive sheet + hub tabs |
| Messages workspace | `/messages` | Thread canvas + adaptive sheet + hub tabs |

Home and More hub hide Midnight chrome but keep bottom nav (own status / profile strip).

Hub tabs are **hidden** on focused routes (`/duties/*`, `/checks/*` wizards, `/messages/*` conversations, `/more/*` settings, incidents, auth).

Main tabs return on the five primary hubs. Home stays reachable via hub tabs or workspace Home FABs.

## Bottom navigation policy

See `Veyvio Driver /src/domain/driver/navigation-policy.ts` and [prototypes/veyvio-driver-bottom-navigation.md](../prototypes/veyvio-driver-bottom-navigation.md).

## Assets

| Asset | Path |
|-------|------|
| Wordmark SVGs | `Veyvio Driver /src/assets/brand/*.svg` |
| Copy constants | `…/components/brand/brand-copy.ts` |
| Lockup sizes | `…/components/brand/brand-lockup.ts` |
| Phone canvas | [canvases/veyvio-driver-brand-phone.canvas.tsx](./canvases/veyvio-driver-brand-phone.canvas.tsx) |
| Brand e2e | `Veyvio Driver /e2e/brand.spec.ts` |

## Install recall (APK)

After brand chrome changes, rebuild with `npm run cap:build:apk` then `npm run cap:install:phone`. If the phone still shows an old shell, force-stop or clear app storage once — WebView can cache assets.
