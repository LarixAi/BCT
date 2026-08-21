-- Wave 3F UserScopedDb/RLS cutover 61: damage_observations SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.damage_observations is
  'Wave 3F cutover 61: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists damage_observations_company on public.damage_observations;
drop policy if exists damage_observations_company_select on public.damage_observations;
drop policy if exists damage_observations_select_company on public.damage_observations;
drop policy if exists damage_observations_insert_company on public.damage_observations;
drop policy if exists damage_observations_update_company on public.damage_observations;
drop policy if exists damage_observations_member on public.damage_observations;
drop policy if exists damage_observations_narrow_read on public.damage_observations;

create policy damage_observations_select_company
  on public.damage_observations
  for select to authenticated
  using (private.user_has_company(company_id));

create policy damage_observations_insert_company
  on public.damage_observations
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy damage_observations_update_company
  on public.damage_observations
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.damage_observations to authenticated;
revoke delete on table public.damage_observations from authenticated;

grant all on table public.damage_observations to service_role;
