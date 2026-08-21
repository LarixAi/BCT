-- Wave 3F UserScopedDb/RLS cutover 65: drivers SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.drivers is
  'Wave 3F cutover 65: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists drivers_company on public.drivers;
drop policy if exists drivers_company_select on public.drivers;
drop policy if exists drivers_select_company on public.drivers;
drop policy if exists drivers_insert_company on public.drivers;
drop policy if exists drivers_update_company on public.drivers;
drop policy if exists drivers_member on public.drivers;
drop policy if exists drivers_narrow_read on public.drivers;

create policy drivers_select_company
  on public.drivers
  for select to authenticated
  using (private.user_has_company(company_id));

create policy drivers_insert_company
  on public.drivers
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy drivers_update_company
  on public.drivers
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.drivers to authenticated;
revoke delete on table public.drivers from authenticated;

grant all on table public.drivers to service_role;
