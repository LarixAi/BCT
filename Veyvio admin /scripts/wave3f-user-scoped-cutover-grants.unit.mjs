/**
 * Static assert: authenticated write-grant cutover tables are the Wave 3F allowlist only.
 * Fleet JWT matrix (202608170002) must remain SELECT-only.
 * Run: node scripts/wave3f-user-scoped-cutover-grants.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const INSERT_ONLY_TABLES = ['duty_closeouts', 'driver_job_execution_events', 'fuel_records', 'adblue_records', 'vehicle_equipment_checks', 'equipment_asset_events', 'tyre_asset_events', 'depot_stock_movements', 'fuel_card_events', 'operational_exception_events', 'vehicle_report_status_history', 'vehicle_report_evidence', 'notifications', 'yard_movements', 'duty_assignment_events', 'override_audit_events', 'domain_events', 'audit_events', 'run_trips', 'duty_runs', 'body_condition_audit_events', 'invitation_events']
const INSERT_UPDATE_TABLES = ['vehicle_swap_requests', 'journey_sequence_acknowledgements', 'vehicle_reports', 'operational_exceptions', 'purchase_requests', 'equipment_assets', 'tyre_assets', 'depot_stock_items', 'fuel_cards', 'stock_transfers', 'vehicle_consumable_levels', 'company_compliance_settings', 'journey_stops', 'defects', 'driver_app_devices', 'duty_acknowledgements', 'attendance_day_overrides', 'driver_training', 'interest_submissions', 'attendance_leave_requests', 'attendance_leave_audit', 'attendance_notes', 'attendance_return_to_work', 'company_holiday_defaults', 'driver_holiday_profiles', 'holiday_ledger_entries', 'holiday_pay_records', 'driver_requirements', 'driver_requirement_requests', 'trip_assignments', 'duties', 'runs', 'membership_application_access', 'body_inspections', 'body_inspection_media', 'vehicle_damage_cases', 'damage_observations', 'vehicle_condition_markers', 'inspection_reviews', 'condition_acknowledgements', 'drivers', 'vehicles', 'staff_members', 'depots', 'vehicle_checks', 'driver_documents', 'driver_app_accounts', 'messages', 'yard_tasks', 'company_memberships', 'depot_access', 'duty_live_positions', 'invitations', 'file_objects', 'customers', 'bookings', 'places', 'schools', 'parking_bays', 'driver_restrictions', 'driver_eligibility_results', 'roles', 'executive_policies', 'executive_company_records', 'command_page_snapshots', 'role_permissions', 'trips', 'passengers', 'booking_legs']
const SELECT_UPDATE_TABLES = ['incidents', 'vor_cases', 'companies']
const SELECT_ONLY_TABLES = ['users']

const INSERT_ONLY_MIGRATIONS = ['202608190001_wave3f_duty_closeouts_user_scoped.sql', '202608190002_wave3f_driver_job_execution_events_user_scoped.sql', '202608190003_wave3f_fuel_records_user_scoped.sql', '202608190004_wave3f_adblue_records_user_scoped.sql', '202608190006_wave3f_vehicle_equipment_checks_user_scoped.sql', '202608190015_wave3f_equipment_asset_events_user_scoped.sql', '202608190016_wave3f_tyre_asset_events_user_scoped.sql', '202608190017_wave3f_depot_stock_movements_user_scoped.sql', '202608190019_wave3f_fuel_card_events_user_scoped.sql', '202608190023_wave3f_operational_exception_events_user_scoped.sql', '202608190024_wave3f_vehicle_report_status_history_user_scoped.sql', '202608190025_wave3f_vehicle_report_evidence_user_scoped.sql', '202608190027_wave3f_notifications_user_scoped.sql', '202608190030_wave3f_yard_movements_user_scoped.sql', '202608190035_wave3f_duty_assignment_events_user_scoped.sql', '202608190048_wave3f_override_audit_events_user_scoped.sql', '202608190049_wave3f_domain_events_user_scoped.sql', '202608190050_wave3f_audit_events_user_scoped.sql', '202608190053_wave3f_run_trips_user_scoped.sql', '202608190054_wave3f_duty_runs_user_scoped.sql', '202608190057_wave3f_body_condition_audit_events_user_scoped.sql', '202608190078_wave3f_invitation_events_user_scoped.sql']
const INSERT_UPDATE_MIGRATIONS = ['202608190005_wave3f_vehicle_swap_requests_user_scoped.sql', '202608190007_wave3f_journey_sequence_acknowledgements_user_scoped.sql', '202608190008_wave3f_vehicle_reports_user_scoped.sql', '202608190010_wave3f_operational_exceptions_user_scoped.sql', '202608190011_wave3f_purchase_requests_user_scoped.sql', '202608190012_wave3f_equipment_assets_user_scoped.sql', '202608190013_wave3f_tyre_assets_user_scoped.sql', '202608190014_wave3f_depot_stock_items_user_scoped.sql', '202608190018_wave3f_fuel_cards_user_scoped.sql', '202608190020_wave3f_stock_transfers_user_scoped.sql', '202608190021_wave3f_vehicle_consumable_levels_user_scoped.sql', '202608190022_wave3f_company_compliance_settings_user_scoped.sql', '202608190026_wave3f_journey_stops_user_scoped.sql', '202608190029_wave3f_defects_user_scoped.sql', '202608190032_wave3f_driver_app_devices_user_scoped.sql', '202608190033_wave3f_duty_acknowledgements_user_scoped.sql', '202608190034_wave3f_attendance_day_overrides_user_scoped.sql', '202608190036_wave3f_driver_training_user_scoped.sql', '202608190037_wave3f_interest_submissions_user_scoped.sql', '202608190038_wave3f_attendance_leave_requests_user_scoped.sql', '202608190039_wave3f_attendance_leave_audit_user_scoped.sql', '202608190040_wave3f_attendance_notes_user_scoped.sql', '202608190041_wave3f_attendance_return_to_work_user_scoped.sql', '202608190042_wave3f_company_holiday_defaults_user_scoped.sql', '202608190043_wave3f_driver_holiday_profiles_user_scoped.sql', '202608190044_wave3f_holiday_ledger_entries_user_scoped.sql', '202608190045_wave3f_holiday_pay_records_user_scoped.sql', '202608190046_wave3f_driver_requirements_user_scoped.sql', '202608190047_wave3f_driver_requirement_requests_user_scoped.sql', '202608190051_wave3f_trip_assignments_user_scoped.sql', '202608190052_wave3f_duties_user_scoped.sql', '202608190055_wave3f_runs_insert_user_scoped.sql', '202608190056_wave3f_membership_application_access_user_scoped.sql', '202608190058_wave3f_body_inspections_user_scoped.sql', '202608190059_wave3f_body_inspection_media_user_scoped.sql', '202608190060_wave3f_vehicle_damage_cases_user_scoped.sql', '202608190061_wave3f_damage_observations_user_scoped.sql', '202608190062_wave3f_vehicle_condition_markers_user_scoped.sql', '202608190063_wave3f_inspection_reviews_user_scoped.sql', '202608190064_wave3f_condition_acknowledgements_user_scoped.sql', '202608190065_wave3f_drivers_user_scoped.sql', '202608190066_wave3f_vehicles_user_scoped.sql', '202608190067_wave3f_staff_members_user_scoped.sql', '202608190068_wave3f_depots_user_scoped.sql', '202608190069_wave3f_vehicle_checks_user_scoped.sql', '202608190070_wave3f_driver_documents_user_scoped.sql', '202608190071_wave3f_driver_app_accounts_user_scoped.sql', '202608190072_wave3f_messages_user_scoped.sql', '202608190073_wave3f_yard_tasks_user_scoped.sql', '202608190074_wave3f_company_memberships_user_scoped.sql', '202608190075_wave3f_depot_access_user_scoped.sql', '202608190076_wave3f_duty_live_positions_user_scoped.sql', '202608190077_wave3f_invitations_user_scoped.sql', '202608190079_wave3f_file_objects_user_scoped.sql', '202608190080_wave3f_customers_user_scoped.sql', '202608190081_wave3f_bookings_user_scoped.sql', '202608190082_wave3f_places_user_scoped.sql', '202608190083_wave3f_schools_user_scoped.sql', '202608190084_wave3f_parking_bays_user_scoped.sql', '202608190085_wave3f_driver_restrictions_user_scoped.sql', '202608190086_wave3f_driver_eligibility_results_user_scoped.sql', '202608190088_wave3f_roles_user_scoped.sql', '202608190089_wave3f_executive_policies_user_scoped.sql', '202608190090_wave3f_executive_company_records_user_scoped.sql', '202608190091_wave3f_command_page_snapshots_user_scoped.sql', '202608190092_wave3f_role_permissions_user_scoped.sql', '202608190093_wave3f_trips_user_scoped.sql', '202608190094_wave3f_passengers_user_scoped.sql', '202608190095_wave3f_booking_legs_user_scoped.sql']
const SELECT_UPDATE_MIGRATIONS = ['202608190009_wave3f_incidents_user_scoped.sql', '202608190031_wave3f_vor_cases_user_scoped.sql', '202608190087_wave3f_companies_user_scoped.sql']
const SELECT_ONLY_MIGRATIONS = ['202608190096_wave3f_users_company_peer_select.sql']

const matrixSql = await readFile(
  new URL('../supabase/migrations/202608170002_wave3f_jwt_matrix_grants.sql', import.meta.url),
  'utf8',
)
assert.doesNotMatch(
  matrixSql,
  /grant (insert|update|delete|all) on table[\s\S]+to authenticated/u,
  'authenticated must not receive write grants on fleet resource tables',
)

const writeGrantTables = []
for (const file of INSERT_ONLY_MIGRATIONS) {
  const cutoverSql = await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8')
  for (const m of cutoverSql.matchAll(/grant (?:select, insert|insert) on table public\.([a-z_]+) to authenticated/gu)) {
    writeGrantTables.push(m[1])
  }
  assert.match(cutoverSql, /grant all on table public\.[a-z_]+ to service_role/u)
  assert.match(cutoverSql, /revoke update, delete on table public\.[a-z_]+ from authenticated/u)
  assert.match(
    cutoverSql,
    /for insert to authenticated\s+with check \((?:private\.user_has_company\(company_id\)|[\s\S]*private\.user_has_company\()/u,
  )
}

for (const file of INSERT_UPDATE_MIGRATIONS) {
  const cutoverSql = await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8')
  for (const m of cutoverSql.matchAll(
    /grant select, insert, update on table public\.([a-z_]+) to authenticated/gu,
  )) {
    writeGrantTables.push(m[1])
  }
  assert.match(cutoverSql, /grant all on table public\.[a-z_]+ to service_role/u)
  assert.match(cutoverSql, /revoke delete on table public\.[a-z_]+ from authenticated/u)
  // Join tables (depot_access, role_permissions) use parent-company exists() checks.
  assert.match(
    cutoverSql,
    /for insert to authenticated\s+with check \((?:private\.user_has_company\(company_id\)|[\s\S]*private\.user_has_company\()/u,
  )
  assert.match(
    cutoverSql,
    /for update to authenticated\s+using \((?:private\.user_has_company\(company_id\)|[\s\S]*private\.user_has_company\()/u,
  )
}

for (const file of SELECT_UPDATE_MIGRATIONS) {
  const cutoverSql = await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8')
  for (const m of cutoverSql.matchAll(/grant select, update on table public\.([a-z_]+) to authenticated/gu)) {
    writeGrantTables.push(m[1])
  }
  assert.match(cutoverSql, /grant all on table public\.[a-z_]+ to service_role/u)
  assert.match(cutoverSql, /revoke insert, delete on table public\.[a-z_]+ from authenticated/u)
  assert.match(
    cutoverSql,
    /for update to authenticated\s+using \((?:private\.user_has_company\((?:company_id|id)\)|[\s\S]*private\.user_has_company\()/u,
  )
}

const selectOnlyTables = []
for (const file of SELECT_ONLY_MIGRATIONS) {
  const cutoverSql = await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8')
  for (const m of cutoverSql.matchAll(/grant select on table public\.([a-z_]+) to authenticated/gu)) {
    selectOnlyTables.push(m[1])
  }
  assert.match(cutoverSql, /grant all on table public\.[a-z_]+ to service_role/u)
  assert.match(cutoverSql, /revoke insert, delete on table public\.[a-z_]+ from authenticated/u)
  assert.match(cutoverSql, /private\.user_has_company\(/u)
  assert.doesNotMatch(
    cutoverSql,
    /grant (?:select, )?insert|grant select, insert, update|grant select, update/u,
    `${file} must remain SELECT-only for authenticated`,
  )
}

assert.deepEqual(
  writeGrantTables,
  [...INSERT_ONLY_TABLES, ...INSERT_UPDATE_TABLES, ...SELECT_UPDATE_TABLES],
  'only allowlisted tables may receive authenticated writes in Wave 3F cutovers',
)
assert.deepEqual(selectOnlyTables, SELECT_ONLY_TABLES, 'SELECT-only cutover allowlist mismatch')

console.log(
  `wave3f-user-scoped-cutover-grants.unit.mjs: ok (${INSERT_ONLY_TABLES.length}+${INSERT_UPDATE_TABLES.length}+${SELECT_UPDATE_TABLES.length}+${SELECT_ONLY_TABLES.length} tables)`,
)
