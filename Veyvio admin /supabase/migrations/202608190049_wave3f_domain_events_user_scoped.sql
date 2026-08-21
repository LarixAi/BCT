-- Wave 3F UserScopedDb/RLS cutover 49: domain_events SELECT/INSERT for members (append-only).
-- UPDATE/DELETE stay revoked.

comment on table public.domain_events is
  'Wave 3F cutover 49: authenticated member SELECT/INSERT via private.user_has_company; UPDATE/DELETE not granted; service_role retained for named writers and support-grant.';

drop policy if exists domain_events_company on public.domain_events;
drop policy if exists domain_events_company_select on public.domain_events;
drop policy if exists domain_events_select_company on public.domain_events;
drop policy if exists domain_events_insert_company on public.domain_events;

create policy domain_events_select_company
  on public.domain_events
  for select to authenticated
  using (private.user_has_company(company_id));

create policy domain_events_insert_company
  on public.domain_events
  for insert to authenticated
  with check (private.user_has_company(company_id));

grant select, insert on table public.domain_events to authenticated;
revoke update, delete on table public.domain_events from authenticated;

grant all on table public.domain_events to service_role;
