# Wave 3E-2 — Driver native secure session custody

**Status:** Implementation in progress / device proof required for lock  
**Does not touch:** Command 3E-1 BFF, Wave 2 queue/replay, RLS, organisation_id

## Invariant

On Android/iOS, Supabase access/refresh credentials live in **OS-backed secure storage** (Keychain / Keystore), not WebView `localStorage` / `sessionStorage`.

## Design

| Surface | Custody |
|---------|---------|
| Capacitor native | `@capgo/capacitor-native-biometric` `setData` / `getData` with `AccessControl.NONE` (encrypted at rest; no bio prompt on auto-refresh) |
| Browser / Vite | Explicit `browser_dev_fallback` via `localStorage` — never used when `Capacitor.isNativePlatform()` |
| Company-select pending tokens | Process memory only (not `sessionStorage`) |
| Biometric unlock refresh | Existing biometric Keychain path unchanged |

Adapter: `veyvio-driver-App/src/lib/supabase/auth-session-storage.js`  
Wired in: `src/lib/supabase/client.js`

Legacy `sb-*-auth-token` keys are purged from WebView storage on native write/read/clear.

## Device proof matrix (required for 3E-2 lock)

1. Normal sign-in on physical Android (or iOS).
2. Confirm Supabase credentials **absent** from WebView `localStorage` / `sessionStorage` (no `sb-*-auth-token`, no pending auth token keys).
3. Kill app → reopen → secure-session restoration works (duty/offline recovery as before).
4. Logout → secure credentials removed from native store; WebView still clean.
5. Offline cold start still reaches existing offline recovery from sanitized verified context (no exposed tokens required).
6. No new Wave 2 defect/walkaround/J403 specimen unless auth changes unexpectedly alter those paths.

## Relationship to Wave 3E-1

Command canonical-host smoke remains an independent acceptance checkbox. Do not mark Wave 3E complete until both 3E-1 and 3E-2 are locked.
