-- Wave 3F UserScopedDb/RLS cutover 79: file_objects SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.file_objects is
  'Wave 3F cutover 79: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists file_objects_company on public.file_objects;
drop policy if exists file_objects_company_select on public.file_objects;
drop policy if exists file_objects_select_company on public.file_objects;
drop policy if exists file_objects_insert_company on public.file_objects;
drop policy if exists file_objects_update_company on public.file_objects;
drop policy if exists file_objects_member on public.file_objects;
drop policy if exists file_objects_narrow_read on public.file_objects;

create policy file_objects_select_company
  on public.file_objects
  for select to authenticated
  using (private.user_has_company(company_id));

create policy file_objects_insert_company
  on public.file_objects
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy file_objects_update_company
  on public.file_objects
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.file_objects to authenticated;
revoke delete on table public.file_objects from authenticated;

grant all on table public.file_objects to service_role;
