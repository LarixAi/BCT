-- Wave 3F UserScopedDb/RLS cutover 31: vor_cases SELECT/UPDATE for members.
-- Create stays service-role (body-condition / privileged paths). DELETE stays revoked.

comment on table public.vor_cases is
  'Wave 3F cutover 31: authenticated member SELECT/UPDATE via private.user_has_company; INSERT/DELETE not granted; service_role retained for creates, support-grant, and uncutover callers.';

drop policy if exists vor_cases_company_select on public.vor_cases;
drop policy if exists vor_cases_select_company on public.vor_cases;
drop policy if exists vor_cases_update_company on public.vor_cases;

create policy vor_cases_select_company
  on public.vor_cases
  for select to authenticated
  using (private.user_has_company(company_id));

create policy vor_cases_update_company
  on public.vor_cases
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, update on table public.vor_cases to authenticated;
revoke insert, delete on table public.vor_cases from authenticated;

grant all on table public.vor_cases to service_role;
