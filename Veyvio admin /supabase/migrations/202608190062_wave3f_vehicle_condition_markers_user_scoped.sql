-- Wave 3F UserScopedDb/RLS cutover 62: vehicle_condition_markers SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.vehicle_condition_markers is
  'Wave 3F cutover 62: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists vehicle_condition_markers_company on public.vehicle_condition_markers;
drop policy if exists vehicle_condition_markers_company_select on public.vehicle_condition_markers;
drop policy if exists vehicle_condition_markers_select_company on public.vehicle_condition_markers;
drop policy if exists vehicle_condition_markers_insert_company on public.vehicle_condition_markers;
drop policy if exists vehicle_condition_markers_update_company on public.vehicle_condition_markers;
drop policy if exists vehicle_condition_markers_member on public.vehicle_condition_markers;
drop policy if exists vehicle_condition_markers_narrow_read on public.vehicle_condition_markers;

create policy vehicle_condition_markers_select_company
  on public.vehicle_condition_markers
  for select to authenticated
  using (private.user_has_company(company_id));

create policy vehicle_condition_markers_insert_company
  on public.vehicle_condition_markers
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy vehicle_condition_markers_update_company
  on public.vehicle_condition_markers
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.vehicle_condition_markers to authenticated;
revoke delete on table public.vehicle_condition_markers from authenticated;

grant all on table public.vehicle_condition_markers to service_role;
