/**
 * Static assert: driver-devices Type A path uses UserScopedDb for driver_app_devices.
 * Accounts + audit stay company-scoped service-role.
 * Run: node scripts/driver-devices-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const src = await readFile(
  new URL('../supabase/functions/_shared/driver-devices.ts', import.meta.url),
  'utf8',
)

assert.match(src, /userScopedDb\(context, 'driver_app_devices'\)/)
assert.match(src, /workspaceAuthority === 'support'/)
assert.match(src, /companyScopedServiceDb\(context, 'driver_devices_support_grant'\)/)
assert.match(src, /companyScopedServiceDb\(context, 'driver_devices_side_effects'\)/)
assert.match(src, /devicesDb\(context\)[\s\S]*?\.from\('driver_app_devices'\)/)
assert.match(src, /devicesSideEffectsDb\(context\)[\s\S]*?\.from\('driver_app_accounts'\)/)
assert.match(src, /devicesSideEffectsDb\(context\)[\s\S]*?\.from\('audit_events'\)/)
assert.doesNotMatch(src, /\bimport\s*\{[^}]*\badmin\b/)
assert.match(src, /\.eq\('company_id', (?:companyId|context\.companyId)\)/)

console.log('driver-devices-authority.unit.mjs: ok')
