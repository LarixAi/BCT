# Credential rotation runbook (F-04)

**Purpose:** Rotate and verify production secrets before Gate 1 pilot and before any public release.  
**Companion:** [bct-pilot-setup.md](./bct-pilot-setup.md), [gate1-pilot-exit-test.md](./gate1-pilot-exit-test.md)

---

## 1. When to run

| Trigger | Action |
|---------|--------|
| Before BCT / first pilot | Full checklist below |
| After a contractor leaves | Rotate keys they could access |
| Suspected leak | Rotate affected secrets immediately; run `npm run audit:secrets` |
| Quarterly (production) | Service role + integration keys review |

---

## 2. Secrets inventory

| Secret | Where stored | Never in |
|--------|--------------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Edge Function secrets only | Client bundles, git, mobile APK |
| `VEYVIO_ANON_KEY` / `VITE_SUPABASE_ANON_KEY` | CI secrets, local `.env` (gitignored) | Committed `.env` files |
| Pilot / isolation passwords | Password manager, CI secrets | Repo, chat, email |
| `GOOGLE_ROUTES_API_KEY` | Supabase secrets (`check-nav-secrets.mjs`) | Driver production bundle |
| `FCM_SERVICE_ACCOUNT_JSON` | Supabase secrets | Repo |
| GitHub Actions secrets | `Veyvio admin /scripts/set-github-ci-secrets.mjs` | Logs |

Firebase `google-services.json` in the Driver Android tree is **client config** (package-restricted). Rotate in Firebase console if compromised; it is allowlisted in `audit-secrets.mjs`.

---

## 3. Rotation checklist

### Supabase (Command backend)

1. Supabase Dashboard → Project Settings → API → **rotate service role key** (or create new key and swap in secrets).
2. Update Edge Function secrets:
   ```bash
   cd "Veyvio admin "
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<new-key>" --project-ref <ref>
   ```
3. Redeploy `command-api`:
   ```bash
   npm run backend:deploy
   ```
4. Smoke: `VEYVIO_ANON_KEY=... npm run test:dispatch-gates-live`

### CI / GitHub

1. Rotate `VEYVIO_ANON_KEY`, `VEYVIO_API_URL`, isolation passwords in GitHub repo secrets.
2. Re-run CI on `main` and confirm `tenant-isolation` + `secrets-audit` jobs pass.

### Pilot and test accounts

Automated (preferred before pilot):

```bash
cd "Veyvio admin "
npm run gate1:rotate-credentials
# Optional: also push GitHub Actions secrets
npm run gate1:rotate-credentials -- --push-ci
```

This sets Supabase edge secrets (`VEYVIO_ISOLATION_PASSWORD`, `VEYVIO_PILOT_*`), re-seeds isolation + BCT pilot users, writes gitignored `.gate1-secrets.local.env`, and verifies `audit:secrets` + dispatch gates + pilot smoke.

Manual fallback:

1. Set new passwords for `VEYVIO_PILOT_EMAIL` and isolation users (`isolation-a@veyvio.test`, etc.).
2. Update local env and CI secrets only — never commit.

### Google / FCM (Driver nav + push)

```bash
cd veyvio-driver-App
SUPABASE_PROJECT_REF=<ref> node scripts/check-nav-secrets.mjs
```

Rotate missing keys in Supabase secrets; redeploy affected edge functions if any.

---

## 4. Automated guard (every PR)

```bash
npm run audit:secrets
```

CI job `secrets-audit` runs this on every push to `main`.

---

## 5. Sign-off

| Item | Owner | Date | Done |
|------|-------|------|------|
| Service role rotated or confirmed current | Engineering | 25 Jul 2026 | ☑ Confirmed current via `supabase secrets list` (`SUPABASE_SERVICE_ROLE_KEY` present; live seeds/API green) |
| Isolation + pilot passwords rotated via `gate1:rotate-credentials` | Engineering | 25 Jul 2026 | ☑ |
| CI secrets updated | Engineering | 25 Jul 2026 | ☑ `set-github-ci-secrets.mjs` (anon/API/platform/isolation/pilot) |
| Pilot driver password set | Engineering | 25 Jul 2026 | ☑ (`.gate1-secrets.local.env`) |
| `audit:secrets` green | Engineering | 25 Jul 2026 | ☑ |
| Live dispatch smoke green after deploy | Engineering | 25 Jul 2026 | ☑ |

Record completion in `veyvio-production-gates.md` §3.1 when BCT pilot preflight passes.
