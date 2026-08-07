-- Phase 9: Executive security monitoring — append-only logs, alert store, tighter read policy.

create table if not exists public.security_alerts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  alert_code text not null,
  severity public.security_event_severity not null default 'attention',
  title text not null,
  summary text not null,
  status text not null default 'open'
    check (status in ('open', 'acknowledged', 'closed')),
  threshold_key text,
  evidence_event_ids uuid[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.users(id),
  closed_at timestamptz,
  closed_by uuid references public.users(id)
);

create index if not exists security_alerts_company_status_idx
  on public.security_alerts(company_id, status, created_at desc);

create index if not exists security_events_type_occurred_idx
  on public.security_events(event_type, occurred_at desc);

create index if not exists security_events_company_occurred_idx
  on public.security_events(company_id, occurred_at desc);

alter table public.security_alerts enable row level security;

drop policy if exists security_events_member on public.security_events;
drop policy if exists security_events_executive_aal2_read on public.security_events;
create policy security_events_executive_aal2_read
  on public.security_events
  as permissive
  for select
  to authenticated
  using (
    company_id is not null
    and private.current_session_is_aal2()
    and private.user_has_active_executive_access(company_id)
  );

drop policy if exists security_alerts_executive_aal2_read on public.security_alerts;
create policy security_alerts_executive_aal2_read
  on public.security_alerts
  as permissive
  for select
  to authenticated
  using (
    company_id is not null
    and private.current_session_is_aal2()
    and private.user_has_active_executive_access(company_id)
  );

revoke all on table public.security_alerts from authenticated, anon;
grant select on public.security_alerts to authenticated;
grant all on table public.security_alerts to service_role;

-- Append-only: ordinary clients and even service helpers must not rewrite history
-- through an accidental update path. Service role inserts only; mutations blocked.
create or replace function private.protect_security_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  raise exception 'security_events are append-only';
end;
$function$;

revoke all on function private.protect_security_event_mutation()
  from public, anon, authenticated;
grant execute on function private.protect_security_event_mutation()
  to service_role, postgres;

drop trigger if exists security_events_append_only on public.security_events;
create trigger security_events_append_only
before update or delete on public.security_events
for each row execute function private.protect_security_event_mutation();

create or replace function private.protect_security_alert_delete()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  raise exception 'security_alerts cannot be deleted; close them instead';
end;
$function$;

revoke all on function private.protect_security_alert_delete()
  from public, anon, authenticated;
grant execute on function private.protect_security_alert_delete()
  to service_role, postgres;

drop trigger if exists security_alerts_no_delete on public.security_alerts;
create trigger security_alerts_no_delete
before delete on public.security_alerts
for each row execute function private.protect_security_alert_delete();

comment on table public.security_alerts is
  'Phase 9 raised security alerts. Threshold evaluation is performed by command-api.';

comment on table public.security_events is
  'Append-only security audit. Readable only by AAL2 Executive members for their company.';
