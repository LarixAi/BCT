-- Wave 3F UserScopedDb/RLS cutover 3: fuel_records INSERT + SELECT for authenticated members.
-- Do not edit released Wave 3F migrations (202608170001–004) or cutovers 1–2.
-- Support-grant JWTs are not company members; Command keeps those writes on companyScopedServiceDb.
-- UPDATE/DELETE stay revoked — fuel records are append-only from this path.
-- vehicle lookup and vehicle_reports mirror remain service-role until those tables are cut over.

comment on table public.fuel_records is
  'Wave 3F cutover 3: authenticated member SELECT/INSERT via private.user_has_company; UPDATE/DELETE not granted; service_role retained for support-grant and vehicle_reports mirror.';

drop policy if exists fuel_records_insert_company on public.fuel_records;
create policy fuel_records_insert_company
  on public.fuel_records
  for insert to authenticated
  with check (private.user_has_company(company_id));

grant select, insert on table public.fuel_records to authenticated;
revoke update, delete on table public.fuel_records from authenticated;

grant all on table public.fuel_records to service_role;
