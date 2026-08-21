-- Wave 3F UserScopedDb/RLS cutover 39: attendance_leave_audit SELECT/INSERT/UPDATE for members.
-- Narrows prior FOR ALL / select policies. DELETE stays revoked.
-- Append-style audit rows; members may INSERT/SELECT/UPDATE; DELETE revoked.

comment on table public.attendance_leave_audit is
  'Wave 3F cutover 39: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and companyId-only lookups.';

drop policy if exists attendance_leave_audit_company on public.attendance_leave_audit;
drop policy if exists attendance_leave_audit_company_select on public.attendance_leave_audit;
drop policy if exists attendance_leave_audit_select_company on public.attendance_leave_audit;
drop policy if exists attendance_leave_audit_insert_company on public.attendance_leave_audit;
drop policy if exists attendance_leave_audit_update_company on public.attendance_leave_audit;

create policy attendance_leave_audit_select_company
  on public.attendance_leave_audit
  for select to authenticated
  using (private.user_has_company(company_id));

create policy attendance_leave_audit_insert_company
  on public.attendance_leave_audit
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy attendance_leave_audit_update_company
  on public.attendance_leave_audit
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.attendance_leave_audit to authenticated;
revoke delete on table public.attendance_leave_audit from authenticated;

grant all on table public.attendance_leave_audit to service_role;
