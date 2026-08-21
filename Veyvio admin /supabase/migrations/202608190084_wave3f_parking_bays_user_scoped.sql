-- Wave 3F UserScopedDb/RLS cutover 84: parking_bays SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.parking_bays is
  'Wave 3F cutover 84: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists parking_bays_company on public.parking_bays;
drop policy if exists parking_bays_company_select on public.parking_bays;
drop policy if exists parking_bays_select_company on public.parking_bays;
drop policy if exists parking_bays_insert_company on public.parking_bays;
drop policy if exists parking_bays_update_company on public.parking_bays;
drop policy if exists parking_bays_member on public.parking_bays;
drop policy if exists parking_bays_narrow_read on public.parking_bays;

create policy parking_bays_select_company
  on public.parking_bays
  for select to authenticated
  using (private.user_has_company(company_id));

create policy parking_bays_insert_company
  on public.parking_bays
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy parking_bays_update_company
  on public.parking_bays
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.parking_bays to authenticated;
revoke delete on table public.parking_bays from authenticated;

grant all on table public.parking_bays to service_role;
