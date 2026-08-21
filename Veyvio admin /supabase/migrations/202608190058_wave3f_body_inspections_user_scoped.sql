-- Wave 3F UserScopedDb/RLS cutover 58: body_inspections SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.body_inspections is
  'Wave 3F cutover 58: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists body_inspections_company on public.body_inspections;
drop policy if exists body_inspections_company_select on public.body_inspections;
drop policy if exists body_inspections_select_company on public.body_inspections;
drop policy if exists body_inspections_insert_company on public.body_inspections;
drop policy if exists body_inspections_update_company on public.body_inspections;
drop policy if exists body_inspections_member on public.body_inspections;
drop policy if exists body_inspections_narrow_read on public.body_inspections;

create policy body_inspections_select_company
  on public.body_inspections
  for select to authenticated
  using (private.user_has_company(company_id));

create policy body_inspections_insert_company
  on public.body_inspections
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy body_inspections_update_company
  on public.body_inspections
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.body_inspections to authenticated;
revoke delete on table public.body_inspections from authenticated;

grant all on table public.body_inspections to service_role;
