-- Wave 3F UserScopedDb/RLS cutover 50: audit_events SELECT/INSERT for members (append-only).
-- UPDATE/DELETE stay revoked.

comment on table public.audit_events is
  'Wave 3F cutover 50: authenticated member SELECT/INSERT via private.user_has_company; UPDATE/DELETE not granted; service_role retained for named writers and support-grant.';

drop policy if exists audit_events_company on public.audit_events;
drop policy if exists audit_events_company_select on public.audit_events;
drop policy if exists audit_events_select_company on public.audit_events;
drop policy if exists audit_events_insert_company on public.audit_events;

create policy audit_events_select_company
  on public.audit_events
  for select to authenticated
  using (private.user_has_company(company_id));

create policy audit_events_insert_company
  on public.audit_events
  for insert to authenticated
  with check (private.user_has_company(company_id));

grant select, insert on table public.audit_events to authenticated;
revoke update, delete on table public.audit_events from authenticated;

grant all on table public.audit_events to service_role;
