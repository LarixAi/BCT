import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migrationUrl = new URL(
  '../supabase/migrations/202607300004_executive_authorisation.sql',
  import.meta.url,
)
const sql = await readFile(migrationUrl, 'utf8')

assert.match(sql, /create or replace function private\.current_session_is_aal2/u)
assert.match(sql, /create or replace function private\.user_owns_membership/u)
assert.match(sql, /create or replace function private\.user_has_company_permission/u)
assert.match(sql, /security definer/iu)
assert.doesNotMatch(sql, /function public\.(?:current_session|user_owns|user_has_company_permission)/u)
assert.match(sql, /private\.current_session_is_aal2\(\)/u)
assert.match(sql, /private\.user_owns_membership\(company_id, membership_id\)/u)
assert.match(
  sql,
  /private\.user_has_company_permission\(company_id, 'accounts\.access\.review'\)/u,
)
assert.match(
  sql,
  /revoke insert, update, delete, truncate, references, trigger[\s\S]+from authenticated, anon/iu,
)

console.log('executive-rls.unit: ok')
