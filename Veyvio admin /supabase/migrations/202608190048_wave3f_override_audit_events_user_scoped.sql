-- Wave 3F UserScopedDb/RLS cutover 48: override_audit_events SELECT/INSERT for members (append-only).
-- UPDATE/DELETE stay revoked.

comment on table public.override_audit_events is
  'Wave 3F cutover 48: authenticated member SELECT/INSERT via private.user_has_company; UPDATE/DELETE not granted; service_role retained for named writers and support-grant.';

drop policy if exists override_audit_events_company on public.override_audit_events;
drop policy if exists override_audit_events_company_select on public.override_audit_events;
drop policy if exists override_audit_events_select_company on public.override_audit_events;
drop policy if exists override_audit_events_insert_company on public.override_audit_events;

create policy override_audit_events_select_company
  on public.override_audit_events
  for select to authenticated
  using (private.user_has_company(company_id));

create policy override_audit_events_insert_company
  on public.override_audit_events
  for insert to authenticated
  with check (private.user_has_company(company_id));

grant select, insert on table public.override_audit_events to authenticated;
revoke update, delete on table public.override_audit_events from authenticated;

grant all on table public.override_audit_events to service_role;
