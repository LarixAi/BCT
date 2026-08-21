/**
 * Static assert: notifications Type A path uses UserScopedDb when JWT present; lookups stay service-role.
 * Run: node scripts/notifications-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const src = await readFile(
  new URL('../supabase/functions/_shared/notifications.ts', import.meta.url),
  'utf8',
)

assert.match(src, /userScopedDb\(scope\.context, 'notifications'\)/)
assert.match(src, /workspaceAuthority === 'support'/)
assert.match(src, /companyScopedServiceDb\(scope\.context, 'notifications_support_grant'\)/)
assert.match(src, /resolveTenantDb\(companyId, 'notifications'\)/)
assert.match(src, /notifications_lookups/)
assert.match(src, /notifyTenantDb\(scope\)\.from\('notifications'\)/)
assert.match(src, /F-29/)

console.log('notifications-authority.unit.mjs: ok')
