-- Wave 3F UserScopedDb/RLS cutover 19: fuel_card_events SELECT/INSERT for members.
-- Append-only. UPDATE/DELETE stay revoked.

comment on table public.fuel_card_events is
  'Wave 3F cutover 19: authenticated member SELECT/INSERT via private.user_has_company; UPDATE/DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists fuel_card_events_company on public.fuel_card_events;
drop policy if exists fuel_card_events_select_company on public.fuel_card_events;
drop policy if exists fuel_card_events_insert_company on public.fuel_card_events;

create policy fuel_card_events_select_company
  on public.fuel_card_events
  for select to authenticated
  using (private.user_has_company(company_id));

create policy fuel_card_events_insert_company
  on public.fuel_card_events
  for insert to authenticated
  with check (private.user_has_company(company_id));

grant select, insert on table public.fuel_card_events to authenticated;
revoke update, delete on table public.fuel_card_events from authenticated;

grant all on table public.fuel_card_events to service_role;
