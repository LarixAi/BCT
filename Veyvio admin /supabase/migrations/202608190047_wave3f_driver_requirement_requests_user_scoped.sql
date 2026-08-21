-- Wave 3F UserScopedDb/RLS cutover 47: driver_requirement_requests SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.driver_requirement_requests is
  'Wave 3F cutover 47: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and companyId-only helpers.';

drop policy if exists driver_requirement_requests_company on public.driver_requirement_requests;
drop policy if exists driver_requirement_requests_company_select on public.driver_requirement_requests;
drop policy if exists driver_requirement_requests_select_company on public.driver_requirement_requests;
drop policy if exists driver_requirement_requests_insert_company on public.driver_requirement_requests;
drop policy if exists driver_requirement_requests_update_company on public.driver_requirement_requests;

create policy driver_requirement_requests_select_company
  on public.driver_requirement_requests
  for select to authenticated
  using (private.user_has_company(company_id));

create policy driver_requirement_requests_insert_company
  on public.driver_requirement_requests
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy driver_requirement_requests_update_company
  on public.driver_requirement_requests
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.driver_requirement_requests to authenticated;
revoke delete on table public.driver_requirement_requests from authenticated;

grant all on table public.driver_requirement_requests to service_role;
