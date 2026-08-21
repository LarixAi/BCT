-- Wave 3F UserScopedDb/RLS cutover 12: equipment_assets SELECT/INSERT/UPDATE for members.
-- 202608170002 stays SELECT-only. Events stay Command service-role. DELETE stays revoked.

comment on table public.equipment_assets is
  'Wave 3F cutover 12: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; events/vehicle/depot lookups stay service-role.';

drop policy if exists equipment_assets_company on public.equipment_assets;
drop policy if exists equipment_assets_select_company on public.equipment_assets;
drop policy if exists equipment_assets_insert_company on public.equipment_assets;
drop policy if exists equipment_assets_update_company on public.equipment_assets;

create policy equipment_assets_select_company
  on public.equipment_assets
  for select to authenticated
  using (private.user_has_company(company_id));

create policy equipment_assets_insert_company
  on public.equipment_assets
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy equipment_assets_update_company
  on public.equipment_assets
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.equipment_assets to authenticated;
revoke delete on table public.equipment_assets from authenticated;

grant all on table public.equipment_assets to service_role;
