/**
 * Static assert: equipment-check Type A path uses UserScopedDb; support stays service-role.
 * Run: node scripts/vehicle-equipment-checks-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const src = await readFile(
  new URL('../supabase/functions/_shared/vehicle-equipment-checks.ts', import.meta.url),
  'utf8',
)

assert.match(src, /userScopedDb\(context, 'vehicle_equipment_checks'\)/)
assert.match(src, /workspaceAuthority === 'support'/)
assert.match(src, /companyScopedServiceDb\(context, 'vehicle_equipment_checks_support_grant'\)/)
assert.match(src, /\.eq\('company_id', context\.companyId\)/)

console.log('vehicle-equipment-checks-authority.unit.mjs: ok')
