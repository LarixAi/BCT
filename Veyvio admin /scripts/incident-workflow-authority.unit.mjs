/**
 * Static assert: incident-workflow Type A path uses UserScopedDb; depot lookups stay service-role.
 * Run: node scripts/incident-workflow-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const src = await readFile(
  new URL('../supabase/functions/_shared/incident-workflow.ts', import.meta.url),
  'utf8',
)

assert.match(src, /userScopedDb\(context, 'incident_workflow'\)/)
assert.match(src, /workspaceAuthority === 'support'/)
assert.match(src, /companyScopedServiceDb\(context, 'incident_workflow_support_grant'\)/)
assert.match(src, /resolveTenantDb\(companyId, 'incident_workflow_lookups'\)/)
assert.match(src, /\.eq\('company_id', companyId\)/)

console.log('incident-workflow-authority.unit.mjs: ok')
