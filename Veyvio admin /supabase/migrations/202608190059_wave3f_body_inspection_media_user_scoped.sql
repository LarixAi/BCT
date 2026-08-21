-- Wave 3F UserScopedDb/RLS cutover 59: body_inspection_media SELECT/INSERT/UPDATE for members.
-- DELETE stays revoked.

comment on table public.body_inspection_media is
  'Wave 3F cutover 59: authenticated member SELECT/INSERT/UPDATE via private.user_has_company; DELETE not granted; service_role retained for support-grant and uncutover callers.';

drop policy if exists body_inspection_media_company on public.body_inspection_media;
drop policy if exists body_inspection_media_company_select on public.body_inspection_media;
drop policy if exists body_inspection_media_select_company on public.body_inspection_media;
drop policy if exists body_inspection_media_insert_company on public.body_inspection_media;
drop policy if exists body_inspection_media_update_company on public.body_inspection_media;
drop policy if exists body_inspection_media_member on public.body_inspection_media;
drop policy if exists body_inspection_media_narrow_read on public.body_inspection_media;

create policy body_inspection_media_select_company
  on public.body_inspection_media
  for select to authenticated
  using (private.user_has_company(company_id));

create policy body_inspection_media_insert_company
  on public.body_inspection_media
  for insert to authenticated
  with check (private.user_has_company(company_id));

create policy body_inspection_media_update_company
  on public.body_inspection_media
  for update to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

grant select, insert, update on table public.body_inspection_media to authenticated;
revoke delete on table public.body_inspection_media from authenticated;

grant all on table public.body_inspection_media to service_role;
