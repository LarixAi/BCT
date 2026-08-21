-- Wave 3F UserScopedDb/RLS cutover 55: runs SELECT/INSERT/UPDATE for members.
-- Extends cutover 28 (SELECT/UPDATE only) with INSERT. DELETE stays revoked.

comment on table public.runs is
  'Wave 3F cutover 28+55: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists runs_company on public.runs;
drop policy if exists runs_company_select on public.runs;
drop policy if exists runs_select_company on public.runs;
drop policy if exists runs_insert_company on public.runs;
drop policy if exists runs_update_company on public.runs;

create policy runs_select_company
  on public.runs
  for select to authenticated
  using (private.user_has_company(company_id));

create policy runs_insert_company
  on public.runs
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy runs_update_company
  on public.runs
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.runs to authenticated;
revoke delete on table public.runs from authenticated;

grant all on table public.runs to service_role;
