-- Wave 3F UserScopedDb/RLS cutover 77: invitations SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.invitations is
  'Wave 3F cutover 77: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists invitations_company on public.invitations;
drop policy if exists invitations_company_select on public.invitations;
drop policy if exists invitations_select_company on public.invitations;
drop policy if exists invitations_insert_company on public.invitations;
drop policy if exists invitations_update_company on public.invitations;
drop policy if exists invitations_member on public.invitations;
drop policy if exists invitations_narrow_read on public.invitations;

create policy invitations_select_company
  on public.invitations
  for select to authenticated
  using (private.user_has_company(company_id));

create policy invitations_insert_company
  on public.invitations
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy invitations_update_company
  on public.invitations
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.invitations to authenticated;
revoke delete on table public.invitations from authenticated;

grant all on table public.invitations to service_role;
