-- Security Advisor hardening:
-- 1) Explicit search_path on mutable helper functions
-- 2) Restrict EXECUTE on SECURITY DEFINER / privileged helpers
-- 3) driver-documents: keep Edge/service-role writes; block authenticated direct mutations
--
-- Auth dashboard (not SQL): enable Leaked Password Protection (HaveIBeenPwned)
-- under Authentication → Attack Protection.

-- ---------------------------------------------------------------------------
-- Helper functions — search_path
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  new.version = coalesce(old.version, 0) + 1;
  return new;
end;
$$;

create or replace function public.current_user_id()
returns uuid
language sql
stable
set search_path = public
as $$
  select nullif(auth.uid()::text, '')::uuid;
$$;

create or replace function public.jwt_company_ids()
returns uuid[]
language sql
stable
set search_path = public
as $$
  select coalesce(
    (
      select array_agg(value::uuid)
      from jsonb_array_elements_text(
        coalesce(auth.jwt() -> 'app_metadata' -> 'company_ids', '[]'::jsonb)
      ) as value
    ),
    '{}'::uuid[]
  );
$$;

create or replace function public.jwt_active_company_id()
returns uuid
language sql
stable
set search_path = public
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'active_company_id', '')::uuid;
$$;

create or replace function public.ensure_default_company_roles(p_company_id uuid, p_actor uuid)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  owner_role_id uuid;
  role_name text;
  role_id uuid;
begin
  for role_name in
    select unnest(array[
      'company_owner',
      'company_administrator',
      'transport_manager',
      'dispatcher',
      'yard_manager',
      'driver',
      'compliance_manager',
      'safeguarding_lead',
      'read_only_auditor'
    ])
  loop
    insert into public.roles (company_id, name, description, is_system_role, created_by, updated_by, source_app)
    values (
      p_company_id,
      role_name,
      replace(role_name, '_', ' '),
      true,
      p_actor,
      p_actor,
      'COMMAND'
    )
    on conflict (company_id, name) do update set updated_at = timezone('utc', now())
    returning id into role_id;

    if role_name = 'company_owner' then
      owner_role_id := role_id;
    end if;
  end loop;

  insert into public.role_permissions (role_id, permission_code, effect)
  select owner_role_id, p.code, 'allow'
  from public.permissions p
  on conflict do nothing;

  insert into public.company_security_policies (company_id)
  values (p_company_id)
  on conflict (company_id) do nothing;

  insert into public.company_subscriptions (company_id, status)
  values (p_company_id, 'trial')
  on conflict (company_id) do nothing;

  return owner_role_id;
end;
$$;

-- Keep SECURITY DEFINER + search_path (required to avoid RLS recursion).
create or replace function public.user_has_company(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.company_memberships m
    where m.user_id = auth.uid()
      and m.company_id = target_company_id
      and m.status = 'active'
  )
  or target_company_id = any (public.jwt_company_ids());
$function$;

-- Event-trigger helper already present on hosted projects — reassert locked path.
create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  cmd record;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
  loop
    if cmd.schema_name is not null
      and cmd.schema_name in ('public')
      and cmd.schema_name not in ('pg_catalog', 'information_schema')
      and cmd.schema_name not like 'pg_toast%'
      and cmd.schema_name not like 'pg_temp%'
    then
      begin
        execute format('alter table if exists %s enable row level security', cmd.object_identity);
        raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      exception
        when others then
          raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      end;
    else
      raise log 'rls_auto_enable: skip % (schema %)', cmd.object_identity, cmd.schema_name;
    end if;
  end loop;
end;
$function$;

-- ---------------------------------------------------------------------------
-- EXECUTE grants
-- ---------------------------------------------------------------------------
revoke all on function public.set_updated_at() from public;
revoke all on function public.current_user_id() from public;
revoke all on function public.jwt_company_ids() from public;
revoke all on function public.jwt_active_company_id() from public;
revoke all on function public.ensure_default_company_roles(uuid, uuid) from public;
revoke all on function public.user_has_company(uuid) from public;
revoke all on function public.rls_auto_enable() from public;

grant execute on function public.set_updated_at() to postgres, service_role;
grant execute on function public.current_user_id() to authenticated, service_role;
grant execute on function public.jwt_company_ids() to authenticated, service_role;
grant execute on function public.jwt_active_company_id() to authenticated, service_role;
grant execute on function public.user_has_company(uuid) to authenticated, service_role;
grant execute on function public.ensure_default_company_roles(uuid, uuid) to service_role;
-- Event trigger runs as owner/superuser; clients must not call it.
grant execute on function public.rls_auto_enable() to postgres;

-- ---------------------------------------------------------------------------
-- driver-documents storage stance
-- Uploads remain Command API / service_role. Authenticated clients cannot
-- insert/update/delete objects directly. Optional company-scoped select if
-- object path starts with '{company_id}/'.
-- ---------------------------------------------------------------------------
drop policy if exists driver_documents_authenticated_select on storage.objects;
drop policy if exists driver_documents_deny_authenticated_insert on storage.objects;
drop policy if exists driver_documents_deny_authenticated_update on storage.objects;
drop policy if exists driver_documents_deny_authenticated_delete on storage.objects;

create policy driver_documents_authenticated_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'driver-documents'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.user_has_company(((storage.foldername(name))[1])::uuid)
);

-- Explicit deny for authenticated mutations (service_role bypasses RLS).
create policy driver_documents_deny_authenticated_insert
on storage.objects
for insert
to authenticated
with check (false);

create policy driver_documents_deny_authenticated_update
on storage.objects
for update
to authenticated
using (false)
with check (false);

create policy driver_documents_deny_authenticated_delete
on storage.objects
for delete
to authenticated
using (false);

comment on function public.jwt_active_company_id() is
  'Returns app_metadata.active_company_id from the JWT. Used by RLS helpers.';
