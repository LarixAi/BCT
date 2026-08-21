/**
 * Static assert: FIX-P1-013 same-company triggers (wave 1 + PR-03 P0 wave 2).
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const wave1 = await readFile(
  new URL('../supabase/migrations/202608170004_wave3f_same_company_triggers.sql', import.meta.url),
  'utf8',
)
const wave2 = await readFile(
  new URL('../supabase/migrations/202608210001_pr03_same_company_triggers_p0_wave2.sql', import.meta.url),
  'utf8',
)
const sql = `${wave1}\n${wave2}`

const triggers = [
  // Wave 1
  'drivers_same_company',
  'duties_same_company',
  'defects_same_company',
  'runs_same_company',
  'trip_assignments_same_company',
  'duty_live_positions_same_company',
  'vehicle_swap_requests_same_company',
  'fuel_records_same_company',
  // PR-03 P0 wave 2
  'adblue_records_same_company',
  'vehicle_reports_same_company',
  'vehicle_checks_same_company',
  'vehicle_equipment_checks_same_company',
  'duty_acknowledgements_same_company',
  'duty_assignment_events_same_company',
  'driver_documents_same_company',
  'equipment_assets_same_company',
  'purchase_requests_same_company',
  'incidents_same_company',
  'vor_cases_same_company',
  'yard_movements_same_company',
  'journey_stops_same_company',
  'trips_same_company',
  'bookings_same_company',
  'booking_legs_same_company',
  'passengers_same_company',
  'operational_exceptions_same_company',
  'interest_submissions_same_company',
]

for (const trigger of triggers) {
  assert.match(sql, new RegExp(`create trigger ${trigger}`, 'u'), `${trigger} must exist`)
}

assert.match(sql, /private\.trg_assert_company_fks/u)
assert.match(sql, /private\.assert_fk_same_as_anchor/u)
assert.doesNotMatch(sql, /request\.jwt/u, 'must not bind JWT into triggers')

console.log(`wave3f-same-company-triggers-static.unit.mjs: ok (${triggers.length} triggers)`)
