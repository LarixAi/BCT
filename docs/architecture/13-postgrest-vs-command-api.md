# PostgREST vs Command API — trust boundary

Veyvio is multi-tenant. Two data paths exist; they are **not** equivalent for writes.

## Command API (primary product path)

- Edge Function `command-api` uses the **service role** and bypasses RLS.
- Isolation is **code discipline**: `authenticate()` (membership + entitlements + lifecycle), `assertCompanyScoped*`, `requireModule`, and company filters on queries.
- All Command / Yard / Driver product mutations must go through this gateway (or another Edge Function that applies the same guards).
- Platform Admin (`/platform/*`) uses `requirePlatformRole` on the same deploy today.

**Implication:** A missing `company_id` filter or IDOR assert in Edge code is a real tenant breach. RLS will not save you on this path.

## PostgREST / Supabase client (secondary)

- Authenticated clients may `SELECT` (and only where granted) through `/rest/v1` under **RLS**.
- Tenant helper: `private.user_has_company(company_id)` (SECURITY DEFINER, not exposed as a public RPC).
- Join tables without `company_id` must use parent `EXISTS` policies — never `auth.role() = 'authenticated'` alone.
- Storage paths for tenant files use `{company_id}/…` prefixes; policies must call `private.user_has_company` on the first folder segment.
- Authenticated **mutations** on operational tables and storage are largely denied; service role / Command API performs writes.

**Implication:** RLS is the backstop for accidental direct client reads. It is not a substitute for Command API asserts on the write path.

## What to test

| Layer | Proof |
|---|---|
| Command API | `npm run test:tenant-isolation` (Org A/B seed + cross-tenant GET/assign/list/storage) |
| RLS register | `scripts/sql/tenant-table-audit.sql` |
| Storage | Company-prefix list/read denied for foreign tenants |

## Rule of thumb

- Building a new screen? Call Command API; do not open PostgREST writes for tenant data.
- Adding a table? `company_id` + RLS with `private.user_has_company`, or a parent-scoped join policy + same-company trigger if dual FKs exist.
