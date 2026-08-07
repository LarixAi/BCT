-- Veyvio Executive Phase 5: typed sensitive-action requests, independent
-- approvals, AAL2 direct-read backstops and append-only decision evidence.

create table if not exists public.executive_sensitive_action_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  action_type text not null check (action_type in (
    'executive_administrator_change',
    'director_or_officer_change',
    'annual_budget_approval',
    'company_policy_publication',
    'restricted_export',
    'bank_authority_change',
    'support_access_change',
    'security_settings_change',
    'company_closure_or_deletion'
  )),
  target_type text not null,
  target_id text,
  status text not null default 'pending_approval'
    check (status in ('pending_approval', 'approved', 'rejected', 'cancelled', 'executed', 'expired')),
  reason text not null check (char_length(btrim(reason)) between 10 and 2000),
  evidence_references jsonb not null
    check (
      jsonb_typeof(evidence_references) = 'array'
      and jsonb_array_length(evidence_references) > 0
    ),
  before_snapshot jsonb not null check (jsonb_typeof(before_snapshot) = 'object'),
  proposed_snapshot jsonb not null check (jsonb_typeof(proposed_snapshot) = 'object'),
  proposer_user_id uuid not null references public.users(id),
  proposer_membership_id uuid not null references public.company_memberships(id),
  proposer_roles text[] not null default '{}',
  proposer_session_id uuid not null references public.user_sessions(id),
  request_correlation_id text not null,
  decision_user_id uuid references public.users(id),
  decision_session_id uuid references public.user_sessions(id),
  decision_reason text,
  decision_correlation_id text,
  required_independent_approvals smallint not null default 1
    check (required_independent_approvals between 1 and 3),
  approved_at timestamptz,
  rejected_at timestamptz,
  executed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists executive_sensitive_actions_company_status_idx
  on public.executive_sensitive_action_requests(company_id, status, created_at desc);

create table if not exists public.executive_sensitive_action_approvals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  request_id uuid not null
    references public.executive_sensitive_action_requests(id) on delete cascade,
  approver_user_id uuid not null references public.users(id),
  approver_membership_id uuid not null references public.company_memberships(id),
  approver_roles text[] not null default '{}',
  approver_session_id uuid not null references public.user_sessions(id),
  decision text not null check (decision in ('approved', 'rejected')),
  reason text not null check (char_length(btrim(reason)) between 5 and 2000),
  request_correlation_id text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique(request_id, approver_user_id)
);

create index if not exists executive_sensitive_approvals_company_request_idx
  on public.executive_sensitive_action_approvals(company_id, request_id, created_at);

alter table public.executive_sensitive_action_requests enable row level security;
alter table public.executive_sensitive_action_approvals enable row level security;

create or replace function private.user_has_active_executive_access(
  target_company_id uuid
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
    join public.membership_application_access access
      on access.company_id = membership.company_id
     and access.membership_id = membership.id
     and access.app_type = 'EXECUTIVE'
     and access.status = 'active'
    where membership.company_id = target_company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  );
$function$;

revoke all on function private.user_has_active_executive_access(uuid)
  from public, anon;
grant execute on function private.user_has_active_executive_access(uuid)
  to authenticated, service_role, postgres;

comment on function private.user_has_active_executive_access(uuid) is
  'RLS-only Executive application grant check; deliberately not exposed as a public RPC.';

do $policy$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array[
    'executive_board_meetings',
    'executive_decisions',
    'executive_policies',
    'executive_company_records',
    'executive_conflicts',
    'executive_budget_mandates',
    'executive_sensitive_action_requests',
    'executive_sensitive_action_approvals'
  ]
  loop
    policy_name := table_name || '_aal2_read';
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I on public.%I', policy_name, table_name);
    execute format(
      'create policy %I on public.%I as permissive for select to authenticated using (private.current_session_is_aal2() and private.user_has_active_executive_access(company_id))',
      policy_name,
      table_name
    );
    execute format(
      'revoke insert, update, delete, truncate, references, trigger on public.%I from authenticated, anon',
      table_name
    );
    execute format('grant select on public.%I to authenticated', table_name);
    execute format('grant all on public.%I to service_role', table_name);
  end loop;
end;
$policy$;

create or replace function private.reject_append_only_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  raise exception 'This evidence record is append-only';
end;
$function$;

revoke all on function private.reject_append_only_mutation()
  from public, anon, authenticated;
grant execute on function private.reject_append_only_mutation()
  to service_role, postgres;

drop trigger if exists audit_events_append_only_guard on public.audit_events;
create trigger audit_events_append_only_guard
before update or delete on public.audit_events
for each row execute function private.reject_append_only_mutation();

