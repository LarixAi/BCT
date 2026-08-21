-- Wave 3F UserScopedDb/RLS cutover 51: trip_assignments SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.trip_assignments is
  'Wave 3F cutover 51: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists trip_assignments_company on public.trip_assignments;
drop policy if exists trip_assignments_company_select on public.trip_assignments;
drop policy if exists trip_assignments_select_company on public.trip_assignments;
drop policy if exists trip_assignments_insert_company on public.trip_assignments;
drop policy if exists trip_assignments_update_company on public.trip_assignments;

create policy trip_assignments_select_company
  on public.trip_assignments
  for select to authenticated
  using (private.user_has_company(company_id));

create policy trip_assignments_insert_company
  on public.trip_assignments
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy trip_assignments_update_company
  on public.trip_assignments
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.trip_assignments to authenticated;
revoke delete on table public.trip_assignments from authenticated;

grant all on table public.trip_assignments to service_role;
