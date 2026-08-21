-- Wave 3F UserScopedDb/RLS cutover 63: inspection_reviews SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.inspection_reviews is
  'Wave 3F cutover 63: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists inspection_reviews_company on public.inspection_reviews;
drop policy if exists inspection_reviews_company_select on public.inspection_reviews;
drop policy if exists inspection_reviews_select_company on public.inspection_reviews;
drop policy if exists inspection_reviews_insert_company on public.inspection_reviews;
drop policy if exists inspection_reviews_update_company on public.inspection_reviews;
drop policy if exists inspection_reviews_member on public.inspection_reviews;
drop policy if exists inspection_reviews_narrow_read on public.inspection_reviews;

create policy inspection_reviews_select_company
  on public.inspection_reviews
  for select to authenticated
  using (private.user_has_company(company_id));

create policy inspection_reviews_insert_company
  on public.inspection_reviews
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy inspection_reviews_update_company
  on public.inspection_reviews
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.inspection_reviews to authenticated;
revoke delete on table public.inspection_reviews from authenticated;

grant all on table public.inspection_reviews to service_role;
