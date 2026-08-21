/**
 * Static assert: purchase-requests Type A path uses UserScopedDb; lookups stay service-role.
 * Run: node scripts/purchase-requests-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const src = await readFile(
  new URL('../supabase/functions/_shared/purchase-requests.ts', import.meta.url),
  'utf8',
)

assert.match(src, /userScopedDb\(scope\.context, 'purchase_requests'\)/)
assert.match(src, /workspaceAuthority === 'support'/)
assert.match(src, /companyScopedServiceDb\(scope\.context, 'purchase_requests_support_grant'\)/)
assert.match(src, /resolveTenantDb\(companyId, 'purchase_requests'\)/)
assert.match(src, /purchase_requests_lookups/)
assert.match(src, /\.eq\('company_id', companyId\)/)
assert.match(src, /writeImmutableAudit/)

console.log('purchase-requests-authority.unit.mjs: ok')
