/**
 * Wave 3F — frozen baseline of Edge modules allowed to import service-role `admin`.
 *
 * After cutovers 56–92 + protected-last exits, ordinary Edge modules must not
 * import bare `admin`. Remaining importers are authority_core / privileged only.
 *
 * command-api uses an ALS-bound facade over userScopedDb / companyScopedServiceDb /
 * privilegedDb (no bare admin import).
 */
export const SERVICE_ROLE_ADMIN_ALLOWLIST = Object.freeze({
  'supabase/functions/_shared/supabase.ts': 'authority_core',
  'supabase/functions/_shared/db-authority.ts': 'authority_core',
  'supabase/functions/_shared/tenant-db.ts': 'authority_core',
  'supabase/functions/_shared/tenant-guards.ts': 'authority_core',
  'supabase/functions/_shared/tenant-auth.ts': 'privileged',
  'supabase/functions/_shared/platform-admin.ts': 'privileged',
  'supabase/functions/_shared/support-access.ts': 'privileged',
  'supabase/functions/_shared/signed-storage.ts': 'privileged',
  'supabase/functions/_shared/seed-isolation.ts': 'privileged',
  'supabase/functions/_shared/seed-bct-pilot.ts': 'privileged',
  'supabase/functions/_shared/seed-demo.ts': 'privileged',
  'supabase/functions/_shared/saas-billing.ts': 'privileged',
  'supabase/functions/_shared/security-monitoring-core.ts': 'privileged',
  'supabase/functions/_shared/executive-security-monitoring.ts': 'privileged',
  'supabase/functions/_shared/executive-documents.ts': 'privileged',
  'supabase/functions/_shared/executive-sensitive-actions.ts': 'privileged',
  'supabase/functions/_shared/executive-continuity.ts': 'privileged',
  'supabase/functions/_shared/executive-pages.ts': 'privileged',
  'supabase/functions/_shared/integration-keys.ts': 'privileged',
  'supabase/functions/_shared/subscription-lifecycle.ts': 'privileged',
  // Cost Control Edge Function — separate product surface; own service-role factory.
  'supabase/functions/finance-api/index.ts': 'privileged',
})
