-- Wave 3F UserScopedDb/RLS cutover 45: holiday_pay_records SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.holiday_pay_records is
  'Wave 3F cutover 45: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and companyId-only helpers.';

drop policy if exists holiday_pay_records_company on public.holiday_pay_records;
drop policy if exists holiday_pay_records_company_select on public.holiday_pay_records;
drop policy if exists holiday_pay_records_select_company on public.holiday_pay_records;
drop policy if exists holiday_pay_records_insert_company on public.holiday_pay_records;
drop policy if exists holiday_pay_records_update_company on public.holiday_pay_records;

create policy holiday_pay_records_select_company
  on public.holiday_pay_records
  for select to authenticated
  using (private.user_has_company(company_id));

create policy holiday_pay_records_insert_company
  on public.holiday_pay_records
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy holiday_pay_records_update_company
  on public.holiday_pay_records
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.holiday_pay_records to authenticated;
revoke delete on table public.holiday_pay_records from authenticated;

grant all on table public.holiday_pay_records to service_role;
