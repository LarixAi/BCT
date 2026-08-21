-- Wave 3F UserScopedDb/RLS cutover 92: role_permissions SELECT/INSERT/UPDATE via parent role company.

comment on table public.role_permissions is
  'Wave 3F cutover 92: authenticated member SELECT/INSERT/UPDATE when parent role is in company; DELETE not granted.';

drop policy if exists role_permissions_select_company on public.role_permissions;
drop policy if exists role_permissions_insert_company on public.role_permissions;
drop policy if exists role_permissions_update_company on public.role_permissions;
drop policy if exists role_permissions_company_select on public.role_permissions;

create policy role_permissions_select_company
  on public.role_permissions for select to authenticated
  using (
    exists (
      select 1 from public.roles r
      where r.id = role_id and private.user_has_company(r.company_id)
    )
  );

create policy role_permissions_insert_company
  on public.role_permissions for insert to authenticated
  with check (
    exists (
      select 1 from public.roles r
      where r.id = role_id and private.user_has_company(r.company_id)
    )
  );

create policy role_permissions_update_company
  on public.role_permissions for update to authenticated
  using (
    exists (
      select 1 from public.roles r
      where r.id = role_id and private.user_has_company(r.company_id)
    )
  )
  with check (
    exists (
      select 1 from public.roles r
      where r.id = role_id and private.user_has_company(r.company_id)
    )
  );

grant select, insert, update on table public.role_permissions to authenticated;
revoke delete on table public.role_permissions from authenticated;
grant all on table public.role_permissions to service_role;
