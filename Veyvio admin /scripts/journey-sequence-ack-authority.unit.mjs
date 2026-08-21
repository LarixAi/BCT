/**
 * Static assert: journey-sequence-ack Type A path uses UserScopedDb; lookups stay service-role.
 * Run: node scripts/journey-sequence-ack-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const src = await readFile(
  new URL('../supabase/functions/_shared/journey-sequence-ack.ts', import.meta.url),
  'utf8',
)

assert.match(src, /userScopedDb\(context, 'journey_sequence_ack'\)/)
assert.match(src, /workspaceAuthority === 'support'/)
assert.match(src, /companyScopedServiceDb\(context, 'journey_sequence_ack_support_grant'\)/)
assert.match(src, /resolveTenantDb\(companyId, 'journey_sequence_ack_lookups'\)/)
assert.match(src, /\.eq\('company_id', companyId\)/)

console.log('journey-sequence-ack-authority.unit.mjs: ok')
