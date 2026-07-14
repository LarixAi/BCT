# Routes

TanStack Start uses **file-based routing**. See `src/routes/README.md` conventions.

## Layout structure (Phase 1)

| Path | Purpose |
| --- | --- |
| `__root.tsx` | App providers, global error boundary |
| `_public.tsx` | Unauthenticated layout (welcome, sign-in, sync) |
| `_public.splash.tsx` | `/splash` — startup router entry |
| `_public.welcome.$step.tsx` | `/welcome/:step` onboarding |
| `_public.sign-in.tsx` | `/sign-in` |
| `_public.mfa.tsx` | `/mfa` |
| `_public.company-select.tsx` | `/company-select` |
| `_public.depot-select.tsx` | `/depot-select` |
| `_public.initial-sync.tsx` | `/initial-sync` |
| `_app.tsx` | Authenticated guard + AppShell |
| `_app.index.tsx` | `/` home board |
| `_app.yard.*` | Vehicle inventory and detail |
| `_app.checks.tsx` | Checks |
| `_app.*` | Other operational screens |

## Entry flow

```
/splash → resolveStartupRoute() → welcome | sign-in | mfa | company | depot | sync | /
```

Unauthenticated visits to `/` are redirected to `/splash` by the `_app` route guard.
