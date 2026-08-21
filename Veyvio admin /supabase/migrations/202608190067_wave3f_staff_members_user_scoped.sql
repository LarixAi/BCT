-- Wave 3F UserScopedDb/RLS cutover 67: staff_members SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.staff_members is
  'Wave 3F cutover 67: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists staff_members_company on public.staff_members;
drop policy if exists staff_members_company_select on public.staff_members;
drop policy if exists staff_members_select_company on public.staff_members;
drop policy if exists staff_members_insert_company on public.staff_members;
drop policy if exists staff_members_update_company on public.staff_members;
drop policy if exists staff_members_member on public.staff_members;
drop policy if exists staff_members_narrow_read on public.staff_members;

create policy staff_members_select_company
  on public.staff_members
  for select to authenticated
  using (private.user_has_company(company_id));

create policy staff_members_insert_company
  on public.staff_members
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy staff_members_update_company
  on public.staff_members
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.staff_members to authenticated;
revoke delete on table public.staff_members from authenticated;

grant all on table public.staff_members to service_role;
