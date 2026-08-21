-- Wave 3F UserScopedDb/RLS cutover 66: vehicles SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.vehicles is
  'Wave 3F cutover 66: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists vehicles_company on public.vehicles;
drop policy if exists vehicles_company_select on public.vehicles;
drop policy if exists vehicles_select_company on public.vehicles;
drop policy if exists vehicles_insert_company on public.vehicles;
drop policy if exists vehicles_update_company on public.vehicles;
drop policy if exists vehicles_member on public.vehicles;
drop policy if exists vehicles_narrow_read on public.vehicles;

create policy vehicles_select_company
  on public.vehicles
  for select to authenticated
  using (private.user_has_company(company_id));

create policy vehicles_insert_company
  on public.vehicles
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy vehicles_update_company
  on public.vehicles
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.vehicles to authenticated;
revoke delete on table public.vehicles from authenticated;

grant all on table public.vehicles to service_role;
