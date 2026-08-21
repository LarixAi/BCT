-- Wave 3F UserScopedDb/RLS cutover 75: depot_access SELECT/INSERT/UPDATE via membership company.
-- No company_id column; DELETE stays revoked.

comment on table public.depot_access is
  'Wave 3F cutover 75: authenticated member SELECT/INSERT/UPDATE when membership is in company; DELETE not granted.';

drop policy if exists depot_access_company on public.depot_access;
drop policy if exists depot_access_select_company on public.depot_access;
drop policy if exists depot_access_insert_company on public.depot_access;
drop policy if exists depot_access_update_company on public.depot_access;
drop policy if exists depot_access_company_select on public.depot_access;

create policy depot_access_select_company
  on public.depot_access
  for select to authenticated
  using (
    exists (
      select 1 from public.company_memberships m
      where m.id = membership_id and private.user_has_company(m.company_id)
    )
  );

create policy depot_access_insert_company
  on public.depot_access
  for insert to authenticated
  with check (
    exists (
      select 1 from public.company_memberships m
      where m.id = membership_id and private.user_has_company(m.company_id)
    )
  );

create policy depot_access_update_company
  on public.depot_access
  for update to authenticated
  using (
    exists (
      select 1 from public.company_memberships m
      where m.id = membership_id and private.user_has_company(m.company_id)
    )
  )
  with check (
    exists (
      select 1 from public.company_memberships m
      where m.id = membership_id and private.user_has_company(m.company_id)
    )
  );

grant select, insert, update on table public.depot_access to authenticated;
revoke delete on table public.depot_access from authenticated;

grant all on table public.depot_access to service_role;
