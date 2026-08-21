-- Wave 3F UserScopedDb/RLS cutover 89: executive_policies SELECT/INSERT/UPDATE for members.
comment on table public.executive_policies is
  'Wave 3F cutover 89: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted.';

drop policy if exists executive_policies_company on public.executive_policies;
drop policy if exists executive_policies_company_select on public.executive_policies;
drop policy if exists executive_policies_select_company on public.executive_policies;
drop policy if exists executive_policies_insert_company on public.executive_policies;
drop policy if exists executive_policies_update_company on public.executive_policies;
drop policy if exists executive_policies_member on public.executive_policies;

create policy executive_policies_select_company
  on public.executive_policies for select to authenticated
  using (private.user_has_company(company_id));

create policy executive_policies_insert_company
  on public.executive_policies for insert to authenticated
  with check (private.user_has_company(company_id));

create policy executive_policies_update_company
  on public.executive_policies for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.executive_policies to authenticated;
revoke delete on table public.executive_policies from authenticated;
grant all on table public.executive_policies to service_role;
