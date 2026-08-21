-- Wave 3F UserScopedDb/RLS cutover 44: holiday_ledger_entries SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.holiday_ledger_entries is
  'Wave 3F cutover 44: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and companyId-only helpers.';

drop policy if exists holiday_ledger_entries_company on public.holiday_ledger_entries;
drop policy if exists holiday_ledger_entries_company_select on public.holiday_ledger_entries;
drop policy if exists holiday_ledger_entries_select_company on public.holiday_ledger_entries;
drop policy if exists holiday_ledger_entries_insert_company on public.holiday_ledger_entries;
drop policy if exists holiday_ledger_entries_update_company on public.holiday_ledger_entries;

create policy holiday_ledger_entries_select_company
  on public.holiday_ledger_entries
  for select to authenticated
  using (private.user_has_company(company_id));

create policy holiday_ledger_entries_insert_company
  on public.holiday_ledger_entries
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy holiday_ledger_entries_update_company
  on public.holiday_ledger_entries
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.holiday_ledger_entries to authenticated;
revoke delete on table public.holiday_ledger_entries from authenticated;

grant all on table public.holiday_ledger_entries to service_role;
