-- Wave 3F UserScopedDb/RLS cutover 85: driver_restrictions SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.driver_restrictions is
  'Wave 3F cutover 85: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists driver_restrictions_company on public.driver_restrictions;
drop policy if exists driver_restrictions_company_select on public.driver_restrictions;
drop policy if exists driver_restrictions_select_company on public.driver_restrictions;
drop policy if exists driver_restrictions_insert_company on public.driver_restrictions;
drop policy if exists driver_restrictions_update_company on public.driver_restrictions;
drop policy if exists driver_restrictions_member on public.driver_restrictions;
drop policy if exists driver_restrictions_narrow_read on public.driver_restrictions;

create policy driver_restrictions_select_company
  on public.driver_restrictions
  for select to authenticated
  using (private.user_has_company(company_id));

create policy driver_restrictions_insert_company
  on public.driver_restrictions
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy driver_restrictions_update_company
  on public.driver_restrictions
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.driver_restrictions to authenticated;
revoke delete on table public.driver_restrictions from authenticated;

grant all on table public.driver_restrictions to service_role;
