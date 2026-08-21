-- Wave 3F UserScopedDb/RLS cutover 37: interest_submissions SELECT/INSERT/UPDATE for members.
-- Narrows prior FOR ALL company policy. DELETE stays revoked.
-- Website intake uses service-role (integration key); conversion side effects stay service-role.

comment on table public.interest_submissions is
  'Wave 3F cutover 37: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for integration intake, support-grant, and accept/reject conversion side effects.';

drop policy if exists interest_submissions_company on public.interest_submissions;
drop policy if exists interest_submissions_select_company on public.interest_submissions;
drop policy if exists interest_submissions_insert_company on public.interest_submissions;
drop policy if exists interest_submissions_update_company on public.interest_submissions;

create policy interest_submissions_select_company
  on public.interest_submissions
  for select to authenticated
  using (private.user_has_company(company_id));

create policy interest_submissions_insert_company
  on public.interest_submissions
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy interest_submissions_update_company
  on public.interest_submissions
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.interest_submissions to authenticated;
revoke delete on table public.interest_submissions from authenticated;

grant all on table public.interest_submissions to service_role;
