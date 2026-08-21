-- Wave 3F UserScopedDb/RLS cutover 72: messages SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.messages is
  'Wave 3F cutover 72: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists messages_company on public.messages;
drop policy if exists messages_company_select on public.messages;
drop policy if exists messages_select_company on public.messages;
drop policy if exists messages_insert_company on public.messages;
drop policy if exists messages_update_company on public.messages;
drop policy if exists messages_member on public.messages;
drop policy if exists messages_narrow_read on public.messages;

create policy messages_select_company
  on public.messages
  for select to authenticated
  using (private.user_has_company(company_id));

create policy messages_insert_company
  on public.messages
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy messages_update_company
  on public.messages
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.messages to authenticated;
revoke delete on table public.messages from authenticated;

grant all on table public.messages to service_role;
