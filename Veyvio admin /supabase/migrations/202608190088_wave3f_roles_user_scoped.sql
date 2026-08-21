-- Wave 3F UserScopedDb/RLS cutover 88: roles SELECT/INSERT/UPDATE for members.
comment on table public.roles is
  'Wave 3F cutover 88: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted.';

drop policy if exists roles_company on public.roles;
drop policy if exists roles_company_select on public.roles;
drop policy if exists roles_select_company on public.roles;
drop policy if exists roles_insert_company on public.roles;
drop policy if exists roles_update_company on public.roles;
drop policy if exists roles_member on public.roles;

create policy roles_select_company
  on public.roles for select to authenticated
  using (private.user_has_company(company_id));

create policy roles_insert_company
  on public.roles for insert to authenticated
  with check (private.user_has_company(company_id));

create policy roles_update_company
  on public.roles for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.roles to authenticated;
revoke delete on table public.roles from authenticated;
grant all on table public.roles to service_role;
