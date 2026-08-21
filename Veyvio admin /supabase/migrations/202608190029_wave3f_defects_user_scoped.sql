-- Wave 3F UserScopedDb/RLS cutover 29: defects SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked. Vehicles / VOR / yard_movements / audit_events stay service-role.

comment on table public.defects is
  'Wave 3F cutover 29: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists defects_authenticated_select on public.defects;
drop policy if exists defects_company_select on public.defects;
drop policy if exists defects_select_company on public.defects;
drop policy if exists defects_insert_company on public.defects;
drop policy if exists defects_update_company on public.defects;
drop policy if exists defects_company on public.defects;

create policy defects_select_company
  on public.defects
  for select to authenticated
  using (private.user_has_company(company_id));

create policy defects_insert_company
  on public.defects
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy defects_update_company
  on public.defects
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.defects to authenticated;
revoke delete on table public.defects from authenticated;

grant all on table public.defects to service_role;
