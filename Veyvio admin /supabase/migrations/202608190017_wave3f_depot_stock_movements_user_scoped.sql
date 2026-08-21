-- Wave 3F UserScopedDb/RLS cutover 17: depot_stock_movements SELECT/INSERT for members.
-- Append-only. 202608170002 stays SELECT-only. UPDATE/DELETE stay revoked.

comment on table public.depot_stock_movements is
  'Wave 3F cutover 17: authenticated member SELECT/INSERT via private.user_has_company; UPDATE/DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists depot_stock_movements_company on public.depot_stock_movements;
drop policy if exists depot_stock_movements_select_company on public.depot_stock_movements;
drop policy if exists depot_stock_movements_insert_company on public.depot_stock_movements;

create policy depot_stock_movements_select_company
  on public.depot_stock_movements
  for select to authenticated
  using (private.user_has_company(company_id));

create policy depot_stock_movements_insert_company
  on public.depot_stock_movements
  for insert to authenticated
  with check (private.user_has_company(company_id));

grant select, insert on table public.depot_stock_movements to authenticated;
revoke update, delete on table public.depot_stock_movements from authenticated;

grant all on table public.depot_stock_movements to service_role;
