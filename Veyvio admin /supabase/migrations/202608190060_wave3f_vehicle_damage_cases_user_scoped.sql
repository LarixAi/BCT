-- Wave 3F UserScopedDb/RLS cutover 60: vehicle_damage_cases SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.vehicle_damage_cases is
  'Wave 3F cutover 60: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists vehicle_damage_cases_company on public.vehicle_damage_cases;
drop policy if exists vehicle_damage_cases_company_select on public.vehicle_damage_cases;
drop policy if exists vehicle_damage_cases_select_company on public.vehicle_damage_cases;
drop policy if exists vehicle_damage_cases_insert_company on public.vehicle_damage_cases;
drop policy if exists vehicle_damage_cases_update_company on public.vehicle_damage_cases;
drop policy if exists vehicle_damage_cases_member on public.vehicle_damage_cases;
drop policy if exists vehicle_damage_cases_narrow_read on public.vehicle_damage_cases;

create policy vehicle_damage_cases_select_company
  on public.vehicle_damage_cases
  for select to authenticated
  using (private.user_has_company(company_id));

create policy vehicle_damage_cases_insert_company
  on public.vehicle_damage_cases
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy vehicle_damage_cases_update_company
  on public.vehicle_damage_cases
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.vehicle_damage_cases to authenticated;
revoke delete on table public.vehicle_damage_cases from authenticated;

grant all on table public.vehicle_damage_cases to service_role;
