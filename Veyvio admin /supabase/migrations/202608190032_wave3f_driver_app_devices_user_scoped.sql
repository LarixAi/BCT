-- Wave 3F UserScopedDb/RLS cutover 32: driver_app_devices SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked. Distinct from FCM driver_devices (Type B / pushSender).
-- Audit + driver_app_accounts side effects stay service-role.

comment on table public.driver_app_devices is
  'Wave 3F cutover 32: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant, projections, and account/audit side effects.';

drop policy if exists driver_app_devices_company_select on public.driver_app_devices;
drop policy if exists driver_app_devices_select_company on public.driver_app_devices;
drop policy if exists driver_app_devices_insert_company on public.driver_app_devices;
drop policy if exists driver_app_devices_update_company on public.driver_app_devices;

create policy driver_app_devices_select_company
  on public.driver_app_devices
  for select to authenticated
  using (private.user_has_company(company_id));

create policy driver_app_devices_insert_company
  on public.driver_app_devices
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy driver_app_devices_update_company
  on public.driver_app_devices
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.driver_app_devices to authenticated;
revoke delete on table public.driver_app_devices from authenticated;

grant all on table public.driver_app_devices to service_role;
