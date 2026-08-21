-- Wave 3F UserScopedDb/RLS cutover 94: passengers SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.passengers is
  'Wave 3F cutover 94: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and JWT-less projection helpers.';

drop policy if exists passengers_company on public.passengers;
drop policy if exists passengers_company_select on public.passengers;
drop policy if exists passengers_select_company on public.passengers;
drop policy if exists passengers_insert_company on public.passengers;
drop policy if exists passengers_update_company on public.passengers;
drop policy if exists passengers_member on public.passengers;
drop policy if exists passengers_narrow_read on public.passengers;

create policy passengers_select_company
  on public.passengers
  for select to authenticated
  using (private.user_has_company(company_id));

create policy passengers_insert_company
  on public.passengers
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy passengers_update_company
  on public.passengers
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.passengers to authenticated;
revoke delete on table public.passengers from authenticated;

grant all on table public.passengers to service_role;
