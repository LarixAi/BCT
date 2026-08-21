-- Wave 3F UserScopedDb/RLS cutover 80: customers SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.customers is
  'Wave 3F cutover 80: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists customers_company on public.customers;
drop policy if exists customers_company_select on public.customers;
drop policy if exists customers_select_company on public.customers;
drop policy if exists customers_insert_company on public.customers;
drop policy if exists customers_update_company on public.customers;
drop policy if exists customers_member on public.customers;
drop policy if exists customers_narrow_read on public.customers;

create policy customers_select_company
  on public.customers
  for select to authenticated
  using (private.user_has_company(company_id));

create policy customers_insert_company
  on public.customers
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy customers_update_company
  on public.customers
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.customers to authenticated;
revoke delete on table public.customers from authenticated;

grant all on table public.customers to service_role;
