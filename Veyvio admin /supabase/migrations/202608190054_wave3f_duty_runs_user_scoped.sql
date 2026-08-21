-- Wave 3F UserScopedDb/RLS cutover 54: duty_runs SELECT/INSERT via parent duty company.
-- No company_id column; UPDATE/DELETE stay revoked (delete used by duty republish stays service-role).

comment on table public.duty_runs is
  'Wave 3F cutover 54: authenticated member SELECT/INSERT when parent duty is in company; UPDATE/DELETE not granted to authenticated.';

drop policy if exists duty_runs_company_select on public.duty_runs;
drop policy if exists duty_runs_select_company on public.duty_runs;
drop policy if exists duty_runs_insert_company on public.duty_runs;

create policy duty_runs_select_company
  on public.duty_runs
  for select to authenticated
  using (
    exists (
      select 1 from public.duties d
      where d.id = duty_id and private.user_has_company(d.company_id)
    )
  );

create policy duty_runs_insert_company
  on public.duty_runs
  for insert to authenticated
  with check (
    exists (
      select 1 from public.duties d
      where d.id = duty_id and private.user_has_company(d.company_id)
    )
  );

grant select, insert on table public.duty_runs to authenticated;
revoke update, delete on table public.duty_runs from authenticated;

grant all on table public.duty_runs to service_role;
