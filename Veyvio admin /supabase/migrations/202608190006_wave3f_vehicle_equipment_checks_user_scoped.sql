-- Wave 3F UserScopedDb/RLS cutover 6: vehicle_equipment_checks INSERT + SELECT for members.
-- SELECT grant already exists from 202608170001. UPDATE/DELETE stay revoked.

comment on table public.vehicle_equipment_checks is
  'Wave 3F cutover 6: authenticated member SELECT/INSERT via private.user_has_company; UPDATE/DELETE not granted; service_role retained for support-grant.';

drop policy if exists vehicle_equipment_checks_insert_company on public.vehicle_equipment_checks;
create policy vehicle_equipment_checks_insert_company
  on public.vehicle_equipment_checks
  for insert to authenticated
  with check (private.user_has_company(company_id));

grant select, insert on table public.vehicle_equipment_checks to authenticated;
revoke update, delete on table public.vehicle_equipment_checks from authenticated;

grant all on table public.vehicle_equipment_checks to service_role;
