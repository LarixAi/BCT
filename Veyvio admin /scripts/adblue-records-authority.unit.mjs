/**
 * Static assert: AdBlue Type A path uses UserScopedDb; support stays service-role.
 * Run: node scripts/adblue-records-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const src = await readFile(
  new URL('../supabase/functions/_shared/adblue-records.ts', import.meta.url),
  'utf8',
)

assert.match(src, /userScopedDb\(context, 'adblue_records'\)/)
assert.match(src, /workspaceAuthority === 'support'/)
assert.match(src, /companyScopedServiceDb\(context, 'adblue_records_support_grant'\)/)
assert.match(src, /\.eq\('company_id', companyId\)/)

console.log('adblue-records-authority.unit.mjs: ok')
