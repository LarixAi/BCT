-- Veyvio Executive Phase 4: narrow the application-access registry and keep
-- all RLS helpers outside PostgREST's exposed public schema.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to postgres, authenticated, service_role;

create or replace function private.current_session_is_aal2()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog
as $function$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$function$;

create or replace function private.user_owns_membership(
  target_company_id uuid,
  target_membership_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.company_memberships membership
    where membership.id = target_membership_id
      and membership.company_id = target_company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  );
$function$;

create or replace function private.user_has_company_permission(
  target_company_id uuid,
  target_permission_code text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.company_memberships membership
    cross join lateral unnest(membership.role_ids) as granted_role(granted_role_id)
    join public.role_permissions permission
      on permission.role_id = granted_role.granted_role_id
     and permission.permission_code = target_permission_code
     and permission.effect = 'allow'
    where membership.company_id = target_company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and not exists (
        select 1
        from unnest(membership.role_ids) as denied_role(denied_role_id)
        join public.role_permissions denied
          on denied.role_id = denied_role.denied_role_id
         and denied.permission_code = target_permission_code
         and denied.effect = 'deny'
      )
  );
$function$;

revoke all on function private.current_session_is_aal2()
  from public, anon;
revoke all on function private.user_owns_membership(uuid, uuid)
  from public, anon;
revoke all on function private.user_has_company_permission(uuid, text)
  from public, anon;

grant execute on function private.current_session_is_aal2()
  to authenticated, service_role, postgres;
grant execute on function private.user_owns_membership(uuid, uuid)
  to authenticated, service_role, postgres;
grant execute on function private.user_has_company_permission(uuid, text)
  to authenticated, service_role, postgres;

comment on function private.current_session_is_aal2() is
  'RLS-only helper. Requires a Supabase AAL2 JWT for direct authenticated reads.';
comment on function private.user_owns_membership(uuid, uuid) is
  'RLS-only membership ownership check; deliberately not exposed as a public RPC.';
comment on function private.user_has_company_permission(uuid, text) is
  'RLS-only role permission check; deliberately not exposed as a public RPC.';

alter table public.membership_application_access enable row level security;

drop policy if exists membership_application_access_member
  on public.membership_application_access;
drop policy if exists membership_application_access_narrow_read
  on public.membership_application_access;

create policy membership_application_access_narrow_read
on public.membership_application_access
as permissive
for select
to authenticated
using (
  private.current_session_is_aal2()
  and (
    private.user_owns_membership(company_id, membership_id)
    or private.user_has_company_permission(company_id, 'accounts.access.review')
  )
);

-- Mutations remain service-only and therefore pass through the authoritative
-- account workflow rather than the browser-facing Data API.
revoke insert, update, delete, truncate, references, trigger
  on public.membership_application_access from authenticated, anon;
grant select on public.membership_application_access to authenticated;
grant all on public.membership_application_access to service_role;

comment on policy membership_application_access_narrow_read
  on public.membership_application_access is
  'AAL2 users may read only their own grant or grants they are explicitly authorised to review.';
