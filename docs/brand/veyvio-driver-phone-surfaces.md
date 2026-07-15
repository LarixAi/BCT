# Veyvio Driver — Phone brand surfaces

Inventory of where the phone brand must appear. Use with [veyvio-driver-brand-foundation.md](./veyvio-driver-brand-foundation.md).

## Must show Veyvio Driver identity

| Surface | Component / route | Brand notes |
|---------|-------------------|-------------|
| Splash | `SplashBrandMark`, `/splash` | Midnight, lockup + campaign line + soft blue glow |
| Sign-in / public | `BrandPublicHeader` | Compact lockup + master promise |
| App chrome | `AppChromeHeader` | Thick Driver Blue rail, lockup, depot, sync |
| Bottom nav | `BottomNav` | Midnight bar; active = Driver Blue fill + rail |
| Duty strip | `DutySubnav` | Under chrome; not a second bottom tab bar |
| Home | `HomeHeader` on `/` | Midnight brand band + blue rail + VEYVIO/DRIVER + campaign; **ops headline below** (never “Welcome back”) |
| About | More → About | `About — Veyvio Driver`, campaign + promise |
| Map nav header | `NavShell` | Product line on Midnight journey chrome |
| Browser titles | route `head` | `… — Veyvio Driver` via `driverPageTitle()` |
| Android theme | Capacitor / theme-color | `#0B1526` |

## Full-bleed (chrome hidden)

| Flow | Path pattern | Reason |
|------|--------------|--------|
| Open / end journey | `/journey/(open\|end)` | Wizard focus |
| In-trip map nav | `/duties/*/nav…` | Driving focus |

Main tabs return when leaving these flows. Home stays reachable on all other duty screens.

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
