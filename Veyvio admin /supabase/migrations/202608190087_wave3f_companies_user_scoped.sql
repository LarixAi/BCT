-- Wave 3F UserScopedDb/RLS cutover 87: companies SELECT/UPDATE for members (no INSERT/DELETE for authenticated).

comment on table public.companies is
  'Wave 3F cutover 87: authenticated member SELECT/UPDATE own company row via private.user_has_company(id); INSERT/DELETE not granted.';

drop policy if exists companies_select_company on public.companies;
drop policy if exists companies_update_company on public.companies;
drop policy if exists companies_member on public.companies;
drop policy if exists companies_company_select on public.companies;

create policy companies_select_company
  on public.companies
  for select to authenticated
  using (private.user_has_company(id));

create policy companies_update_company
  on public.companies
  for update to authenticated
  using (private.user_has_company(id))
  with check (private.user_has_company(id));

grant select, update on table public.companies to authenticated;
revoke insert, delete on table public.companies from authenticated;

grant all on table public.companies to service_role;
