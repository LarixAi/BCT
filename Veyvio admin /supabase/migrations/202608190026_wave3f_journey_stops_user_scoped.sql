-- Wave 3F UserScopedDb/RLS cutover 26: journey_stops SELECT/INSERT/UPDATE for members.
-- Runs/duties/drivers lookups stay Command service-role. DELETE stays revoked.

comment on table public.journey_stops is
  'Wave 3F cutover 26: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists journey_stops_select_company on public.journey_stops;
drop policy if exists journey_stops_insert_company on public.journey_stops;
drop policy if exists journey_stops_update_company on public.journey_stops;

create policy journey_stops_select_company
  on public.journey_stops
  for select to authenticated
  using (private.user_has_company(company_id));

create policy journey_stops_insert_company
  on public.journey_stops
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy journey_stops_update_company
  on public.journey_stops
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.journey_stops to authenticated;
revoke delete on table public.journey_stops from authenticated;

grant all on table public.journey_stops to service_role;
