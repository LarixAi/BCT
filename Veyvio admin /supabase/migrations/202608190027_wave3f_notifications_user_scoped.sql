-- Wave 3F UserScopedDb/RLS cutover 27: notifications INSERT for members.
-- Keep recipient-scoped SELECT (202607230006). UPDATE/DELETE stay revoked.
-- F-29 unchanged: notifications never create business state.

comment on table public.notifications is
  'Wave 3F cutover 27: authenticated member INSERT via private.user_has_company; SELECT remains recipient+company; UPDATE/DELETE not granted; service_role retained for no-JWT callers and support-grant.';

drop policy if exists notifications_insert_company on public.notifications;

create policy notifications_insert_company
  on public.notifications
  for insert to authenticated
  with check (private.user_has_company(company_id));

grant select, insert on table public.notifications to authenticated;
revoke update, delete on table public.notifications from authenticated;

grant all on table public.notifications to service_role;
