-- Wave 3F UserScopedDb/RLS cutover 9: incidents SELECT + UPDATE for authenticated members.
-- Incident create stays Command service-role (no authenticated INSERT). DELETE stays revoked.
-- Support-grant JWTs stay on companyScopedServiceDb.

comment on table public.incidents is
  'Wave 3F cutover 9: authenticated member SELECT/UPDATE via private.user_has_company; INSERT/DELETE not granted; service_role retained for creates and support-grant.';

drop policy if exists incidents_update_company on public.incidents;
create policy incidents_update_company
  on public.incidents
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, update on table public.incidents to authenticated;
revoke insert, delete on table public.incidents from authenticated;

grant all on table public.incidents to service_role;
