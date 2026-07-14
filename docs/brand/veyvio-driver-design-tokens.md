# Veyvio Driver — Design Tokens

Maps the [Driver brand foundation](./veyvio-driver-brand-foundation.md) to CSS in `Veyvio Driver /src/styles.css`.

## Brand colours

| Token | CSS variable | Hex (light) | Usage |
|-------|--------------|-------------|--------|
| Veyvio Midnight | `--accent` / `--primary` | `#0B1526` | Chrome header, bottom nav, primary buttons, splash |
| Driver Blue | `--link` / `--driver-blue` | `#2F6BFF` | Active nav, accent rails, brand CTAs, map route |
| Driver Sky | `--driver-sky` | `#8EC5FF` | DRIVER sublabel, sky accents on Midnight |
| Driver Blue soft | `--driver-blue-soft` | `#EFF6FF` | Selected rows, “heading to” panels |
| Ready | `--ok` | `#178C4B` | Cleared / ok |
| Attention | `--warn` | `#D97706` | Due / warn |
| Critical | `--destructive` | `#D92D20` | Safety-critical |
| VOR | `--vor` | `#B42318` | Off road |

## Neutrals (light)

| Token | Hex | Usage |
|-------|-----|--------|
| `--background` | `#F5F7FA` | Page background |
| `--foreground` / `--ink` | `#101828` | Primary text |
| `--muted` | `#667085` | Labels |
| `--border` | `#E4E7EC` | Dividers |
| `--card` / `--surface` | `#FFFFFF` | Cards |

## Not for Driver primary

| Colour | Hex | Note |
|--------|-----|------|
| Yard Teal | `#12A89D` | Yard product only — do not use as Driver primary |

## Tailwind classes (Driver)

```tsx
<header className="bg-accent text-white" />
<span className="text-link bg-driver-blue/20" />
<span className="text-driver-sky" />
<div className="bg-driver-blue-soft border border-link/20" />
<div className="h-1 w-full bg-link" /> {/* brand rail */}
```

## Lockup constants

`Veyvio Driver /src/components/brand/brand-lockup.ts`

| Size | VEYVIO | DRIVER tracking |
|------|--------|-----------------|
| splash | 1.75rem / 800 | 0.42em |
| header | 0.6875rem / 800 | 0.32em |
| chrome | 0.8125rem / 800 | 0.28em |
| icon | 1.125rem / 800 | 0.34em |

## Native / PWA

| Surface | Value |
|---------|--------|
| theme-color / splash background | `#0B1526` |
| Capacitor splash | Midnight + in-app `SplashBrandMark` |
| App id | `uk.veyvio.driver` |

## Source of truth

`Veyvio Driver /src/styles.css` → `:root` and `.dark`.
