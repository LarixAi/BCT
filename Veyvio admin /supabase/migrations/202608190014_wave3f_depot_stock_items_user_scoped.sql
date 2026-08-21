-- Wave 3F UserScopedDb/RLS cutover 14: depot_stock_items SELECT/INSERT/UPDATE for members.
-- 202608170002 stays SELECT-only. Movements stay Command service-role. DELETE stays revoked.

comment on table public.depot_stock_items is
  'Wave 3F cutover 14: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; movements/fuel cards/transfers stay service-role.';

drop policy if exists depot_stock_items_company on public.depot_stock_items;
drop policy if exists depot_stock_items_select_company on public.depot_stock_items;
drop policy if exists depot_stock_items_insert_company on public.depot_stock_items;
drop policy if exists depot_stock_items_update_company on public.depot_stock_items;

create policy depot_stock_items_select_company
  on public.depot_stock_items
  for select to authenticated
  using (private.user_has_company(company_id));

create policy depot_stock_items_insert_company
  on public.depot_stock_items
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy depot_stock_items_update_company
  on public.depot_stock_items
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.depot_stock_items to authenticated;
revoke delete on table public.depot_stock_items from authenticated;

grant all on table public.depot_stock_items to service_role;
