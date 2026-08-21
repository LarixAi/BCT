-- Wave 3F UserScopedDb/RLS cutover 33: duty_acknowledgements SELECT/INSERT/UPDATE for members.
-- Narrows prior FOR ALL advisor policy. DELETE stays revoked.
-- Duties / duty_assignment_events / eligibility stay service-role in duty-publication.

comment on table public.duty_acknowledgements is
  'Wave 3F cutover 33: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant, seeds, and uncutover callers.';

drop policy if exists duty_acknowledgements_company on public.duty_acknowledgements;
drop policy if exists duty_acknowledgements_select_company on public.duty_acknowledgements;
drop policy if exists duty_acknowledgements_insert_company on public.duty_acknowledgements;
drop policy if exists duty_acknowledgements_update_company on public.duty_acknowledgements;

create policy duty_acknowledgements_select_company
  on public.duty_acknowledgements
  for select to authenticated
  using (private.user_has_company(company_id));

create policy duty_acknowledgements_insert_company
  on public.duty_acknowledgements
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy duty_acknowledgements_update_company
  on public.duty_acknowledgements
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.duty_acknowledgements to authenticated;
revoke delete on table public.duty_acknowledgements from authenticated;

grant all on table public.duty_acknowledgements to service_role;
