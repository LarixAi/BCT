# Veyvio Command Brand Foundation

Web-app product brand for planning, control, monitoring and administration. Companion to [Veyvio Driver](./veyvio-driver-brand-foundation.md) and [Veyvio Yard](./veyvio-yard-brand-foundation.md). Same parent platform, different product colour and role.

**Reference canvas:** [canvases/veyvio-command-brand.canvas.tsx](./canvases/veyvio-command-brand.canvas.tsx) (Veyvio Command — web app brand)

---

## 1. Brand architecture

### Master brand

**Veyvio** — connected transport operations platform.

### Product name

**Veyvio Command**

### Product descriptor

**Planning, dispatch, monitoring and administration for transport operations**

### Correct naming

Use:

* Veyvio Command
* Open Veyvio Command
* Recorded in Veyvio Command

Avoid:

* Admin App / The Admin App
* Yard Manager language on Command screens
* Driver Blue or Yard Teal as the primary Command accent

Command primary accent is **Veyvio Blue** (`#2F6BFF`). Chrome and sign-in use **Veyvio Midnight** (`#0B1526`).

---

## 2. Central idea

**Operational confidence** — every screen reduces uncertainty; statuses are unambiguous; actions create trustworthy records.

---

## 3. Design tokens

| Token | Hex | Use |
| --- | --- | --- |
| Veyvio Midnight | `#0B1526` | Sidebar, sign-in hero, primary buttons |
| Veyvio Blue | `#2F6BFF` | COMMAND wordmark, active nav, links |
| Command Blue dark | `#1F4ED8` | Hover / pressed |
| Command Blue soft | `#EFF6FF` | Soft fills |
| Page background | `#F2F5F9` | App canvas |
| Surface | `#FFFFFF` | Cards, panels |
| Ink | `#101828` | Primary text |
| Ink soft | `#344054` | Secondary text |
| Muted | `#667085` | Supporting text |
| Border | `#DCE2EA` | Dividers, inputs |
| Ready | `#178C4B` | On time, compliant, live |
| Attention | `#D97706` | Needs action |
| Critical | `#D92D20` | Safety / service stop |
| VOR | `#B42318` | Vehicle off road |
| Stale | `#7A5AF8` | Stale telemetry segment |

**Never status by colour alone** — always label + context.

### Typeface

**Inter** for product UI.

### Wordmark

**VEYVIO** (heavy) + letterspaced **COMMAND** in Veyvio Blue. Distinct from Driver (sky) and Yard (teal).

---

## 4. Light & dark theme

Command ships both a light theme (day) and a dark theme (night). This is the one deliberate exception to the "don't use Driver's colours" rule in Section 1: **dark mode intentionally borrows Driver's black + teal register**, so Command feels like the same platform after hours as Driver's auth/splash screens. Light mode stays Command Blue.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| Command accent (500/600) | `#2F6BFF` (Veyvio Blue) | `#4A8FA3` (Driver Teal) | Active nav, links, primary buttons |
| Command accent hover (700) | `#1F4ED8` (darker) | `#7FB3C4` (lighter) | Hover / pressed — dark surfaces brighten on hover instead of darkening |
| Chrome (midnight/sidebar) | `#0B1526` | `#000000` | Sidebar, auth hero panel — pure black in dark mode, matching Driver's splash |
| Page background | `#F2F5F9` | `#0D1420` | App canvas |
| Surface | `#FFFFFF` | `#131B2B` | Cards, panels, inputs |
| Surface muted | `#F8FAFC` | `#0F1826` | Nested panels |
| Ink / Ink soft / Muted | `#101828` / `#344054` / `#667085` | `#EDF1F7` / `#C4CCDA` / `#8A93A6` | Text |
| Border / Border strong | `#DCE2EA` / `#C7D0DD` | `#233049` / `#2D3B57` | Dividers, inputs |

Status colours (Ready, Attention, Critical, VOR) stay the same hex in both themes — they're semantic, not accent, and already legible on dark surfaces.

**Resolution order:** OS `prefers-color-scheme`, then an explicit user override (light/dark toggle, persisted). "System" is the default — there's no separate default theme choice to make.

**Source of truth:** `Veyvio admin /src/index.css` (`@theme` + dark overrides), `Veyvio admin /src/lib/theme-context.tsx` (provider/toggle logic).

---

## 5. Voice (UI copy)

Clear, calm, direct, operational — like a strong transport controller on a busy shift.

* Lead with operational meaning: “Three duties need a vehicle before 07:30”
* Explain blockers specifically
* Stay calm for serious events
* Avoid: entity updated, mutation failed, API unavailable

---

## 6. Chrome rules

* **Sidebar:** Midnight, grouped navigation, Command Blue active item, wordmark at top
* **Top bar:** Company · operational date · depot · search · sync/connection · alerts · profile
* **Content:** Page bg `#F2F5F9`, dense tables/cards, one clear primary action per screen
* **Auth:** Midnight brand panel + white form card; MFA interrupts before the dashboard

---

## 7. Implementation notes

Tokens live in `Veyvio admin /src/index.css` (`@theme` + dark overrides). Wordmark: `src/components/brand/CommandWordmark.tsx`. Auth shell: `src/components/brand/AuthLayout.tsx`. Theme provider / toggle: `src/lib/theme-context.tsx`, `src/components/layout/ThemeToggle.tsx`.

Colour utilities across the app resolve through CSS custom properties (`bg-page`, `text-ink`, `bg-surface`, `border-border`, `text-command-600`, …), so most screens re-theme automatically. Screens still styled with raw Tailwind greys (`bg-slate-*`, `text-slate-*`) predate this system and won't react to dark mode until swept onto the shared tokens.