drop trigger if exists executive_sensitive_approvals_append_only_guard
  on public.executive_sensitive_action_approvals;
create trigger executive_sensitive_approvals_append_only_guard
before update or delete on public.executive_sensitive_action_approvals
for each row execute function private.reject_append_only_mutation();

comment on table public.executive_sensitive_action_requests is
  'Server-only Phase 5 proposals containing reason, evidence references and immutable before/proposed snapshots.';
comment on table public.executive_sensitive_action_approvals is
  'Append-only independent approval or rejection evidence for an Executive sensitive-action request.';

create or replace function private.validate_executive_sensitive_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  requested_at timestamptz := timezone('utc', now());
begin
  if not exists (
    select 1
      from public.company_memberships membership
      join public.membership_application_access access
        on access.membership_id = membership.id
       and access.company_id = membership.company_id
       and access.app_type = 'EXECUTIVE'
       and access.status = 'active'
     where membership.id = new.proposer_membership_id
       and membership.company_id = new.company_id
       and membership.user_id = new.proposer_user_id
       and membership.status = 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = 'Proposer does not have active Executive access for this company';
  end if;

  if not exists (
    select 1
      from public.user_sessions session
     where session.id = new.proposer_session_id
       and session.active_company_id = new.company_id
       and session.user_id = new.proposer_user_id
       and session.membership_id = new.proposer_membership_id
       and session.auth_strength in (
         'password_mfa',
         'passkey',
         'phishing_resistant_mfa'
       )
       and session.revoked_at is null
       and session.expires_at > requested_at
       and session.created_at >= requested_at - interval '10 minutes'
  ) then
    raise exception using
      errcode = '23514',
      message = 'A recent AAL2 Executive session is required';
  end if;

  return new;
end;
$function$;

revoke all on function private.validate_executive_sensitive_request()
  from public, anon, authenticated;
grant execute on function private.validate_executive_sensitive_request()
  to service_role, postgres;

drop trigger if exists executive_sensitive_request_validate
  on public.executive_sensitive_action_requests;
create trigger executive_sensitive_request_validate
before insert on public.executive_sensitive_action_requests
for each row execute function private.validate_executive_sensitive_request();

create or replace function private.protect_executive_sensitive_request()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  if row(
    new.company_id,
    new.action_type,
    new.target_type,
    new.target_id,
    new.reason,
    new.evidence_references,
    new.before_snapshot,
    new.proposed_snapshot,
    new.proposer_user_id,
    new.proposer_membership_id,
    new.proposer_roles,
    new.proposer_session_id,
    new.request_correlation_id,
    new.required_independent_approvals,
    new.created_at
  ) is distinct from row(
    old.company_id,
    old.action_type,
    old.target_type,
    old.target_id,
    old.reason,
    old.evidence_references,
    old.before_snapshot,
    old.proposed_snapshot,
    old.proposer_user_id,
    old.proposer_membership_id,
    old.proposer_roles,
    old.proposer_session_id,
    old.request_correlation_id,
    old.required_independent_approvals,
    old.created_at
  ) then
    raise exception 'Sensitive-action proposal evidence is immutable';
  end if;
  return new;
end;
$function$;

revoke all on function private.protect_executive_sensitive_request()
  from public, anon, authenticated;
grant execute on function private.protect_executive_sensitive_request()
  to service_role, postgres;

drop trigger if exists executive_sensitive_request_protect
  on public.executive_sensitive_action_requests;
create trigger executive_sensitive_request_protect
before update on public.executive_sensitive_action_requests
for each row execute function private.protect_executive_sensitive_request();

create or replace function private.apply_executive_sensitive_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  target_request public.executive_sensitive_action_requests%rowtype;
  decided_at timestamptz := timezone('utc', now());
begin
  select *
    into target_request
    from public.executive_sensitive_action_requests
   where id = new.request_id
   for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'Sensitive action request does not exist';
  end if;
  if target_request.company_id <> new.company_id then
    raise exception using
      errcode = '23514',
      message = 'Approval company does not match the request company';
  end if;
  if target_request.status <> 'pending_approval' then
    raise exception using
      errcode = 'P0001',
      message = 'Sensitive action request is no longer awaiting approval';
  end if;
  if target_request.proposer_user_id = new.approver_user_id then
    raise exception using
      errcode = '23514',
      message = 'The proposer cannot approve their own request';
  end if;

  if not exists (
    select 1
      from public.company_memberships membership
      join public.membership_application_access access
        on access.membership_id = membership.id
       and access.company_id = membership.company_id
       and access.app_type = 'EXECUTIVE'
       and access.status = 'active'
     where membership.id = new.approver_membership_id
       and membership.company_id = new.company_id
       and membership.user_id = new.approver_user_id
       and membership.status = 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = 'Approver membership is not active for this company';
  end if;

  if not exists (
    select 1
      from public.company_memberships membership
      join public.roles role
        on role.company_id = membership.company_id
       and role.id = any(membership.role_ids)
     where membership.id = new.approver_membership_id
       and lower(role.name) in ('director', 'board_member')
  ) then
    raise exception using
      errcode = '23514',
      message = 'An independent director or board member must approve this request';
  end if;

  if not exists (
    select 1
      from public.user_sessions session
     where session.id = new.approver_session_id
       and session.active_company_id = new.company_id
       and session.user_id = new.approver_user_id
       and session.membership_id = new.approver_membership_id
       and session.auth_strength in (
         'password_mfa',
         'passkey',
         'phishing_resistant_mfa'
       )
       and session.revoked_at is null
       and session.expires_at > decided_at
       and session.created_at >= decided_at - interval '10 minutes'
  ) then
    raise exception using
      errcode = '23514',
      message = 'A recent AAL2 Executive session is required';
  end if;

  update public.executive_sensitive_action_requests
     set status = case when new.decision = 'approved' then 'approved' else 'rejected' end,
         decision_user_id = new.approver_user_id,
         decision_session_id = new.approver_session_id,
         decision_reason = new.reason,
         decision_correlation_id = new.request_correlation_id,
         approved_at = case when new.decision = 'approved' then decided_at else null end,
         rejected_at = case when new.decision = 'rejected' then decided_at else null end,
         updated_at = decided_at
   where id = target_request.id;

  return new;
end;
$function$;

revoke all on function private.apply_executive_sensitive_decision()
  from public, anon, authenticated;
grant execute on function private.apply_executive_sensitive_decision()
  to service_role, postgres;

drop trigger if exists executive_sensitive_approval_apply
  on public.executive_sensitive_action_approvals;
create trigger executive_sensitive_approval_apply
before insert on public.executive_sensitive_action_approvals
for each row execute function private.apply_executive_sensitive_decision();

create or replace function private.audit_executive_sensitive_action()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if tg_table_name = 'executive_sensitive_action_approvals' then
    insert into public.audit_events (
      company_id,
      actor_type,
      actor_id,
      action,
      entity_type,
      entity_id,
      source_app,
      after_snapshot,
      reason,
      correlation_id
    ) values (
      new.company_id,
      'user',
      new.approver_user_id,
      'executive.sensitive_action.' || new.decision,
      'executive_sensitive_action_request',
      new.request_id::text,
      'EXECUTIVE',
      to_jsonb(new),
      new.reason,
      new.request_correlation_id
    );
    return new;
  end if;

  if tg_op = 'INSERT' then
    insert into public.audit_events (
      company_id,
      actor_type,
      actor_id,
      action,
      entity_type,
      entity_id,
      source_app,
      after_snapshot,
      reason,
      correlation_id
    ) values (
      new.company_id,
      'user',
      new.proposer_user_id,
      'executive.sensitive_action.requested',
      'executive_sensitive_action_request',
      new.id::text,
      'EXECUTIVE',
      to_jsonb(new),
      new.reason,
      new.request_correlation_id
    );
    return new;
  end if;

  insert into public.audit_events (
    company_id,
    actor_type,
    actor_id,
    action,
    entity_type,
    entity_id,
    source_app,
    before_snapshot,
    after_snapshot,
    reason,
    correlation_id
  ) values (
    new.company_id,
    'user',
    coalesce(new.decision_user_id, new.proposer_user_id, old.proposer_user_id),
    'executive.sensitive_action.status_changed',
    'executive_sensitive_action_request',
    new.id::text,
    'EXECUTIVE',
    to_jsonb(old),
    to_jsonb(new),
    coalesce(new.decision_reason, new.reason),
    coalesce(new.decision_correlation_id, new.request_correlation_id)
  );
  return new;
end;
$function$;

revoke all on function private.audit_executive_sensitive_action()
  from public, anon, authenticated;
grant execute on function private.audit_executive_sensitive_action()
  to service_role, postgres;

drop trigger if exists executive_sensitive_request_audit
  on public.executive_sensitive_action_requests;
create trigger executive_sensitive_request_audit
after insert or update on public.executive_sensitive_action_requests
for each row execute function private.audit_executive_sensitive_action();

drop trigger if exists executive_sensitive_approval_audit
  on public.executive_sensitive_action_approvals;
create trigger executive_sensitive_approval_audit
after insert on public.executive_sensitive_action_approvals
for each row execute function private.audit_executive_sensitive_action();
