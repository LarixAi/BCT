-- Wave 3F UserScopedDb/RLS cutover 93: trips SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked. Unblocks JWT projection reads of operational trips.

comment on table public.trips is
  'Wave 3F cutover 93: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and JWT-less projection helpers.';

drop policy if exists trips_company on public.trips;
drop policy if exists trips_company_select on public.trips;
drop policy if exists trips_select_company on public.trips;
drop policy if exists trips_insert_company on public.trips;
drop policy if exists trips_update_company on public.trips;
drop policy if exists trips_member on public.trips;
drop policy if exists trips_narrow_read on public.trips;

create policy trips_select_company
  on public.trips
  for select to authenticated
  using (private.user_has_company(company_id));

create policy trips_insert_company
  on public.trips
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy trips_update_company
  on public.trips
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.trips to authenticated;
revoke delete on table public.trips from authenticated;

grant all on table public.trips to service_role;
