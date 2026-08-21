-- Wave 3F UserScopedDb/RLS cutover 38: attendance_leave_requests SELECT/INSERT/UPDATE for members.
-- Narrows prior FOR ALL / select policies. DELETE stays revoked.

comment on table public.attendance_leave_requests is
  'Wave 3F cutover 38: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and companyId-only lookups.';

drop policy if exists attendance_leave_requests_company on public.attendance_leave_requests;
drop policy if exists attendance_leave_requests_company_select on public.attendance_leave_requests;
drop policy if exists attendance_leave_requests_select_company on public.attendance_leave_requests;
drop policy if exists attendance_leave_requests_insert_company on public.attendance_leave_requests;
drop policy if exists attendance_leave_requests_update_company on public.attendance_leave_requests;

create policy attendance_leave_requests_select_company
  on public.attendance_leave_requests
  for select to authenticated
  using (private.user_has_company(company_id));

create policy attendance_leave_requests_insert_company
  on public.attendance_leave_requests
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy attendance_leave_requests_update_company
  on public.attendance_leave_requests
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.attendance_leave_requests to authenticated;
revoke delete on table public.attendance_leave_requests from authenticated;

grant all on table public.attendance_leave_requests to service_role;
