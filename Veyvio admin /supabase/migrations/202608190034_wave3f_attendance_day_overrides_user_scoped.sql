-- Wave 3F UserScopedDb/RLS cutover 34: attendance_day_overrides SELECT/INSERT/UPDATE for members.
-- Narrows prior FOR ALL advisor policy. DELETE stays revoked.
-- Hub/profile/score reads stay service-role (companyId-only helpers).

comment on table public.attendance_day_overrides is
  'Wave 3F cutover 34: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and projection lookups.';

drop policy if exists attendance_day_overrides_company on public.attendance_day_overrides;
drop policy if exists attendance_day_overrides_select_company on public.attendance_day_overrides;
drop policy if exists attendance_day_overrides_insert_company on public.attendance_day_overrides;
drop policy if exists attendance_day_overrides_update_company on public.attendance_day_overrides;

create policy attendance_day_overrides_select_company
  on public.attendance_day_overrides
  for select to authenticated
  using (private.user_has_company(company_id));

create policy attendance_day_overrides_insert_company
  on public.attendance_day_overrides
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy attendance_day_overrides_update_company
  on public.attendance_day_overrides
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.attendance_day_overrides to authenticated;
revoke delete on table public.attendance_day_overrides from authenticated;

grant all on table public.attendance_day_overrides to service_role;
