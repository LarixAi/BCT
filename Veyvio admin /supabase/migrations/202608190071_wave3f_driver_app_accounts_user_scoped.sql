-- Wave 3F UserScopedDb/RLS cutover 71: driver_app_accounts SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.driver_app_accounts is
  'Wave 3F cutover 71: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists driver_app_accounts_company on public.driver_app_accounts;
drop policy if exists driver_app_accounts_company_select on public.driver_app_accounts;
drop policy if exists driver_app_accounts_select_company on public.driver_app_accounts;
drop policy if exists driver_app_accounts_insert_company on public.driver_app_accounts;
drop policy if exists driver_app_accounts_update_company on public.driver_app_accounts;
drop policy if exists driver_app_accounts_member on public.driver_app_accounts;
drop policy if exists driver_app_accounts_narrow_read on public.driver_app_accounts;

create policy driver_app_accounts_select_company
  on public.driver_app_accounts
  for select to authenticated
  using (private.user_has_company(company_id));

create policy driver_app_accounts_insert_company
  on public.driver_app_accounts
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy driver_app_accounts_update_company
  on public.driver_app_accounts
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.driver_app_accounts to authenticated;
revoke delete on table public.driver_app_accounts from authenticated;

grant all on table public.driver_app_accounts to service_role;
