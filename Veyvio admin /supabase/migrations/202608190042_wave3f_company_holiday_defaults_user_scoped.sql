-- Wave 3F UserScopedDb/RLS cutover 42: company_holiday_defaults SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.company_holiday_defaults is
  'Wave 3F cutover 42: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and companyId-only helpers.';

drop policy if exists company_holiday_defaults_company on public.company_holiday_defaults;
drop policy if exists company_holiday_defaults_company_select on public.company_holiday_defaults;
drop policy if exists company_holiday_defaults_select_company on public.company_holiday_defaults;
drop policy if exists company_holiday_defaults_insert_company on public.company_holiday_defaults;
drop policy if exists company_holiday_defaults_update_company on public.company_holiday_defaults;

create policy company_holiday_defaults_select_company
  on public.company_holiday_defaults
  for select to authenticated
  using (private.user_has_company(company_id));

create policy company_holiday_defaults_insert_company
  on public.company_holiday_defaults
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy company_holiday_defaults_update_company
  on public.company_holiday_defaults
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.company_holiday_defaults to authenticated;
revoke delete on table public.company_holiday_defaults from authenticated;

grant all on table public.company_holiday_defaults to service_role;
