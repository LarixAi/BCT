/**
 * Static assert: holiday-balance Type A tables use UserScopedDb helpers.
 * Cutover 42–45 (+ leave paths from 38–39).
 * Run: node scripts/holiday-balance-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const src = await readFile(
  new URL('../supabase/functions/_shared/holiday-balance.ts', import.meta.url),
  'utf8',
)

assert.match(src, /userScopedDb\(input\.context, table\)/)
for (const table of [
  'company_holiday_defaults',
  'driver_holiday_profiles',
  'holiday_ledger_entries',
  'holiday_pay_records',
  'attendance_leave_requests',
  'attendance_leave_audit',
]) {
  assert.match(src, new RegExp(`holidayTableDb\\('${table}'`))
}
assert.match(src, /holidaySideEffectsDb/)
assert.doesNotMatch(src, /\bimport\s*\{[^}]*\badmin\b/)
assert.doesNotMatch(src, /\badmin\.(from|rpc)\b/)

console.log('holiday-balance-authority.unit.mjs: ok')
