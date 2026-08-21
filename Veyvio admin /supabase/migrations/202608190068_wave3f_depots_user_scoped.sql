-- Wave 3F UserScopedDb/RLS cutover 68: depots SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.depots is
  'Wave 3F cutover 68: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists depots_company on public.depots;
drop policy if exists depots_company_select on public.depots;
drop policy if exists depots_select_company on public.depots;
drop policy if exists depots_insert_company on public.depots;
drop policy if exists depots_update_company on public.depots;
drop policy if exists depots_member on public.depots;
drop policy if exists depots_narrow_read on public.depots;

create policy depots_select_company
  on public.depots
  for select to authenticated
  using (private.user_has_company(company_id));

create policy depots_insert_company
  on public.depots
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy depots_update_company
  on public.depots
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.depots to authenticated;
revoke delete on table public.depots from authenticated;

grant all on table public.depots to service_role;
