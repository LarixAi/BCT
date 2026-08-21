-- Wave 3F UserScopedDb/RLS cutover 83: schools SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.schools is
  'Wave 3F cutover 83: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists schools_company on public.schools;
drop policy if exists schools_company_select on public.schools;
drop policy if exists schools_select_company on public.schools;
drop policy if exists schools_insert_company on public.schools;
drop policy if exists schools_update_company on public.schools;
drop policy if exists schools_member on public.schools;
drop policy if exists schools_narrow_read on public.schools;

create policy schools_select_company
  on public.schools
  for select to authenticated
  using (private.user_has_company(company_id));

create policy schools_insert_company
  on public.schools
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy schools_update_company
  on public.schools
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.schools to authenticated;
revoke delete on table public.schools from authenticated;

grant all on table public.schools to service_role;
