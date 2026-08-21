/**
 * Static assert: fuel-records Type A path uses UserScopedDb; support stays service-role.
 * Vehicle lookup / vehicle_reports mirror remain company-scoped service-role.
 * Run: node scripts/fuel-records-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const src = await readFile(
  new URL('../supabase/functions/_shared/fuel-records.ts', import.meta.url),
  'utf8',
)

assert.match(src, /userScopedDb\(context, 'fuel_records'\)/)
assert.match(src, /workspaceAuthority === 'support'/)
assert.match(src, /companyScopedServiceDb\(context, 'fuel_records_support_grant'\)/)
assert.match(src, /companyScopedServiceDb\(context, 'fuel_records_vehicle_reports_mirror'\)/)
assert.match(src, /writeImmutableAudit/)
assert.match(src, /emitDomainEvent/)
assert.match(src, /\.eq\('company_id', context\.companyId\)/)

console.log('fuel-records-authority.unit.mjs: ok')
