-- Wave 3F UserScopedDb/RLS cutover 36: driver_training SELECT/INSERT/UPDATE for members.
-- Narrows prior SELECT-only company policy. DELETE stays revoked.
-- driver_requirements / driver_app_accounts / drivers stay service-role side effects.

comment on table public.driver_training is
  'Wave 3F cutover 36: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant, driver-requirements ensure without JWT, and projections.';

drop policy if exists driver_training_company_select on public.driver_training;
drop policy if exists driver_training_select_company on public.driver_training;
drop policy if exists driver_training_insert_company on public.driver_training;
drop policy if exists driver_training_update_company on public.driver_training;

create policy driver_training_select_company
  on public.driver_training
  for select to authenticated
  using (private.user_has_company(company_id));

create policy driver_training_insert_company
  on public.driver_training
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy driver_training_update_company
  on public.driver_training
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.driver_training to authenticated;
revoke delete on table public.driver_training from authenticated;

grant all on table public.driver_training to service_role;
