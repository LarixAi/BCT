-- Wave 3F UserScopedDb/RLS cutover 35: duty_assignment_events SELECT/INSERT for members.
-- Append-only. Narrows prior FOR ALL advisor policy. UPDATE/DELETE stay revoked.
-- Duties / duty_runs stay service-role in duty-publication and callers.

comment on table public.duty_assignment_events is
  'Wave 3F cutover 35: authenticated member SELECT/INSERT via private.user_has_company; UPDATE/DELETE not granted; service_role retained for support-grant and no-JWT callers.';

drop policy if exists duty_assignment_events_company on public.duty_assignment_events;
drop policy if exists duty_assignment_events_select_company on public.duty_assignment_events;
drop policy if exists duty_assignment_events_insert_company on public.duty_assignment_events;

create policy duty_assignment_events_select_company
  on public.duty_assignment_events
  for select to authenticated
  using (private.user_has_company(company_id));

create policy duty_assignment_events_insert_company
  on public.duty_assignment_events
  for insert to authenticated
  with check (private.user_has_company(company_id));

grant select, insert on table public.duty_assignment_events to authenticated;
revoke update, delete on table public.duty_assignment_events from authenticated;

grant all on table public.duty_assignment_events to service_role;
