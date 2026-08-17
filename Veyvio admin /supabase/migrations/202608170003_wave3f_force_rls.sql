-- Wave 3F FORCE RLS expansion (FIX-P0-011 remediation item 2).
-- ENABLE RLS without FORCE lets the table owner skip policies. postgres and
-- service_role keep BYPASSRLS (Command API / migrations unchanged). FORCE
-- constrains non-bypass roles, including a future Cost Control BFF role that
-- uses SET LOCAL app.active_organisation_id.
--
-- Two explicit branches:
--   A) Command public tables: FORCE on every relation that already has RLS.
--   B) cost_control: BFF/service-role boundary until 3G. FORCE + revoke
--      authenticated/anon PostgREST. Do NOT bind JWT claims into
--      app.active_organisation_id.

-- ---------------------------------------------------------------------------
-- Branch A — Command: FORCE existing RLS
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select n.nspname, c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'r'
      and n.nspname = 'public'
      and c.relrowsecurity
      and not c.relforcerowsecurity
  loop
    execute format('alter table %I.%I force row level security', r.nspname, r.relname);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Branch B — cost_control: BFF / service-role until organisation_id (3G)
-- Finance API (Edge) continues via service_role (BYPASSRLS). Authenticated
-- PostgREST is not an access path. GUC policies remain for a future
-- non-bypass role that SET LOCAL after privileged membership lookup.
-- ---------------------------------------------------------------------------

comment on schema cost_control is
  'Wave 3F branch B: Cost Control BFF/service-role boundary until 3G. Authenticated PostgREST revoked. Isolation is SET LOCAL app.active_organisation_id on a non-bypass role, not JWT-controlled GUCs.';

do $$
declare
  r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'r'
      and n.nspname = 'cost_control'
  loop
    execute format('alter table cost_control.%I enable row level security', r.relname);
    execute format('alter table cost_control.%I force row level security', r.relname);
    execute format('revoke all on table cost_control.%I from authenticated, anon', r.relname);
    execute format('grant all on table cost_control.%I to postgres, service_role', r.relname);
  end loop;
end $$;

alter default privileges in schema cost_control
  revoke all on tables from authenticated, anon;

revoke usage on schema cost_control from authenticated, anon;
grant usage on schema cost_control to postgres, service_role;
