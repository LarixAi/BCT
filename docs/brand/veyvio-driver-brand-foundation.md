# Veyvio Driver Brand Foundation

Phone-first product brand for the field driver app. Companion to [Veyvio Yard](./veyvio-yard-brand-foundation.md). Same parent platform, different product colour and role.

**Reference canvas (phone lockups):** [canvases/veyvio-driver-brand-phone.canvas.tsx](./canvases/veyvio-driver-brand-phone.canvas.tsx)

**Implementation tokens:** [veyvio-driver-design-tokens.md](./veyvio-driver-design-tokens.md)

**Phone surfaces checklist:** [veyvio-driver-phone-surfaces.md](./veyvio-driver-phone-surfaces.md)

---

## 1. Brand architecture

### Master brand

**Veyvio** — connected transport operations platform.

### Product name

**Veyvio Driver**

### Product descriptor

**Duty, vehicle checks, navigation, and passenger journey operations in the field**

### Correct naming

Use:

* Veyvio Driver
* Open Veyvio Driver
* Recorded in Veyvio Driver
* Page titles: `Screen — Veyvio Driver` (see `driverPageTitle()`)

Avoid:

* Driver App / The Driver App
* Veyvio Depot Driver
* Fleet Driver
* Yard Manager language on Driver screens (“Contact Yard” → Operations / Control)

Do not use **Yard Teal** as the Driver primary action colour. Driver primary accent is **Driver Blue**.

---

## 2. What Veyvio Driver is

Veyvio Driver is the phone the driver uses from depot prep through live journey to handback.

It helps drivers answer:

1. What do I need to do next?
2. Is the vehicle safe and clear for this duty?
3. Where am I going, and who is on board?
4. What must be recorded before I move or leave?
5. Am I still able to get Home / sync / get help?

It should feel like a calm, dependable ops radio in your pocket — not a rideshare gig console.

---

## 3. Purpose and promise

### Purpose

**Help drivers complete every duty safely, clearly, and with a trustworthy operational record.**

### Brand promise (shared master)

**Move smarter. Operate safer.**

### Driver campaign line

**Know your vehicle before you move.**

Use the campaign line on splash, welcome, about. Use the master promise on chrome / quieter surfaces.

---

## 4. Visual identity (phone)

| Role | Name | Hex | Use |
|------|------|-----|-----|
| Chrome / splash | Veyvio Midnight | `#0B1526` | Header, splash background, theme-color |
| Primary Driver accent | Driver Blue | `#2F6BFF` | Active tabs, rails, CTAs on brand surfaces, links |
| Lockup sublabel | Driver Sky | `#8EC5FF` | `DRIVER` under `VEYVIO`, depots labels on dark |
| Soft fill | Driver Blue soft | `#EFF6FF` | Selected cards, hub tab wells, “heading to” panels |
| Page | Cool grey | `#F5F7FA` | In-app content background |
| Ready | — | `#178C4B` | Cleared / ok |
| Attention | — | `#D97706` | Due / warn |
| Critical | — | `#D92D20` | Safety stop |
| VOR | — | `#B42318` | Off road |

**Never use status by colour alone** — always pair with label + context.

### Wordmark lockup

Two-line stack on Midnight:

1. **VEYVIO** — white, extrabold, tight tracking  
2. **DRIVER** — Driver Sky, uppercase, wide letter-spacing  

Splash may show a short Driver Blue accent bar / glow above the lockup.

Canonical sizes: `Veyvio Driver /src/components/brand/brand-lockup.ts`  
SVG assets: `Veyvio Driver /src/assets/brand/`

### Typography

* Product UI: Inter / Inter Tight (display)
* Marketing splash: Manrope where already wired
* Registrations: bold, high visibility, tabular nums

---

## 5. Voice (UI copy)

Clear, calm, direct — like a strong transport supervisor on a busy shift.

* Lead with ops meaning: “Vehicle check incomplete” not “Update failed”
* Specific: reg, stop name, passenger, defect type
* Serious events stay calm: “Vehicle cannot enter service. A safety-critical defect is open.”
* Avoid entity/mutation/API jargon; translate to operational language
* Do not copy rideshare chrome (“Go online”, heatmaps, gig earnings as the home story)

---

## 6. UX principles (Driver phone)

1. **Next action before noise** — one clear primary CTA
2. **Status before statistics** — blockers and due work before dashboards
3. **Home always reachable on hubs** — light bottom nav on five primary hubs only (Home · Duties · Checks · Messages · More); hidden on focused workflows; duty sections are a top strip, not a second bottom bar
4. **Evidence before assumption** — defects, delays, drop-offs leave a record
5. **Large practical controls** — gloves, outdoor light, one-hand use
6. **Offline / sync visible** — sync badge always honest
7. **Safety-critical never buried**
8. **Full-bleed only for focus flows** — open/end journey wizards and map nav hide chrome; hub canvases keep hub tabs

---

## 7. Navigation chrome (current phone pattern)

| Layer | Role |
|-------|------|
| Hub shells | Home / More: Driver Blue status strip + quiet lockup (no Midnight chrome). Duties / Checks / Messages: full workspace canvas + adaptive sheet |
| `AppChromeHeader` | Midnight + Driver Blue rail on **focused** routes only (settings detail, check wizards, duty hub chrome screens) |
| `DutySubnav` | When on a duty detail: Duty / Journey / … under Midnight chrome (not a second bottom bar) |
| Main content | Max-width phone column (hubs may be full-bleed) |
| `BottomNav` | Light five-tab bar on **primary hubs only** (`/`, `/trips`, `/checks`, `/messages`, `/more`); label **Duties** (URL may stay `/trips`). Hidden on nested / focused workflows |

Do **not** show hub tabs inside journey wizards, map nav, check flows, conversations, or More settings subpages — use contextual Back / Home instead.
Do **not** replace the hub tab set with a duty-only bar that hides Home on primary hubs.

---

## 8. Relationship to other Veyvio products

| Product | Colour signal | Job |
|---------|---------------|-----|
| Veyvio (platform) | Midnight + Blue | Trust, company |
| **Veyvio Driver** | Midnight + **Driver Blue / Sky** | Field duty execution |
| Veyvio Yard | Midnight + **Yard Teal** | Depot readiness |
| Veyvio Admin | Platform Blue | Control / config |

Cross-app events and ops commands stay shared; **brand chrome does not**.

---

## 9. Source of truth in code

| Concern | Path |
|---------|------|
| Copy constants | `Veyvio Driver /src/components/brand/brand-copy.ts` |
| Lockup sizes / hex | `Veyvio Driver /src/components/brand/brand-lockup.ts` |
| Wordmark UI | `BrandWordmark` / `BrandWordmarkGraphic` / `SplashBrandMark` |
| Hub nav policy | `Veyvio Driver /src/domain/driver/navigation-policy.ts` |
| Phone surfaces inventory | [veyvio-driver-phone-surfaces.md](./veyvio-driver-phone-surfaces.md) |
| Visual phone reference | [canvases/veyvio-driver-brand-phone.canvas.tsx](./canvases/veyvio-driver-brand-phone.canvas.tsx) |
| CSS tokens | `Veyvio Driver /src/styles.css` |
| Splash / Capacitor | `capacitor.config.ts` (`backgroundColor: #0B1526`) |
| Shell | `AppShell`, `AppChromeHeader`, `BottomNav`, `DutySubnav` |
| Page titles | `driverPageTitle()` on route `head` |

When changing phone brand, update this foundation + the phone canvas + tokens doc together.
