-- Wave 3F UserScopedDb/RLS cutover 21: vehicle_consumable_levels SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked. Vehicle lookups stay Command service-role.

comment on table public.vehicle_consumable_levels is
  'Wave 3F cutover 21: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists vehicle_consumable_levels_company on public.vehicle_consumable_levels;
drop policy if exists vehicle_consumable_levels_select_company on public.vehicle_consumable_levels;
drop policy if exists vehicle_consumable_levels_insert_company on public.vehicle_consumable_levels;
drop policy if exists vehicle_consumable_levels_update_company on public.vehicle_consumable_levels;

create policy vehicle_consumable_levels_select_company
  on public.vehicle_consumable_levels
  for select to authenticated
  using (private.user_has_company(company_id));

create policy vehicle_consumable_levels_insert_company
  on public.vehicle_consumable_levels
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy vehicle_consumable_levels_update_company
  on public.vehicle_consumable_levels
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.vehicle_consumable_levels to authenticated;
revoke delete on table public.vehicle_consumable_levels from authenticated;

grant all on table public.vehicle_consumable_levels to service_role;
