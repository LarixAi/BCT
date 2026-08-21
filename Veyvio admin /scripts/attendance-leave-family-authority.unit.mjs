/**
 * Static assert: attendance leave family Type A paths use resolveTenantDb.
 * Cutover 38–41: leave_requests, leave_audit, notes, return_to_work.
 * Run: node scripts/attendance-leave-family-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const attendance = await readFile(
  new URL('../supabase/functions/_shared/attendance.ts', import.meta.url),
  'utf8',
)
const holiday = await readFile(
  new URL('../supabase/functions/_shared/holiday-balance.ts', import.meta.url),
  'utf8',
)

assert.match(attendance, /resolveTenantDb\(input\.companyId, table, input\.context\)/)
assert.match(attendance, /resolveTenantDb\(context\.companyId, 'attendance_day_overrides', context\)/)
for (const table of [
  'attendance_leave_requests',
  'attendance_leave_audit',
  'attendance_notes',
  'attendance_return_to_work',
]) {
  assert.match(attendance, new RegExp(`attendanceTableDb\\('${table}'`))
}
assert.doesNotMatch(attendance, /\bimport\s*\{[^}]*\badmin\b/)
assert.match(attendance, /attendanceSideEffectsDb/)

assert.match(holiday, /resolveTenantDb\(/)
assert.match(holiday, /holidayTableDb\('attendance_leave_requests'/)
assert.match(holiday, /holidayTableDb\('attendance_leave_audit'/)

console.log('attendance-leave-family-authority.unit.mjs: ok')
