-- Wave 3F UserScopedDb/RLS cutover 70: driver_documents SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.driver_documents is
  'Wave 3F cutover 70: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists driver_documents_company on public.driver_documents;
drop policy if exists driver_documents_company_select on public.driver_documents;
drop policy if exists driver_documents_select_company on public.driver_documents;
drop policy if exists driver_documents_insert_company on public.driver_documents;
drop policy if exists driver_documents_update_company on public.driver_documents;
drop policy if exists driver_documents_member on public.driver_documents;
drop policy if exists driver_documents_narrow_read on public.driver_documents;

create policy driver_documents_select_company
  on public.driver_documents
  for select to authenticated
  using (private.user_has_company(company_id));

create policy driver_documents_insert_company
  on public.driver_documents
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy driver_documents_update_company
  on public.driver_documents
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.driver_documents to authenticated;
revoke delete on table public.driver_documents from authenticated;

grant all on table public.driver_documents to service_role;
