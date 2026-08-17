-- Wave 3F-C / FIX-P0-011 remediation item 1.
-- Six tenant-bearing tables had ENABLE RLS but zero policies (ambiguous default deny).
-- Classify each explicitly. Writes stay Command API / service-role (no authenticated INSERT/UPDATE/DELETE).

-- ---------------------------------------------------------------------------
-- Tenant-accessible SELECT (defense-in-depth for PostgREST).
-- Matches 202607270001 Gate 2 SELECT backstops.
-- ---------------------------------------------------------------------------

comment on table public.company_compliance_settings is
  'Wave 3F-C: tenant-accessible SELECT via private.user_has_company; writes Command API / service-role only.';

comment on table public.domain_events is
  'Wave 3F-C: tenant-accessible SELECT via private.user_has_company; append-only writes Command API / service-role only.';

comment on table public.fuel_records is
  'Wave 3F-C: tenant-accessible SELECT via private.user_has_company; writes Command API / service-role only.';

comment on table public.override_audit_events is
  'Wave 3F-C: tenant-accessible SELECT via private.user_has_company; append-only writes Command API / service-role only.';

comment on table public.vehicle_equipment_checks is
  'Wave 3F-C: tenant-accessible SELECT via private.user_has_company; writes Command API / service-role only.';

drop policy if exists company_compliance_settings_select_company on public.company_compliance_settings;
create policy company_compliance_settings_select_company
  on public.company_compliance_settings
  for select to authenticated
  using (private.user_has_company(company_id));

drop policy if exists domain_events_select_company on public.domain_events;
create policy domain_events_select_company
  on public.domain_events
  for select to authenticated
  using (private.user_has_company(company_id));

drop policy if exists fuel_records_select_company on public.fuel_records;
create policy fuel_records_select_company
  on public.fuel_records
  for select to authenticated
  using (private.user_has_company(company_id));

drop policy if exists override_audit_events_select_company on public.override_audit_events;
create policy override_audit_events_select_company
  on public.override_audit_events
  for select to authenticated
  using (private.user_has_company(company_id));

drop policy if exists vehicle_equipment_checks_select_company on public.vehicle_equipment_checks;
create policy vehicle_equipment_checks_select_company
  on public.vehicle_equipment_checks
  for select to authenticated
  using (private.user_has_company(company_id));

-- Policy without GRANT SELECT is a no-op for PostgREST (42501 before RLS).
grant select on table
  public.company_compliance_settings,
  public.domain_events,
  public.fuel_records,
  public.override_audit_events,
  public.vehicle_equipment_checks
  to authenticated;

grant all on table
  public.company_compliance_settings,
  public.domain_events,
  public.fuel_records,
  public.override_audit_events,
  public.vehicle_equipment_checks
  to service_role;

-- ---------------------------------------------------------------------------
-- Service-role-only: hashed live integration secrets (key_hash).
-- Command API lists keys without returning the hash.
-- FORCE + deny policy + revoke so authenticated PostgREST cannot read hashes.
-- ---------------------------------------------------------------------------

comment on table public.integration_api_keys is
  'Wave 3F-C: service-role-only. Contains key_hash; authenticated PostgREST denied. Command API is the read/write path.';

alter table public.integration_api_keys enable row level security;
alter table public.integration_api_keys force row level security;

drop policy if exists integration_api_keys_no_client on public.integration_api_keys;
create policy integration_api_keys_no_client
  on public.integration_api_keys
  for all to authenticated
  using (false)
  with check (false);

revoke all on table public.integration_api_keys from authenticated, anon;
grant all on table public.integration_api_keys to service_role;
