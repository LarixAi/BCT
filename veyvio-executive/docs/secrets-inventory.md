# Executive secrets inventory (nested package)

Canonical deploy doc in the monorepo: `docs/deploy/executive-secrets.md`.

## Allowed Worker secrets

- `VEYVIO_COMMAND_API_URL`
- `VEYVIO_SUPABASE_URL`
- `VEYVIO_COMMAND_PUBLISHABLE_KEY` or legacy `VEYVIO_COMMAND_ANON_KEY`
- `VEYVIO_EXECUTIVE_SESSION_SECRET` (≥32 characters)

## Forbidden on Executive

- `SUPABASE_SERVICE_ROLE_KEY`
- `sb_secret_*`
- Any database password or private key
- Embedding the above into `dist/` / Wrangler generated config / browser bundles

## Owners and rotation

| Secret | Owner | Interval |
|---|---|---|
| `VEYVIO_EXECUTIVE_SESSION_SECRET` | Technical Owner | 90 days / staff change / leak |
| Command publishable or anon key | Platform engineering | Align with platform key rotation |

Emergency dry-run: `npm run security:rotate:dry-run`
