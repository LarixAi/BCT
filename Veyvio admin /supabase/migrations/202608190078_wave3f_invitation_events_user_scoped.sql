-- Wave 3F UserScopedDb/RLS cutover 78: invitation_events SELECT/INSERT via parent invitation company.
-- No company_id column; UPDATE/DELETE stay revoked.

comment on table public.invitation_events is
  'Wave 3F cutover 78: authenticated member SELECT/INSERT when parent invitation is in company; UPDATE/DELETE not granted.';

drop policy if exists invitation_events_company on public.invitation_events;
drop policy if exists invitation_events_select_company on public.invitation_events;
drop policy if exists invitation_events_insert_company on public.invitation_events;
drop policy if exists invitation_events_company_select on public.invitation_events;

create policy invitation_events_select_company
  on public.invitation_events
  for select to authenticated
  using (
    exists (
      select 1 from public.invitations i
      where i.id = invitation_id and private.user_has_company(i.company_id)
    )
  );

create policy invitation_events_insert_company
  on public.invitation_events
  for insert to authenticated
  with check (
    exists (
      select 1 from public.invitations i
      where i.id = invitation_id and private.user_has_company(i.company_id)
    )
  );

grant select, insert on table public.invitation_events to authenticated;
revoke update, delete on table public.invitation_events from authenticated;

grant all on table public.invitation_events to service_role;
