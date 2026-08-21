-- Wave 3F UserScopedDb/RLS cutover 76: duty_live_positions SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.duty_live_positions is
  'Wave 3F cutover 76: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists duty_live_positions_company on public.duty_live_positions;
drop policy if exists duty_live_positions_company_select on public.duty_live_positions;
drop policy if exists duty_live_positions_select_company on public.duty_live_positions;
drop policy if exists duty_live_positions_insert_company on public.duty_live_positions;
drop policy if exists duty_live_positions_update_company on public.duty_live_positions;
drop policy if exists duty_live_positions_member on public.duty_live_positions;
drop policy if exists duty_live_positions_narrow_read on public.duty_live_positions;

create policy duty_live_positions_select_company
  on public.duty_live_positions
  for select to authenticated
  using (private.user_has_company(company_id));

create policy duty_live_positions_insert_company
  on public.duty_live_positions
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy duty_live_positions_update_company
  on public.duty_live_positions
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.duty_live_positions to authenticated;
revoke delete on table public.duty_live_positions from authenticated;

grant all on table public.duty_live_positions to service_role;
