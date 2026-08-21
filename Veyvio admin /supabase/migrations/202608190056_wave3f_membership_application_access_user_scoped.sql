-- Wave 3F UserScopedDb/RLS cutover 56: membership_application_access SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.
-- Narrow-read policy replaced by full SIU for grant management paths.

comment on table public.membership_application_access is
  'Wave 3F cutover 56: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists membership_application_access_company on public.membership_application_access;
drop policy if exists membership_application_access_company_select on public.membership_application_access;
drop policy if exists membership_application_access_select_company on public.membership_application_access;
drop policy if exists membership_application_access_insert_company on public.membership_application_access;
drop policy if exists membership_application_access_update_company on public.membership_application_access;
drop policy if exists membership_application_access_member on public.membership_application_access;
drop policy if exists membership_application_access_narrow_read on public.membership_application_access;

create policy membership_application_access_select_company
  on public.membership_application_access
  for select to authenticated
  using (private.user_has_company(company_id));

create policy membership_application_access_insert_company
  on public.membership_application_access
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy membership_application_access_update_company
  on public.membership_application_access
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.membership_application_access to authenticated;
revoke delete on table public.membership_application_access from authenticated;

grant all on table public.membership_application_access to service_role;
