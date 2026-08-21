-- Wave 3F UserScopedDb/RLS cutover 53: run_trips SELECT/INSERT via parent run company.
-- No company_id column; UPDATE/DELETE stay revoked.

comment on table public.run_trips is
  'Wave 3F cutover 53: authenticated member SELECT/INSERT when parent run is in company; UPDATE/DELETE not granted.';

drop policy if exists run_trips_company_select on public.run_trips;
drop policy if exists run_trips_select_company on public.run_trips;
drop policy if exists run_trips_insert_company on public.run_trips;

create policy run_trips_select_company
  on public.run_trips
  for select to authenticated
  using (
    exists (
      select 1 from public.runs r
      where r.id = run_id and private.user_has_company(r.company_id)
    )
  );

create policy run_trips_insert_company
  on public.run_trips
  for insert to authenticated
  with check (
    exists (
      select 1 from public.runs r
      where r.id = run_id and private.user_has_company(r.company_id)
    )
  );

grant select, insert on table public.run_trips to authenticated;
revoke update, delete on table public.run_trips from authenticated;

grant all on table public.run_trips to service_role;
