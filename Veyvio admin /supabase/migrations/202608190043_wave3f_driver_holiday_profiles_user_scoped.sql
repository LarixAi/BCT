-- Wave 3F UserScopedDb/RLS cutover 43: driver_holiday_profiles SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.driver_holiday_profiles is
  'Wave 3F cutover 43: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and companyId-only helpers.';

drop policy if exists driver_holiday_profiles_company on public.driver_holiday_profiles;
drop policy if exists driver_holiday_profiles_company_select on public.driver_holiday_profiles;
drop policy if exists driver_holiday_profiles_select_company on public.driver_holiday_profiles;
drop policy if exists driver_holiday_profiles_insert_company on public.driver_holiday_profiles;
drop policy if exists driver_holiday_profiles_update_company on public.driver_holiday_profiles;

create policy driver_holiday_profiles_select_company
  on public.driver_holiday_profiles
  for select to authenticated
  using (private.user_has_company(company_id));

create policy driver_holiday_profiles_insert_company
  on public.driver_holiday_profiles
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy driver_holiday_profiles_update_company
  on public.driver_holiday_profiles
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.driver_holiday_profiles to authenticated;
revoke delete on table public.driver_holiday_profiles from authenticated;

grant all on table public.driver_holiday_profiles to service_role;
