-- Clear Security Advisor: "Signed-in Users Can Execute SECURITY DEFINER Function"
-- on public.user_has_company.
--
-- The function MUST remain SECURITY DEFINER (RLS recursion on company_memberships).
-- Fix: move it to a non-API schema (`private`) so PostgREST cannot expose
-- /rest/v1/rpc/user_has_company, then point all RLS policies at private.user_has_company.
-- Authenticated still needs EXECUTE for policy evaluation — that is not an API surface.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to postgres, authenticated, service_role;

create or replace function private.user_has_company(target_company_id uuid)
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

revoke all on function private.user_has_company(uuid) from public, anon;
grant execute on function private.user_has_company(uuid) to authenticated, service_role, postgres;

comment on function private.user_has_company(uuid) is
  'RLS helper (SECURITY DEFINER). Not in PostgREST exposed schemas — use only from policies.';

-- Rewrite policies that reference public/bare user_has_company → private.user_has_company
do $$
declare
  r record;
  new_qual text;
  new_with_check text;
  role_list text;
  cmd text;
  permissive text;
  sql text;
begin
  for r in
    select *
    from pg_policies
    where (qual ilike '%user_has_company%' or with_check ilike '%user_has_company%')
  loop
    new_qual := r.qual;
    new_with_check := r.with_check;

    if new_qual is not null then
      new_qual := replace(new_qual, 'public.user_has_company', 'private.user_has_company');
      new_qual := replace(new_qual, 'user_has_company(', 'private.user_has_company(');
      new_qual := replace(new_qual, 'private.private.user_has_company', 'private.user_has_company');
    end if;

    if new_with_check is not null then
      new_with_check := replace(new_with_check, 'public.user_has_company', 'private.user_has_company');
      new_with_check := replace(new_with_check, 'user_has_company(', 'private.user_has_company(');
      new_with_check := replace(new_with_check, 'private.private.user_has_company', 'private.user_has_company');
    end if;

    -- Skip rewrite if already private-only / unchanged
    if new_qual is not distinct from r.qual and new_with_check is not distinct from r.with_check then
      continue;
    end if;

    role_list := array_to_string(
      array(select quote_ident(x) from unnest(coalesce(r.roles, array['public']::name[])) as x),
      ', '
    );
    if role_list is null or role_list = '' then
      role_list := 'public';
    end if;

    cmd := upper(r.cmd);
    if cmd = 'ALL' then
      cmd := 'ALL';
    elsif cmd not in ('SELECT', 'INSERT', 'UPDATE', 'DELETE') then
      cmd := 'ALL';
    end if;

    permissive := case when r.permissive = 'RESTRICTIVE' then 'RESTRICTIVE' else 'PERMISSIVE' end;

    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);

    sql := format(
      'create policy %I on %I.%I as %s for %s to %s',
      r.policyname,
      r.schemaname,
      r.tablename,
      permissive,
      cmd,
      role_list
    );

    if new_qual is not null then
      sql := sql || format(' using (%s)', new_qual);
    end if;
    if new_with_check is not null then
      sql := sql || format(' with check (%s)', new_with_check);
    end if;

    execute sql;
  end loop;
end;
$$;

-- Remove the public SECURITY DEFINER RPC surface
drop function if exists public.user_has_company(uuid);

-- Convenience alias for SQL authors (INVOKER → private DEFINER). Not required by RLS.
-- Intentionally omitted so PostgREST has no public.user_has_company RPC.
