/**
 * Static assert: Wave 3F FORCE RLS expansion lives in the migration.
 * Run: node scripts/wave3f-force-rls.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const sql = await readFile(
  new URL('../supabase/migrations/202608170003_wave3f_force_rls.sql', import.meta.url),
  'utf8',
)

assert.match(sql, /force row level security/u)
assert.match(sql, /nspname = 'public'/u)
assert.match(sql, /nspname = 'cost_control'/u)
assert.match(sql, /revoke all on table cost_control\.%I from authenticated, anon/u)
assert.match(sql, /revoke usage on schema cost_control from authenticated, anon/u)
assert.match(sql, /Do NOT bind JWT claims into/u)
assert.match(sql, /BFF\/service-role boundary until 3G/u)
assert.doesNotMatch(
  sql,
  /current_setting\('request\.jwt/u,
  'must not bind JWT claims into app.active_organisation_id',
)
assert.doesNotMatch(
  sql,
  /set(?:\s+local)?\s+app\.active_organisation_id\s*=\s*.*jwt/iu,
  'must not assign JWT-controlled values to the cost_control GUC',
)

console.log('wave3f-force-rls.unit.mjs: ok')
