# Lovable Admin environment (production)

Set these in **Lovable → Project → Settings → Environment variables** for the connected Admin app, then **Publish** / redeploy.

| Variable | Value |
|----------|--------|
| `VITE_MOCK_API` | `false` |
| `VITE_OPERATIONS_MOCK` | `false` |
| `VITE_API_URL` | `https://qeckgqjrfbdyxchuncdt.supabase.co/functions/v1/command-api` |
| `VITE_SUPABASE_ANON_KEY` | Supabase project anon key (same as local Admin `.env`) |
| `VITE_SUPABASE_URL` | `https://qeckgqjrfbdyxchuncdt.supabase.co` (optional if anon key embeds ref) |

**Do not set** `VITE_DEV_BYPASS_AUTH`, `ALLOW_PLATFORM_BOOTSTRAP`, or `MFA_DEV_MODE` in production.

After merge to `main`, Lovable syncs from the connected branch (see `AGENTS.md`). Confirm the publish build succeeds and sign in against live Command API.

## Post-publish smoke

1. Login → company select (BCT).
2. Switch company → lists refresh.
3. Dial-a-Ride request → accept / decline.
4. Yard / live ops → depot-scoped data only.
