/**
 * Wave 3F — frozen baseline of Edge modules allowed to import service-role `admin`.
 *
 * New files that `import { admin } from '...supabase...'` MUST be added here with a class:
 *   - privileged: platform / Auth Admin / secrets / signing / seeds / support / billing
 *   - company_scoped_service_role: transitional tenant CRUD still on service-role + app filters
 *   - authority_core: the client factory / tenant helpers themselves
 *
 * Do not expand this list casually — prefer tenant-db helpers or a future UserScopedDb.
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
  'supabase/functions/_shared/application-scopes.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/attendance.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/audit-service.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/body-condition.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/compliance-engine.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/defect-automation.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/document-expiry-notifications.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/domain-events.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/driver-activation-release.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/driver-devices.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/driver-job-execution.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/driver-ops-notifications.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/driver-requirements.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/driver-training-centre.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/duty-closeout.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/duty-publication.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/entitlements.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/fcm-send.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/holiday-balance.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/hubs.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/interest-submissions.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/journey-handlers.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/journey-sequence-ack.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/journey-sequence-move.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/notifications.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/operational-exceptions.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/operational-trip-assign.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/override-audit.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/projections.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/vehicle-reports.ts': 'company_scoped_service_role',
  'supabase/functions/_shared/yard-mutation-handlers.ts': 'company_scoped_service_role',
  'supabase/functions/command-api/index.ts': 'company_scoped_service_role',
  // Cost Control Edge Function — separate product surface; own service-role factory.
  'supabase/functions/finance-api/index.ts': 'privileged',
})
