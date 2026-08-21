-- Wave 3F UserScopedDb/RLS cutover 82: places SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.places is
  'Wave 3F cutover 82: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists places_company on public.places;
drop policy if exists places_company_select on public.places;
drop policy if exists places_select_company on public.places;
drop policy if exists places_insert_company on public.places;
drop policy if exists places_update_company on public.places;
drop policy if exists places_member on public.places;
drop policy if exists places_narrow_read on public.places;

create policy places_select_company
  on public.places
  for select to authenticated
  using (private.user_has_company(company_id));

create policy places_insert_company
  on public.places
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy places_update_company
  on public.places
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.places to authenticated;
revoke delete on table public.places from authenticated;

grant all on table public.places to service_role;
