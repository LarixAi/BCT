-- Wave 3F UserScopedDb/RLS cutover 91: command_page_snapshots SELECT/INSERT/UPDATE for members.
comment on table public.command_page_snapshots is
  'Wave 3F cutover 91: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted.';

drop policy if exists command_page_snapshots_company on public.command_page_snapshots;
drop policy if exists command_page_snapshots_company_select on public.command_page_snapshots;
drop policy if exists command_page_snapshots_select_company on public.command_page_snapshots;
drop policy if exists command_page_snapshots_insert_company on public.command_page_snapshots;
drop policy if exists command_page_snapshots_update_company on public.command_page_snapshots;
drop policy if exists command_page_snapshots_member on public.command_page_snapshots;

create policy command_page_snapshots_select_company
  on public.command_page_snapshots for select to authenticated
  using (private.user_has_company(company_id));

create policy command_page_snapshots_insert_company
  on public.command_page_snapshots for insert to authenticated
  with check (private.user_has_company(company_id));

create policy command_page_snapshots_update_company
  on public.command_page_snapshots for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.command_page_snapshots to authenticated;
revoke delete on table public.command_page_snapshots from authenticated;
grant all on table public.command_page_snapshots to service_role;
