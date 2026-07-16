# Veyvio Yard — Design Tokens

Maps the [brand foundation](./veyvio-yard-brand-foundation.md) to CSS variables in `src/styles.css`.

## Brand colours

| Token | CSS variable | Hex (light) | Usage |
|-------|--------------|-------------|--------|
| Yard Teal | `--primary` | `#12A89D` | Primary actions, active nav, scan FAB, progress |
| Veyvio Midnight | `--accent` | `#0B1526` | App header, bottom nav chrome, splash background |
| Veyvio Blue | `--link` | `#2F6BFF` | Platform links (use sparingly) |
| Ready | `--ok` | `#178C4B` | Ready / cleared status |
| Attention | `--warn` | `#D97706` | Checks due, warnings, attention items |
| Critical | `--destructive` | `#D92D20` | Safety-critical defects |
| VOR | `--vor` | `#B42318` | Vehicle off road |
| Yard Teal soft | `--yard-teal-soft` | `#DDF7F3` | Info panels, highlighted sections |

## Neutrals (light)

| Token | Hex | Usage |
|-------|-----|--------|
| `--background` | `#F5F7FA` | Page background |
| `--foreground` / `--ink` | `#101828` | Primary text |
| `--muted-foreground` | `#475467` | Secondary text |
| `--muted` | `#667085` | Labels, de-emphasised text |
| `--border` | `#E4E7EC` | Dividers, inputs |
| `--surface` / `--card` | `#FFFFFF` | Cards, panels |

## Typography

| Utility | Font | Scope |
|---------|------|--------|
| `font-sans` (default) | Inter | Product UI |
| `font-display` | Inter Tight | Headings, reg numbers |
| `font-marketing` | Manrope | Splash, welcome, marketing surfaces |
| `font-mono` | JetBrains Mono | Codes, version strings |

## Tailwind usage

```tsx
// Primary action
<Button className="bg-primary text-primary-foreground" />

// Chrome header (Midnight)
<header className="bg-accent text-white" />

// Status
<span className="text-ok">Ready</span>
<span className="text-warn">Attention</span>
<span className="text-vor">VOR</span>

// Soft highlight panel
<div className="bg-yard-teal-soft border border-primary/20" />
```

## Migration notes

- Replaced hi-vis orange (`#f97316`) with Yard Teal.
- Replaced near-black chrome (`#18181b`) with Veyvio Midnight.
- Hardcoded attention amber `#a16207` → use `text-warn` / `border-warn/*` / `bg-warn/*`.
- Status must never rely on colour alone — always pair with label + icon.

## Source of truth

`src/styles.css` → `:root` and `.dark` blocks.

## App icon & PWA assets

Master artwork (source of truth): `scripts/icons/icon-monogram-*.svg` (launcher) and `splash-wordmark.svg` (splash).

| Asset | Path | Notes |
|-------|------|--------|
| Launcher monogram | `icon-monogram-foreground.svg` | VY teal badge in 66% safe zone |
| Launcher background | `@color/ic_launcher_background` | Solid `#0B1526` |
| Splash wordmark | `splash-wordmark.svg` | VEYVIO / YARD at ~38% screen width |
| In-app splash | `SplashBrandMark` component | Midnight + Yard Teal glow; matches phone canvas |
| Phone surfaces | [veyvio-yard-phone-surfaces.md](./veyvio-yard-phone-surfaces.md) | Hub + launch inventory |
| Phone canvas | [canvases/veyvio-yard-brand-phone.canvas.tsx](./canvases/veyvio-yard-brand-phone.canvas.tsx) | Visual source of truth |
| Copy constants | `src/components/brand/brand-copy.ts` | Campaign, promise, `yardPageTitle()` |
| Regenerate | `npm run icons:android` | Runs `scripts/generate-brand-icons.mjs` |
