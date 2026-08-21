-- Wave 3F UserScopedDb/RLS cutover 52: duties SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.duties is
  'Wave 3F cutover 52: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists duties_company on public.duties;
drop policy if exists duties_company_select on public.duties;
drop policy if exists duties_select_company on public.duties;
drop policy if exists duties_insert_company on public.duties;
drop policy if exists duties_update_company on public.duties;

create policy duties_select_company
  on public.duties
  for select to authenticated
  using (private.user_has_company(company_id));

create policy duties_insert_company
  on public.duties
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy duties_update_company
  on public.duties
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.duties to authenticated;
revoke delete on table public.duties from authenticated;

grant all on table public.duties to service_role;
