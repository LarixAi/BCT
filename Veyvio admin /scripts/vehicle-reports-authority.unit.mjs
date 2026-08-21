/**
 * Static assert: vehicle-reports Type A path uses UserScopedDb for reports, history, evidence.
 * Vehicles remain company-scoped service-role.
 * Run: node scripts/vehicle-reports-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const src = await readFile(
  new URL('../supabase/functions/_shared/vehicle-reports.ts', import.meta.url),
  'utf8',
)

assert.match(src, /userScopedDb\(context, 'vehicle_reports'\)/)
assert.match(src, /workspaceAuthority === 'support'/)
assert.match(src, /companyScopedServiceDb\(context, 'vehicle_reports_support_grant'\)/)
assert.match(src, /companyScopedServiceDb\(context, 'vehicle_reports_children_and_vehicles'\)/)
assert.match(src, /reportsTenantDb\(context\)\.from\('vehicle_report_status_history'\)/)
assert.match(src, /reportsTenantDb\(context\)\.from\('vehicle_report_evidence'\)/)
assert.doesNotMatch(src, /reportsSideEffectsDb\(context\)\.from\('vehicle_report_status_history'\)/)
assert.doesNotMatch(src, /reportsSideEffectsDb\(context\)\.from\('vehicle_report_evidence'\)/)
assert.match(src, /writeImmutableAudit/)
assert.match(src, /emitDomainEvent/)
assert.match(src, /\.eq\('company_id', context\.companyId\)/)

console.log('vehicle-reports-authority.unit.mjs: ok')
