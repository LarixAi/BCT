/**
 * Static assert: driver-job-execution Type A path uses UserScopedDb; support stays service-role.
 * Run: node scripts/driver-job-execution-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const src = await readFile(
  new URL('../supabase/functions/_shared/driver-job-execution.ts', import.meta.url),
  'utf8',
)

assert.match(src, /userScopedDb\(context, 'driver_job_execution'\)/)
assert.match(src, /workspaceAuthority === 'support'/)
assert.match(src, /companyScopedServiceDb\(context, 'driver_job_execution_support_grant'\)/)
assert.doesNotMatch(src, /companyScopedServiceDbForCompany/)
assert.match(src, /emitDomainEvent/)
assert.match(src, /\.eq\('company_id', companyId\)/)

console.log('driver-job-execution-authority.unit.mjs: ok')
