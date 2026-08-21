-- Wave 3F UserScopedDb/RLS cutover 90: executive_company_records SELECT/INSERT/UPDATE for members.
comment on table public.executive_company_records is
  'Wave 3F cutover 90: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted.';

drop policy if exists executive_company_records_company on public.executive_company_records;
drop policy if exists executive_company_records_company_select on public.executive_company_records;
drop policy if exists executive_company_records_select_company on public.executive_company_records;
drop policy if exists executive_company_records_insert_company on public.executive_company_records;
drop policy if exists executive_company_records_update_company on public.executive_company_records;
drop policy if exists executive_company_records_member on public.executive_company_records;

create policy executive_company_records_select_company
  on public.executive_company_records for select to authenticated
  using (private.user_has_company(company_id));

create policy executive_company_records_insert_company
  on public.executive_company_records for insert to authenticated
  with check (private.user_has_company(company_id));

create policy executive_company_records_update_company
  on public.executive_company_records for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.executive_company_records to authenticated;
revoke delete on table public.executive_company_records from authenticated;
grant all on table public.executive_company_records to service_role;
