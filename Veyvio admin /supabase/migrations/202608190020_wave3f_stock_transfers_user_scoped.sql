-- Wave 3F UserScopedDb/RLS cutover 20: stock_transfers SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.stock_transfers is
  'Wave 3F cutover 20: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists stock_transfers_company on public.stock_transfers;
drop policy if exists stock_transfers_select_company on public.stock_transfers;
drop policy if exists stock_transfers_insert_company on public.stock_transfers;
drop policy if exists stock_transfers_update_company on public.stock_transfers;

create policy stock_transfers_select_company
  on public.stock_transfers
  for select to authenticated
  using (private.user_has_company(company_id));

create policy stock_transfers_insert_company
  on public.stock_transfers
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy stock_transfers_update_company
  on public.stock_transfers
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.stock_transfers to authenticated;
revoke delete on table public.stock_transfers from authenticated;

grant all on table public.stock_transfers to service_role;
