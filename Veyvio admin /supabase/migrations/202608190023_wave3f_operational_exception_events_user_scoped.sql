-- Wave 3F UserScopedDb/RLS cutover 23: operational_exception_events SELECT/INSERT for members.
-- Append-only. Parent operational_exceptions already cut over (010). UPDATE/DELETE stay revoked.

comment on table public.operational_exception_events is
  'Wave 3F cutover 23: authenticated member SELECT/INSERT via private.user_has_company; UPDATE/DELETE not granted; service_role retained for support-grant and no-JWT defect automation.';

drop policy if exists operational_exception_events_company on public.operational_exception_events;
drop policy if exists operational_exception_events_select_company on public.operational_exception_events;
drop policy if exists operational_exception_events_insert_company on public.operational_exception_events;

create policy operational_exception_events_select_company
  on public.operational_exception_events
  for select to authenticated
  using (private.user_has_company(company_id));

create policy operational_exception_events_insert_company
  on public.operational_exception_events
  for insert to authenticated
  with check (private.user_has_company(company_id));

grant select, insert on table public.operational_exception_events to authenticated;
revoke update, delete on table public.operational_exception_events from authenticated;

grant all on table public.operational_exception_events to service_role;
