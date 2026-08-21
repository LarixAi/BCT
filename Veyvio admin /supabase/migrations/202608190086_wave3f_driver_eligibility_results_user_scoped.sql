-- Wave 3F UserScopedDb/RLS cutover 86: driver_eligibility_results SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.driver_eligibility_results is
  'Wave 3F cutover 86: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists driver_eligibility_results_company on public.driver_eligibility_results;
drop policy if exists driver_eligibility_results_company_select on public.driver_eligibility_results;
drop policy if exists driver_eligibility_results_select_company on public.driver_eligibility_results;
drop policy if exists driver_eligibility_results_insert_company on public.driver_eligibility_results;
drop policy if exists driver_eligibility_results_update_company on public.driver_eligibility_results;
drop policy if exists driver_eligibility_results_member on public.driver_eligibility_results;
drop policy if exists driver_eligibility_results_narrow_read on public.driver_eligibility_results;

create policy driver_eligibility_results_select_company
  on public.driver_eligibility_results
  for select to authenticated
  using (private.user_has_company(company_id));

create policy driver_eligibility_results_insert_company
  on public.driver_eligibility_results
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy driver_eligibility_results_update_company
  on public.driver_eligibility_results
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.driver_eligibility_results to authenticated;
revoke delete on table public.driver_eligibility_results from authenticated;

grant all on table public.driver_eligibility_results to service_role;
