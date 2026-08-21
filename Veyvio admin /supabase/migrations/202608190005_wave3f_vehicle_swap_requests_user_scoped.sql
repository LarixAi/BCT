-- Wave 3F UserScopedDb/RLS cutover 5: vehicle_swap_requests SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked. Duties vehicle_id mutation on approve remains Command service-role
-- until duties are cut over. Support-grant JWTs stay on companyScopedServiceDb.

comment on table public.vehicle_swap_requests is
  'Wave 3F cutover 5: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; duty row updates stay service-role.';

drop policy if exists vehicle_swap_requests_insert_company on public.vehicle_swap_requests;
create policy vehicle_swap_requests_insert_company
  on public.vehicle_swap_requests
  for insert to authenticated
  with check (private.user_has_company(company_id));

drop policy if exists vehicle_swap_requests_update_company on public.vehicle_swap_requests;
create policy vehicle_swap_requests_update_company
  on public.vehicle_swap_requests
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.vehicle_swap_requests to authenticated;
revoke delete on table public.vehicle_swap_requests from authenticated;

grant all on table public.vehicle_swap_requests to service_role;
