-- Wave 3F UserScopedDb/RLS cutover 18: fuel_cards SELECT/INSERT/UPDATE for members.
-- Events stay Command service-role until a later cutover. DELETE stays revoked.

comment on table public.fuel_cards is
  'Wave 3F cutover 18: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; fuel_card_events stay service-role.';

drop policy if exists fuel_cards_company on public.fuel_cards;
drop policy if exists fuel_cards_select_company on public.fuel_cards;
drop policy if exists fuel_cards_insert_company on public.fuel_cards;
drop policy if exists fuel_cards_update_company on public.fuel_cards;

create policy fuel_cards_select_company
  on public.fuel_cards
  for select to authenticated
  using (private.user_has_company(company_id));

create policy fuel_cards_insert_company
  on public.fuel_cards
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy fuel_cards_update_company
  on public.fuel_cards
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.fuel_cards to authenticated;
revoke delete on table public.fuel_cards from authenticated;

grant all on table public.fuel_cards to service_role;
