-- Wave 3F UserScopedDb/RLS cutover 64: condition_acknowledgements SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.condition_acknowledgements is
  'Wave 3F cutover 64: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists condition_acknowledgements_company on public.condition_acknowledgements;
drop policy if exists condition_acknowledgements_company_select on public.condition_acknowledgements;
drop policy if exists condition_acknowledgements_select_company on public.condition_acknowledgements;
drop policy if exists condition_acknowledgements_insert_company on public.condition_acknowledgements;
drop policy if exists condition_acknowledgements_update_company on public.condition_acknowledgements;
drop policy if exists condition_acknowledgements_member on public.condition_acknowledgements;
drop policy if exists condition_acknowledgements_narrow_read on public.condition_acknowledgements;

create policy condition_acknowledgements_select_company
  on public.condition_acknowledgements
  for select to authenticated
  using (private.user_has_company(company_id));

create policy condition_acknowledgements_insert_company
  on public.condition_acknowledgements
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy condition_acknowledgements_update_company
  on public.condition_acknowledgements
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.condition_acknowledgements to authenticated;
revoke delete on table public.condition_acknowledgements from authenticated;

grant all on table public.condition_acknowledgements to service_role;
