/**
 * Static assert: vehicle-swap Type A path uses UserScopedDb; duty updates stay service-role.
 * Run: node scripts/vehicle-swap-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const src = await readFile(
  new URL('../supabase/functions/_shared/vehicle-swap-workflow.ts', import.meta.url),
  'utf8',
)

assert.match(src, /userScopedDb\(context, 'vehicle_swap_workflow'\)/)
assert.match(src, /workspaceAuthority === 'support'/)
assert.match(src, /companyScopedServiceDb\(context, 'vehicle_swap_support_grant'\)/)
assert.match(src, /companyScopedServiceDb\(context, 'vehicle_swap_duty_update'\)/)
assert.doesNotMatch(src, /companyScopedServiceDbForCompany/)
assert.match(src, /\.eq\('company_id', companyId\)/)

console.log('vehicle-swap-authority.unit.mjs: ok')
