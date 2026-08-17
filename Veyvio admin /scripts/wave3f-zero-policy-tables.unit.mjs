/**
 * Static assert: Wave 3F-C zero-policy classification lives in the migration.
 * Run: node scripts/wave3f-zero-policy-tables.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const sql = await readFile(
  new URL('../supabase/migrations/202608170001_wave3f_zero_policy_tables.sql', import.meta.url),
  'utf8',
)

const tenantSelect = [
  'company_compliance_settings',
  'domain_events',
  'fuel_records',
  'override_audit_events',
  'vehicle_equipment_checks',
]

for (const table of tenantSelect) {
  const selectRe = new RegExp(
    `create policy ${table}_select_company\\s+on public\\.${table}\\s+for select to authenticated\\s+using \\(private\\.user_has_company\\(company_id\\)\\)`,
    'u',
  )
  assert.match(sql, selectRe, `${table} must have authenticated SELECT via private.user_has_company`)
}

assert.doesNotMatch(
  sql,
  /create policy (?:company_compliance_settings|domain_events|fuel_records|override_audit_events|vehicle_equipment_checks)_[a-z_]+[\s\S]{0,80}for (?:insert|update|delete|all) to authenticated/u,
  'tenant-select tables must not grant authenticated writes',
)

assert.match(sql, /grant select on table[\s\S]+to authenticated/u)
assert.match(sql, /grant all on table[\s\S]+vehicle_equipment_checks[\s\S]+to service_role/u)
assert.match(sql, /integration_api_keys_no_client/u)
assert.match(sql, /using \(false\)/u)
assert.match(sql, /with check \(false\)/u)
assert.match(sql, /revoke all on table public\.integration_api_keys from authenticated, anon/u)
assert.match(sql, /service-role-only/u)

console.log('wave3f-zero-policy-tables.unit.mjs: ok')
