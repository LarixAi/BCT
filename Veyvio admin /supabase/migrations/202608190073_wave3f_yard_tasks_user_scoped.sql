-- Wave 3F UserScopedDb/RLS cutover 73: yard_tasks SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.yard_tasks is
  'Wave 3F cutover 73: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists yard_tasks_company on public.yard_tasks;
drop policy if exists yard_tasks_company_select on public.yard_tasks;
drop policy if exists yard_tasks_select_company on public.yard_tasks;
drop policy if exists yard_tasks_insert_company on public.yard_tasks;
drop policy if exists yard_tasks_update_company on public.yard_tasks;
drop policy if exists yard_tasks_member on public.yard_tasks;
drop policy if exists yard_tasks_narrow_read on public.yard_tasks;

create policy yard_tasks_select_company
  on public.yard_tasks
  for select to authenticated
  using (private.user_has_company(company_id));

create policy yard_tasks_insert_company
  on public.yard_tasks
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy yard_tasks_update_company
  on public.yard_tasks
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.yard_tasks to authenticated;
revoke delete on table public.yard_tasks from authenticated;

grant all on table public.yard_tasks to service_role;
