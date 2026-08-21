-- Wave 3F UserScopedDb/RLS cutover 81: bookings SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.bookings is
  'Wave 3F cutover 81: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists bookings_company on public.bookings;
drop policy if exists bookings_company_select on public.bookings;
drop policy if exists bookings_select_company on public.bookings;
drop policy if exists bookings_insert_company on public.bookings;
drop policy if exists bookings_update_company on public.bookings;
drop policy if exists bookings_member on public.bookings;
drop policy if exists bookings_narrow_read on public.bookings;

create policy bookings_select_company
  on public.bookings
  for select to authenticated
  using (private.user_has_company(company_id));

create policy bookings_insert_company
  on public.bookings
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy bookings_update_company
  on public.bookings
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.bookings to authenticated;
revoke delete on table public.bookings from authenticated;

grant all on table public.bookings to service_role;
