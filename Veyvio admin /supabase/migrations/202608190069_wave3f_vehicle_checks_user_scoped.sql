-- Wave 3F UserScopedDb/RLS cutover 69: vehicle_checks SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.vehicle_checks is
  'Wave 3F cutover 69: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists vehicle_checks_company on public.vehicle_checks;
drop policy if exists vehicle_checks_company_select on public.vehicle_checks;
drop policy if exists vehicle_checks_select_company on public.vehicle_checks;
drop policy if exists vehicle_checks_insert_company on public.vehicle_checks;
drop policy if exists vehicle_checks_update_company on public.vehicle_checks;
drop policy if exists vehicle_checks_member on public.vehicle_checks;
drop policy if exists vehicle_checks_narrow_read on public.vehicle_checks;

create policy vehicle_checks_select_company
  on public.vehicle_checks
  for select to authenticated
  using (private.user_has_company(company_id));

create policy vehicle_checks_insert_company
  on public.vehicle_checks
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy vehicle_checks_update_company
  on public.vehicle_checks
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.vehicle_checks to authenticated;
revoke delete on table public.vehicle_checks from authenticated;

grant all on table public.vehicle_checks to service_role;
