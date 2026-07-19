# Driver app — verification, password reset & OAuth

Supabase sends sign-up and password-reset emails. The driver app routes users through `/auth/verify` and `/auth/reset-password` after they tap a link.

## 1. Enable email confirmation

**Authentication** → **Providers** → **Email**:

- Turn **Confirm email** ON.
- Optional: custom SMTP (see customer [`AUTH_EMAIL_SETUP.md`](../../customer/docs/AUTH_EMAIL_SETUP.md)).

Drivers should sign up with the **same email their fleet operator invited**.

## 2. URL configuration (required)

**Authentication** → **URL configuration**

| Setting | Value |
|--------|--------|
| **Site URL** | `https://localhost` (installed APK) or `https://localhost:5173` (browser dev) |
| **Redirect URLs** | Add every URL below |

```
https://localhost/auth/verify
https://localhost/auth/reset-password
https://localhost:5173/auth/verify
https://localhost:5173/auth/reset-password
com.coresupport.fleet.driver://auth/verify
com.coresupport.fleet.driver://auth/reset-password
com.coresupport.fleet.driver://verify
com.coresupport.fleet.driver://reset-password
```

On **installed Android APKs**, native redirects use `com.coresupport.fleet.driver://verify`.

Rebuild after URL changes: `npm run driver:run`

## 3. Google and Apple sign-in

**Authentication** → **Providers**:

- **Google** — enable; Web client for Supabase + Android client for package `com.coresupport.fleet.driver` (with SHA-1).
- **Apple** — enable; Services ID + key from Apple Developer.

Redirect URLs from section 2 must be allow-listed in Supabase (and Apple/Google consoles where applicable).

Native flow: system browser → `com.coresupport.fleet.driver://verify` → app provisions via `link_driver_account`.

## 4. Test the flow

1. Sign up with invited email → **Check your email** screen.
2. Tap confirmation link → `/auth/verify` → links driver row if invited.
3. **Continue with Google / Apple** on sign-in or sign-up → returns to app → `/auth/verify`.
4. Forgot password → reset email → `/auth/reset-password`.

## 5. Environment variables

`driver/.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_DRIVER_APP_URL=https://localhost
```

Phone dev: `npm run phone:android` runs `scripts/sync-phone-env.mjs`, which sets `VITE_DRIVER_APP_URL=https://<LAN_IP>:5173`.

## 6. Troubleshooting

| Problem | Fix |
|---------|-----|
| Email verified but no driver profile | Operator must invite that email first |
| OAuth opens browser but not app | Confirm custom scheme redirect URLs in Supabase |
| Google sign-in disabled | Enable provider in Supabase Dashboard |
| Link expired | Resend from `/auth/check-email` |
