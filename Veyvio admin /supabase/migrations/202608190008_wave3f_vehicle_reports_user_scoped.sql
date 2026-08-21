-- Wave 3F UserScopedDb/RLS cutover 8: vehicle_reports SELECT/INSERT/UPDATE for members.
-- Narrows the previous FOR ALL advisor policy. Evidence + status_history stay
-- Command service-role until those child tables are cut over. DELETE stays revoked.

comment on table public.vehicle_reports is
  'Wave 3F cutover 8: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; evidence/history/vehicles lookups stay service-role.';

drop policy if exists vehicle_reports_company on public.vehicle_reports;
drop policy if exists vehicle_reports_select_company on public.vehicle_reports;
drop policy if exists vehicle_reports_insert_company on public.vehicle_reports;
drop policy if exists vehicle_reports_update_company on public.vehicle_reports;

create policy vehicle_reports_select_company
  on public.vehicle_reports
  for select to authenticated
  using (private.user_has_company(company_id));

create policy vehicle_reports_insert_company
  on public.vehicle_reports
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy vehicle_reports_update_company
  on public.vehicle_reports
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.vehicle_reports to authenticated;
revoke delete on table public.vehicle_reports from authenticated;

grant all on table public.vehicle_reports to service_role;
