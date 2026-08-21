-- Wave 3F first UserScopedDb/RLS cutover: duty_closeouts INSERT + SELECT for authenticated members.
-- Do not edit released Wave 3F migrations (202608170001–004). Writes on all other tenant tables stay Command/service-role.
-- Support-grant JWTs are not company members; Command keeps those closeouts on companyScopedServiceDb.

comment on table public.duty_closeouts is
  'Wave 3F cutover 1: authenticated member SELECT/INSERT via private.user_has_company; UPDATE/DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists duty_closeouts_insert_company on public.duty_closeouts;
create policy duty_closeouts_insert_company
  on public.duty_closeouts
  for insert to authenticated
  with check (private.user_has_company(company_id));

grant select, insert on table public.duty_closeouts to authenticated;
revoke update, delete on table public.duty_closeouts from authenticated;

grant all on table public.duty_closeouts to service_role;
