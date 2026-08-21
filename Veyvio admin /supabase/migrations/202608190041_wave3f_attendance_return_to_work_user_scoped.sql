-- Wave 3F UserScopedDb/RLS cutover 41: attendance_return_to_work SELECT/INSERT/UPDATE for members.
-- Narrows prior FOR ALL / select policies. DELETE stays revoked.

comment on table public.attendance_return_to_work is
  'Wave 3F cutover 41: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and companyId-only lookups.';

drop policy if exists attendance_return_to_work_company on public.attendance_return_to_work;
drop policy if exists attendance_return_to_work_company_select on public.attendance_return_to_work;
drop policy if exists attendance_return_to_work_select_company on public.attendance_return_to_work;
drop policy if exists attendance_return_to_work_insert_company on public.attendance_return_to_work;
drop policy if exists attendance_return_to_work_update_company on public.attendance_return_to_work;

create policy attendance_return_to_work_select_company
  on public.attendance_return_to_work
  for select to authenticated
  using (private.user_has_company(company_id));

create policy attendance_return_to_work_insert_company
  on public.attendance_return_to_work
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy attendance_return_to_work_update_company
  on public.attendance_return_to_work
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.attendance_return_to_work to authenticated;
revoke delete on table public.attendance_return_to_work from authenticated;

grant all on table public.attendance_return_to_work to service_role;
