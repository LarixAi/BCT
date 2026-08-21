-- Wave 3F UserScopedDb/RLS cutover 2: driver_job_execution_events INSERT + SELECT for authenticated members.
-- Do not edit released Wave 3F migrations (202608170001–004) or cutover 1 (202608190001).
-- Support-grant JWTs are not company members; Command keeps those writes on companyScopedServiceDb.
-- UPDATE/DELETE stay revoked — execution events are append-only.

comment on table public.driver_job_execution_events is
  'Wave 3F cutover 2: authenticated member SELECT/INSERT via private.user_has_company; UPDATE/DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists driver_job_execution_events_insert_company on public.driver_job_execution_events;
create policy driver_job_execution_events_insert_company
  on public.driver_job_execution_events
  for insert to authenticated
  with check (private.user_has_company(company_id));

grant select, insert on table public.driver_job_execution_events to authenticated;
revoke update, delete on table public.driver_job_execution_events from authenticated;

grant all on table public.driver_job_execution_events to service_role;
