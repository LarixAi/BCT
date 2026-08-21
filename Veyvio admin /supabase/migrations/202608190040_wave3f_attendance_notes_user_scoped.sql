-- Wave 3F UserScopedDb/RLS cutover 40: attendance_notes SELECT/INSERT/UPDATE for members.
-- Narrows prior FOR ALL / select policies. DELETE stays revoked.

comment on table public.attendance_notes is
  'Wave 3F cutover 40: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and companyId-only lookups.';

drop policy if exists attendance_notes_company on public.attendance_notes;
drop policy if exists attendance_notes_company_select on public.attendance_notes;
drop policy if exists attendance_notes_select_company on public.attendance_notes;
drop policy if exists attendance_notes_insert_company on public.attendance_notes;
drop policy if exists attendance_notes_update_company on public.attendance_notes;

create policy attendance_notes_select_company
  on public.attendance_notes
  for select to authenticated
  using (private.user_has_company(company_id));

create policy attendance_notes_insert_company
  on public.attendance_notes
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy attendance_notes_update_company
  on public.attendance_notes
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.attendance_notes to authenticated;
revoke delete on table public.attendance_notes from authenticated;

grant all on table public.attendance_notes to service_role;
