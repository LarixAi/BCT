-- Wave 3F UserScopedDb/RLS cutover 11: purchase_requests SELECT/INSERT/UPDATE for members.
-- 202608170002 stays SELECT-only. This additive GRANT is the write cutover.
-- Vehicles/depots lookups stay Command service-role. DELETE stays revoked.

comment on table public.purchase_requests is
  'Wave 3F cutover 11: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; vehicle/depot lookups stay service-role.';

drop policy if exists purchase_requests_company on public.purchase_requests;
drop policy if exists purchase_requests_select_company on public.purchase_requests;
drop policy if exists purchase_requests_insert_company on public.purchase_requests;
drop policy if exists purchase_requests_update_company on public.purchase_requests;

create policy purchase_requests_select_company
  on public.purchase_requests
  for select to authenticated
  using (private.user_has_company(company_id));

create policy purchase_requests_insert_company
  on public.purchase_requests
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy purchase_requests_update_company
  on public.purchase_requests
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.purchase_requests to authenticated;
revoke delete on table public.purchase_requests from authenticated;

grant all on table public.purchase_requests to service_role;
