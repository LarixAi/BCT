-- Wave 3F UserScopedDb/RLS cutover 15: equipment_asset_events SELECT/INSERT for members.
-- Append-only. 202608170002 stays SELECT-only. UPDATE/DELETE stay revoked.

comment on table public.equipment_asset_events is
  'Wave 3F cutover 15: authenticated member SELECT/INSERT via private.user_has_company; UPDATE/DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists equipment_asset_events_company on public.equipment_asset_events;
drop policy if exists equipment_asset_events_select_company on public.equipment_asset_events;
drop policy if exists equipment_asset_events_insert_company on public.equipment_asset_events;

create policy equipment_asset_events_select_company
  on public.equipment_asset_events
  for select to authenticated
  using (private.user_has_company(company_id));

create policy equipment_asset_events_insert_company
  on public.equipment_asset_events
  for insert to authenticated
  with check (private.user_has_company(company_id));

grant select, insert on table public.equipment_asset_events to authenticated;
revoke update, delete on table public.equipment_asset_events from authenticated;

grant all on table public.equipment_asset_events to service_role;
