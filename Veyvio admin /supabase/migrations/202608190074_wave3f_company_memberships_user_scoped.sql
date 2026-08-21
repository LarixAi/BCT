-- Wave 3F UserScopedDb/RLS cutover 74: company_memberships SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.company_memberships is
  'Wave 3F cutover 74: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists company_memberships_company on public.company_memberships;
drop policy if exists company_memberships_company_select on public.company_memberships;
drop policy if exists company_memberships_select_company on public.company_memberships;
drop policy if exists company_memberships_insert_company on public.company_memberships;
drop policy if exists company_memberships_update_company on public.company_memberships;
drop policy if exists company_memberships_member on public.company_memberships;
drop policy if exists company_memberships_narrow_read on public.company_memberships;

create policy company_memberships_select_company
  on public.company_memberships
  for select to authenticated
  using (private.user_has_company(company_id));

create policy company_memberships_insert_company
  on public.company_memberships
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy company_memberships_update_company
  on public.company_memberships
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.company_memberships to authenticated;
revoke delete on table public.company_memberships from authenticated;

grant all on table public.company_memberships to service_role;
