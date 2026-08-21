-- Wave 3F UserScopedDb/RLS cutover 95: booking_legs SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.booking_legs is
  'Wave 3F cutover 95: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and JWT-less projection helpers.';

drop policy if exists booking_legs_company on public.booking_legs;
drop policy if exists booking_legs_company_select on public.booking_legs;
drop policy if exists booking_legs_select_company on public.booking_legs;
drop policy if exists booking_legs_insert_company on public.booking_legs;
drop policy if exists booking_legs_update_company on public.booking_legs;
drop policy if exists booking_legs_member on public.booking_legs;
drop policy if exists booking_legs_narrow_read on public.booking_legs;

create policy booking_legs_select_company
  on public.booking_legs
  for select to authenticated
  using (private.user_has_company(company_id));

create policy booking_legs_insert_company
  on public.booking_legs
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy booking_legs_update_company
  on public.booking_legs
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.booking_legs to authenticated;
revoke delete on table public.booking_legs from authenticated;

grant all on table public.booking_legs to service_role;
