/**
 * Static assert: duty-closeout Type A path uses UserScopedDb; support stays service-role.
 * Run: node scripts/duty-closeout-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const src = await readFile(
  new URL('../supabase/functions/_shared/duty-closeout.ts', import.meta.url),
  'utf8',
)

assert.match(src, /userScopedDb\(context, 'duty_closeout'\)/)
assert.match(src, /workspaceAuthority === 'support'/)
assert.match(src, /companyScopedServiceDb\(context, 'duty_closeout_support_grant'\)/)
assert.doesNotMatch(src, /companyScopedServiceDbForCompany/)
assert.match(src, /writeImmutableAudit/)
assert.match(src, /emitDomainEvent/)
assert.match(src, /\.eq\('company_id', companyId\)/)

console.log('duty-closeout-authority.unit.mjs: ok')
