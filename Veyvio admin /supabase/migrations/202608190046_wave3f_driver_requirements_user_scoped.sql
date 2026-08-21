-- Wave 3F UserScopedDb/RLS cutover 46: driver_requirements SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.driver_requirements is
  'Wave 3F cutover 46: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and companyId-only helpers.';

drop policy if exists driver_requirements_company on public.driver_requirements;
drop policy if exists driver_requirements_company_select on public.driver_requirements;
drop policy if exists driver_requirements_select_company on public.driver_requirements;
drop policy if exists driver_requirements_insert_company on public.driver_requirements;
drop policy if exists driver_requirements_update_company on public.driver_requirements;

create policy driver_requirements_select_company
  on public.driver_requirements
  for select to authenticated
  using (private.user_has_company(company_id));

create policy driver_requirements_insert_company
  on public.driver_requirements
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy driver_requirements_update_company
  on public.driver_requirements
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.driver_requirements to authenticated;
revoke delete on table public.driver_requirements from authenticated;

grant all on table public.driver_requirements to service_role;
