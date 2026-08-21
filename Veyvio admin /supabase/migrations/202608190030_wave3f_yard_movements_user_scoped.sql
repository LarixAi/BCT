-- Wave 3F UserScopedDb/RLS cutover 30: yard_movements SELECT/INSERT for members.
-- UPDATE/DELETE stay revoked. Vehicles and audit_events stay service-role.

comment on table public.yard_movements is
  'Wave 3F cutover 30: authenticated member SELECT/INSERT via private.user_has_company; UPDATE/DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists yard_movements_company_select on public.yard_movements;
drop policy if exists yard_movements_select_company on public.yard_movements;
drop policy if exists yard_movements_insert_company on public.yard_movements;

create policy yard_movements_select_company
  on public.yard_movements
  for select to authenticated
  using (private.user_has_company(company_id));

create policy yard_movements_insert_company
  on public.yard_movements
  for insert to authenticated
  with check (private.user_has_company(company_id));

grant select, insert on table public.yard_movements to authenticated;
revoke update, delete on table public.yard_movements from authenticated;

grant all on table public.yard_movements to service_role;
