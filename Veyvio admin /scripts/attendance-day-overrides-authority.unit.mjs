/**
 * Static assert: attendance Type A path uses resolveTenantDb for attendance_day_overrides.
 * Run: node scripts/attendance-day-overrides-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const src = await readFile(
  new URL('../supabase/functions/_shared/attendance.ts', import.meta.url),
  'utf8',
)

assert.match(src, /resolveTenantDb\(context\.companyId, 'attendance_day_overrides', context\)/)
assert.match(src, /resolveTenantDb\(companyId, 'attendance_day_overrides_lookups'\)/)
assert.match(src, /attendanceOverridesDb\(context\)[\s\S]*?\.from\('attendance_day_overrides'\)/)
assert.match(src, /attendanceOverridesLookupDb\(companyId\)[\s\S]*?\.from\('attendance_day_overrides'\)/)
assert.doesNotMatch(src, /admin[\s\S]{0,40}\.from\('attendance_day_overrides'\)/)
assert.match(src, /onConflict:\s*'company_id,person_id,operational_date'/)
assert.doesNotMatch(src, /\bimport\s*\{[^}]*\badmin\b/)

console.log('attendance-day-overrides-authority.unit.mjs: ok')
