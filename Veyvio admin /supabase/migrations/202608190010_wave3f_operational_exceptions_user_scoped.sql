-- Wave 3F UserScopedDb/RLS cutover 10: operational_exceptions SELECT/INSERT/UPDATE for members.
-- Events, user display names, and depot embeds stay Command service-role until those
-- tables are cut over. DELETE stays revoked. Defect automation still writes through
-- this module without a membership JWT (service-role insert).

comment on table public.operational_exceptions is
  'Wave 3F cutover 10: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; events/users lookups stay service-role.';

drop policy if exists operational_exceptions_company on public.operational_exceptions;
drop policy if exists operational_exceptions_company_select on public.operational_exceptions;
drop policy if exists operational_exceptions_select_company on public.operational_exceptions;
drop policy if exists operational_exceptions_insert_company on public.operational_exceptions;
drop policy if exists operational_exceptions_update_company on public.operational_exceptions;

create policy operational_exceptions_select_company
  on public.operational_exceptions
  for select to authenticated
  using (private.user_has_company(company_id));

create policy operational_exceptions_insert_company
  on public.operational_exceptions
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy operational_exceptions_update_company
  on public.operational_exceptions
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.operational_exceptions to authenticated;
revoke delete on table public.operational_exceptions from authenticated;

grant all on table public.operational_exceptions to service_role;
