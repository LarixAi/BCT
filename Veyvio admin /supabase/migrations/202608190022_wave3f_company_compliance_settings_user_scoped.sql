-- Wave 3F UserScopedDb/RLS cutover 22: company_compliance_settings SELECT/INSERT/UPDATE for members.
-- 202608170001 already granted SELECT. DELETE stays revoked. evaluate* without JWT stays service-role.

comment on table public.company_compliance_settings is
  'Wave 3F cutover 22: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for no-JWT evaluate paths and support-grant.';

drop policy if exists company_compliance_settings_select_company on public.company_compliance_settings;
drop policy if exists company_compliance_settings_insert_company on public.company_compliance_settings;
drop policy if exists company_compliance_settings_update_company on public.company_compliance_settings;

create policy company_compliance_settings_select_company
  on public.company_compliance_settings
  for select to authenticated
  using (private.user_has_company(company_id));

create policy company_compliance_settings_insert_company
  on public.company_compliance_settings
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy company_compliance_settings_update_company
  on public.company_compliance_settings
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.company_compliance_settings to authenticated;
revoke delete on table public.company_compliance_settings from authenticated;

grant all on table public.company_compliance_settings to service_role;
