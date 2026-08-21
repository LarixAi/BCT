/**
 * Static assert: interest-submissions Type A path uses UserScopedDb for interest_submissions.
 * Intake + conversion side effects stay company-scoped service-role.
 * Run: node scripts/interest-submissions-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const src = await readFile(
  new URL('../supabase/functions/_shared/interest-submissions.ts', import.meta.url),
  'utf8',
)

assert.match(src, /userScopedDb\(context, 'interest_submissions'\)/)
assert.match(src, /workspaceAuthority === 'support'/)
assert.match(src, /companyScopedServiceDb\(context, 'interest_submissions_support_grant'\)/)
assert.match(src, /companyScopedServiceDbForCompany\([^,]+, 'interest_submissions_intake'\)/)
assert.match(src, /companyScopedServiceDb\(context, 'interest_submissions_side_effects'\)/)
assert.match(src, /interestsDb\(context\)[\s\S]*?\.from\('interest_submissions'\)/)
assert.match(src, /interestsIntakeDb\([\s\S]*?\)[\s\S]*?\.from\('interest_submissions'\)/)
assert.match(src, /interestsSideEffectsDb\(context\)[\s\S]*?\.from\('customers'\)/)
assert.doesNotMatch(src, /\bimport\s*\{[^}]*\badmin\b/)

console.log('interest-submissions-authority.unit.mjs: ok')
