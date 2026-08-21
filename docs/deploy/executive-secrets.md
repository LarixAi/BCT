# Executive secrets, keys and deployment controls

**Audience:** Security Owner, Technical Owner, platform engineering  
**App:** Veyvio Executive (`veyvio-executive/`)  
**Companion:** [executive-edge-protection.md](./executive-edge-protection.md), [credential-rotation-runbook.md](../plan/credential-rotation-runbook.md)

---

## 1. Least-privilege matrix

| Component | May hold | Must never hold |
|---|---|---|
| Executive browser / client bundle | Nothing privileged | Service-role, `sb_secret_*`, session signing secret, anon/publishable keys, Command URL credentials |
| Executive Worker / BFF | `VEYVIO_COMMAND_PUBLISHABLE_KEY` or legacy anon key, `VEYVIO_EXECUTIVE_SESSION_SECRET`, Command API URL, Supabase URL | `SUPABASE_SERVICE_ROLE_KEY`, `sb_secret_*`, database passwords |
| Command API (`command-api`) | Service-role / secret key, platform secrets | Executive session signing secret (owned by Executive hosting) |
| ChatGPT Sites secret store | Executive Worker runtime secrets listed above | Build archives, git, chat logs |

---

## 2. Credential inventory and owners

| Secret | Owner | Storage | Rotation interval |
|---|---|---|---|
| `VEYVIO_EXECUTIVE_SESSION_SECRET` | Technical Owner | Sites / Worker secret storage; local `.dev.vars` only | 90 days, and on staff change or suspected leak |
| `VEYVIO_COMMAND_PUBLISHABLE_KEY` / `VEYVIO_COMMAND_ANON_KEY` | Platform engineering | Sites secrets + local gitignored env | Align with platform anon/publishable rotation |
| `VEYVIO_COMMAND_API_URL` / `VEYVIO_SUPABASE_URL` | Platform engineering | Sites vars (non-secret URLs) | On environment cut-over |
| ChatGPT Sites owner access | Security Owner / CEO delegate | Sites identity | Review quarterly |
| Supabase service-role | Platform engineering | Supabase Edge secrets only | See platform rotation runbook |

---

## 3. Environment separation

| Environment | Purpose | Credential rule |
|---|---|---|
| `development` | Local Worker / vinext | Distinct session secret; gitignored `.env.local` / `.dev.vars` |
| `test` / CI | Automated gates | Non-production session secret; `VEYVIO_EXECUTIVE_LOCAL_DEMO=0` |
| `production` | Sites-published Executive | Production-only secrets in hosting store; demo flag off; host enforcement on |

Templates: `veyvio-executive/.env.example`, `.env.production.example`.

---

## 4. Hosting secret storage (SEC-0702)

Production server credentials must be entered through ChatGPT Sites / Worker secret storage, not compiled into the published archive.

Verify after publish:

1. Generated `wrangler.json` / deployment config contains no session secret, anon/publishable key or service-role material.
2. `VEYVIO_EXECUTIVE_LOCAL_DEMO=0`.
3. Browser Network tab and client bundles contain no identity JWTs or `sb_secret_*`.

---

## 5. Publishable key migration (SEC-0704)

Executive accepts either:

- `VEYVIO_COMMAND_PUBLISHABLE_KEY` (preferred), or
- `VEYVIO_COMMAND_ANON_KEY` (legacy JWT)

Migration steps:

1. Create Supabase publishable key for the target project.
2. Set `VEYVIO_COMMAND_PUBLISHABLE_KEY` in Sites secrets.
3. Confirm Executive login still succeeds.
4. Remove legacy anon key from Executive hosting once Command API accepts publishable keys end-to-end.

---

## 6. Emergency rotation (SEC-0707)

Dry-run (no live secret printing):

```bash
cd veyvio-executive
npm run security:rotate:dry-run
```

Live cut-over:

1. Generate a new ≥32-character session secret.
2. Store it in Sites secrets; keep the previous secret available for rollback for ≤1 hour.
3. Republish the Executive archive.
4. Sign in as a reserved Executive test identity and confirm binding cookies renew.
5. Remove the previous session secret and confirm old bindings fail closed.
6. If anon/publishable keys are implicated, rotate with platform owners using the Command runbook.

---

## 7. Deployment branch protection (SEC-0708)

Executive CI workflow: `veyvio-executive/.github/workflows/ci.yml`.

Required GitHub settings on the Executive production branch:

- PR review before merge
- Required checks: `executive-verify`
- No force-push to `main`

Sites publication remains an owner-only manual step after CI is green.
