-- Wave 3F UserScopedDb/RLS cutover 4: adblue_records INSERT + SELECT for authenticated members.
-- Narrows the previous FOR ALL advisor policy so authenticated cannot UPDATE/DELETE.
-- Support-grant JWTs stay on companyScopedServiceDb in Command.

comment on table public.adblue_records is
  'Wave 3F cutover 4: authenticated member SELECT/INSERT via private.user_has_company; UPDATE/DELETE not granted; service_role retained for support-grant and projections.';

drop policy if exists adblue_records_company on public.adblue_records;
drop policy if exists adblue_records_select_company on public.adblue_records;
drop policy if exists adblue_records_insert_company on public.adblue_records;

create policy adblue_records_select_company
  on public.adblue_records
  for select to authenticated
  using (private.user_has_company(company_id));

create policy adblue_records_insert_company
  on public.adblue_records
  for insert to authenticated
  with check (private.user_has_company(company_id));

grant select, insert on table public.adblue_records to authenticated;
revoke update, delete on table public.adblue_records from authenticated;

grant all on table public.adblue_records to service_role;
