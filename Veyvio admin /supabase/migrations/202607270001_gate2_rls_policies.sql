-- Gate 2 RLS policies for tables added without one in 202607250007-009.
-- All writes to these tables go through command-api's service-role client
-- (which bypasses RLS), so these SELECT policies are defense-in-depth: with
-- RLS enabled and no policy, any future direct/authenticated read (e.g. a
-- dashboard querying Supabase directly, or a downgraded key) would silently
-- return zero rows rather than leaking cross-tenant data. Matches the
-- private.user_has_company pattern from 202607230004 / 202607240010.

create policy journey_stops_select_company on public.journey_stops
  for select to authenticated
  using (private.user_has_company(company_id));

create policy vehicle_swap_requests_select_company on public.vehicle_swap_requests
  for select to authenticated
  using (private.user_has_company(company_id));

create policy duty_closeouts_select_company on public.duty_closeouts
  for select to authenticated
  using (private.user_has_company(company_id));

create policy driver_job_execution_events_select_company on public.driver_job_execution_events
  for select to authenticated
  using (private.user_has_company(company_id));
