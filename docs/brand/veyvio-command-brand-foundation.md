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

## 4. Voice (UI copy)

Clear, calm, direct, operational — like a strong transport controller on a busy shift.

* Lead with operational meaning: “Three duties need a vehicle before 07:30”
* Explain blockers specifically
* Stay calm for serious events
* Avoid: entity updated, mutation failed, API unavailable

---

## 5. Chrome rules

* **Sidebar:** Midnight, grouped navigation, Command Blue active item, wordmark at top
* **Top bar:** Company · operational date · depot · search · sync/connection · alerts · profile
* **Content:** Page bg `#F2F5F9`, dense tables/cards, one clear primary action per screen
* **Auth:** Midnight brand panel + white form card; MFA interrupts before the dashboard

---

## 6. Implementation notes

Tokens live in `Veyvio admin /src/index.css` (`@theme`). Wordmark: `src/components/brand/CommandWordmark.tsx`. Auth shell: `src/components/brand/AuthLayout.tsx`.
