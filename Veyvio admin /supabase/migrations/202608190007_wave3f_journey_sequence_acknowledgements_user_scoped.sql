-- Wave 3F UserScopedDb/RLS cutover 7: journey_sequence_acknowledgements SELECT/INSERT/UPDATE.
-- Replaces JWT-claim FOR ALL policy with private.user_has_company.
-- Duty/run lookups remain Command service-role. DELETE stays revoked.

comment on table public.journey_sequence_acknowledgements is
  'Wave 3F cutover 7: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; duty/run lookups stay service-role.';

drop policy if exists journey_sequence_acks_company on public.journey_sequence_acknowledgements;
drop policy if exists journey_sequence_acknowledgements_select_company on public.journey_sequence_acknowledgements;
drop policy if exists journey_sequence_acknowledgements_insert_company on public.journey_sequence_acknowledgements;
drop policy if exists journey_sequence_acknowledgements_update_company on public.journey_sequence_acknowledgements;

create policy journey_sequence_acknowledgements_select_company
  on public.journey_sequence_acknowledgements
  for select to authenticated
  using (private.user_has_company(company_id));

create policy journey_sequence_acknowledgements_insert_company
  on public.journey_sequence_acknowledgements
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy journey_sequence_acknowledgements_update_company
  on public.journey_sequence_acknowledgements
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.journey_sequence_acknowledgements to authenticated;
revoke delete on table public.journey_sequence_acknowledgements from authenticated;

grant all on table public.journey_sequence_acknowledgements to service_role;
