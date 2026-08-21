-- Wave 3F UserScopedDb/RLS cutover 28: runs SELECT/UPDATE for members.
-- Create stays Command service-role (no authenticated INSERT). DELETE stays revoked.
-- Journey start/complete updates lifecycle via UserScopedDb.

comment on table public.runs is
  'Wave 3F cutover 28: authenticated member SELECT/UPDATE via private.user_has_company; INSERT/DELETE not granted; service_role retained for creates, support-grant, and uncutover callers.';

drop policy if exists runs_select_company on public.runs;
drop policy if exists runs_company_select on public.runs;
drop policy if exists runs_update_company on public.runs;

create policy runs_select_company
  on public.runs
  for select to authenticated
  using (private.user_has_company(company_id));

create policy runs_update_company
  on public.runs
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, update on table public.runs to authenticated;
revoke insert, delete on table public.runs from authenticated;

grant all on table public.runs to service_role;
