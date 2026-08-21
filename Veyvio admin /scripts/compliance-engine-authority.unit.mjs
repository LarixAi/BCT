/**
 * Static assert: compliance-engine Type A path uses resolveTenantDb (ALS/JWT).
 * Run: node scripts/compliance-engine-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const src = await readFile(
  new URL('../supabase/functions/_shared/compliance-engine.ts', import.meta.url),
  'utf8',
)

assert.match(src, /resolveTenantDb\(companyId, 'compliance_engine', scope\.context\)/)
assert.match(src, /complianceTenantDb\(scope\)[\s\S]*?\.from\('company_compliance_settings'\)/)
assert.match(src, /\.eq\('company_id', scope\.companyId\)/)
assert.doesNotMatch(src, /\bimport\s*\{[^}]*\badmin\b/)

console.log('compliance-engine-authority.unit.mjs: ok')
