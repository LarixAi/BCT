-- Storage RLS for Driver-app buckets (company-prefixed paths).

insert into storage.buckets (id, name, public)
values
  ('defect-photos', 'defect-photos', false),
  ('incident-evidence', 'incident-evidence', false),
  ('lost-property-photos', 'lost-property-photos', false),
  ('vehicle-documents', 'vehicle-documents', false)
on conflict (id) do update set public = excluded.public;

create or replace function private.storage_company_prefix(object_name text)
returns uuid
language sql
immutable
as $$
  select case
    when (storage.foldername(object_name))[1] ~* '^[0-9a-f-]{36}$'
      then ((storage.foldername(object_name))[1])::uuid
    when (storage.foldername(object_name))[1] = 'org'
      and (storage.foldername(object_name))[2] ~* '^[0-9a-f-]{36}$'
      then ((storage.foldername(object_name))[2])::uuid
    else null
  end;
$$;

do $$
declare
  bucket text;
  policy_select text;
  policy_insert text;
  policy_update text;
  policy_delete text;
begin
  foreach bucket in array array['defect-photos', 'incident-evidence', 'lost-property-photos', 'vehicle-documents']
  loop
    policy_select := bucket || '_authenticated_select';
    policy_insert := bucket || '_deny_authenticated_insert';
    policy_update := bucket || '_deny_authenticated_update';
    policy_delete := bucket || '_deny_authenticated_delete';

    execute format('drop policy if exists %I on storage.objects', policy_select);
    execute format($p$
      create policy %I on storage.objects
      for select to authenticated
      using (
        bucket_id = %L
        and private.storage_company_prefix(name) is not null
        and private.user_has_company(private.storage_company_prefix(name))
      )
    $p$, policy_select, bucket);

    execute format('drop policy if exists %I on storage.objects', policy_insert);
    execute format($p$
      create policy %I on storage.objects
      for insert to authenticated with check (false)
    $p$, policy_insert);

    execute format('drop policy if exists %I on storage.objects', policy_update);
    execute format($p$
      create policy %I on storage.objects
      for update to authenticated using (false)
    $p$, policy_update);

    execute format('drop policy if exists %I on storage.objects', policy_delete);
    execute format($p$
      create policy %I on storage.objects
      for delete to authenticated using (false)
    $p$, policy_delete);
  end loop;
end $$;
