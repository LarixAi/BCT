-- Phase 5 typed execution for non-budget sensitive actions + Phase 4 RLS evidence helpers.
-- Annual-budget execution remains in 202607300007/009. This migration executes the other
-- eight action types on independent approval and records an immutable outcome ledger.

create table if not exists public.executive_sensitive_execution_outcomes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  request_id uuid not null unique
    references public.executive_sensitive_action_requests(id) on delete cascade,
  action_type text not null,
  target_type text not null,
  target_id text,
  outcome jsonb not null default '{}'::jsonb,
  executed_at timestamptz not null default timezone('utc', now()),
  executed_by_user_id uuid not null references public.users(id),
  decision_session_id uuid references public.user_sessions(id),
  request_correlation_id text
);

create index if not exists executive_sensitive_execution_outcomes_company_idx
  on public.executive_sensitive_execution_outcomes(company_id, executed_at desc);

alter table public.executive_sensitive_execution_outcomes enable row level security;

drop policy if exists executive_sensitive_execution_outcomes_aal2_read
  on public.executive_sensitive_execution_outcomes;
create policy executive_sensitive_execution_outcomes_aal2_read
  on public.executive_sensitive_execution_outcomes
  as permissive
  for select
  to authenticated
  using (
    private.current_session_is_aal2()
    and private.user_has_active_executive_access(company_id)
  );

revoke all on table public.executive_sensitive_execution_outcomes from authenticated, anon;
grant select on public.executive_sensitive_execution_outcomes to authenticated;
grant all on public.executive_sensitive_execution_outcomes to service_role;

create or replace function private.protect_executive_sensitive_execution_outcome()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  raise exception 'Executive sensitive-action execution outcomes are append-only';
end;
$function$;

revoke all on function private.protect_executive_sensitive_execution_outcome()
  from public, anon, authenticated;
grant execute on function private.protect_executive_sensitive_execution_outcome()
  to service_role, postgres;

drop trigger if exists executive_sensitive_execution_outcomes_append_only
  on public.executive_sensitive_execution_outcomes;
create trigger executive_sensitive_execution_outcomes_append_only
before update or delete on public.executive_sensitive_execution_outcomes
for each row execute function private.protect_executive_sensitive_execution_outcome();

create table if not exists public.executive_security_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  source_request_id uuid references public.executive_sensitive_action_requests(id),
  updated_by uuid references public.users(id),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.executive_security_settings enable row level security;

drop policy if exists executive_security_settings_aal2_read
  on public.executive_security_settings;
create policy executive_security_settings_aal2_read
  on public.executive_security_settings
  as permissive
  for select
  to authenticated
  using (
    private.current_session_is_aal2()
    and private.user_has_active_executive_access(company_id)
  );

revoke all on table public.executive_security_settings from authenticated, anon;
grant select on public.executive_security_settings to authenticated;
grant all on public.executive_security_settings to service_role;

-- Strengthen existing Executive domain/sensitive-action SELECT policies with an
-- explicit comment that they are deny-by-default AAL2+Executive gates (Postgres
-- PERMISSIVE policies with a tight USING clause). Recreate so remote and local match.
do $policies$
declare
  table_name text;
begin
  foreach table_name in array array[
    'executive_board_meetings',
    'executive_decisions',
    'executive_policies',
    'executive_company_records',
    'executive_conflicts',
    'executive_budget_mandates',
    'executive_sensitive_action_requests',
    'executive_sensitive_action_approvals',
    'executive_annual_budgets'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', table_name || '_aal2_read', table_name);
    execute format(
      'create policy %I on public.%I as permissive for select to authenticated using (private.current_session_is_aal2() and private.user_has_active_executive_access(company_id))',
      table_name || '_aal2_read',
      table_name
    );
  end loop;
end;
$policies$;

create or replace function private.execute_executive_typed_sensitive_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  decided_at timestamptz := timezone('utc', now());
  outcome jsonb := '{}'::jsonb;
  proposed jsonb := coalesce(new.proposed_snapshot, '{}'::jsonb);
  membership_id uuid;
  target_user_id uuid;
  role_names text[];
  resolved_role_ids uuid[];
  access_level text;
  mandate_id uuid;
  grant_id uuid;
  export_id uuid;
  expires_at timestamptz;
  settings jsonb;
begin
  -- Annual budget has its own typed executor.
  if old.target_type = 'executive_annual_budget'
     or old.action_type = 'annual_budget_approval' then
    return new;
  end if;

  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if old.status = 'pending_approval' and new.status = 'rejected' then
    return new;
  end if;

  if not (old.status = 'pending_approval' and new.status = 'approved') then
    return new;
  end if;

  if new.executed_at is not null then
    return new;
  end if;

  case old.action_type
    when 'company_policy_publication' then
      if old.target_type <> 'executive_policy' or old.target_id is null then
        raise exception using errcode = '23514', message = 'Policy publication requires an executive_policy target';
      end if;
      update public.executive_policies
         set status = 'approved',
             approved_at = decided_at,
             updated_at = decided_at,
             updated_by = new.decision_user_id
       where id = old.target_id::uuid
         and company_id = old.company_id
         and status in ('draft', 'in_review');
      if not found then
        raise exception using errcode = 'P0001', message = 'Policy target is missing or not publishable';
      end if;
      outcome := jsonb_build_object(
        'policyId', old.target_id,
        'status', 'approved',
        'approvedAt', decided_at
      );

    when 'executive_administrator_change' then
      membership_id := nullif(proposed->>'membershipId', '')::uuid;
      access_level := coalesce(nullif(proposed->>'accessLevel', ''), 'admin');
      if access_level not in ('member', 'manager', 'admin', 'oversight') then
        raise exception using errcode = '23514', message = 'Administrator accessLevel is invalid';
      end if;
      if membership_id is null then
        raise exception using errcode = '23514', message = 'Administrator change requires membershipId';
      end if;
      if not exists (
        select 1
          from public.company_memberships membership
         where membership.id = membership_id
           and membership.company_id = old.company_id
           and membership.status = 'active'
      ) then
        raise exception using errcode = '23514', message = 'Administrator membership is not active for this company';
      end if;
      insert into public.membership_application_access (
        membership_id,
        company_id,
        app_type,
        access_level,
        status,
        granted_at,
        granted_by
      )
      values (
        membership_id,
        old.company_id,
        'EXECUTIVE',
        access_level,
        'active',
        decided_at,
        new.decision_user_id
      )
      on conflict (membership_id, app_type)
      do update
         set access_level = excluded.access_level,
             status = 'active',
             granted_at = decided_at,
             granted_by = new.decision_user_id;
      outcome := jsonb_build_object(
        'membershipId', membership_id,
        'appType', 'EXECUTIVE',
        'accessLevel', access_level,
        'status', 'active'
      );

    when 'director_or_officer_change' then
      membership_id := nullif(proposed->>'membershipId', '')::uuid;
      role_names := array(
        select distinct lower(trim(value))
          from jsonb_array_elements_text(coalesce(proposed->'roleNames', '[]'::jsonb)) as value
         where trim(value) <> ''
      );
      if membership_id is null or coalesce(cardinality(role_names), 0) = 0 then
        raise exception using errcode = '23514', message = 'Director change requires membershipId and roleNames';
      end if;
      select array_agg(role.id)
        into resolved_role_ids
        from public.roles role
       where role.company_id = old.company_id
         and lower(role.name) = any(role_names)
         and role.status = 'active';
      if coalesce(cardinality(resolved_role_ids), 0) = 0 then
        raise exception using errcode = '23514', message = 'Director change roleNames did not resolve';
      end if;
      update public.company_memberships membership
         set role_ids = (
               select array_agg(distinct merged.role_id)
                 from (
                   select unnest(membership.role_ids) as role_id
                   union
                   select unnest(resolved_role_ids)
                 ) merged
             ),
             updated_at = decided_at,
             updated_by = new.decision_user_id
       where membership.id = membership_id
         and membership.company_id = old.company_id
         and membership.status = 'active';
      if not found then
        raise exception using errcode = 'P0001', message = 'Director change membership is missing';
      end if;
      outcome := jsonb_build_object(
        'membershipId', membership_id,
        'addedRoleNames', to_jsonb(role_names),
        'addedRoleIds', to_jsonb(resolved_role_ids)
      );

    when 'restricted_export' then
      insert into public.data_export_jobs (
        company_id,
        requested_by,
        export_type,
        status,
        started_at
      )
      values (
        old.company_id,
        old.proposer_user_id,
        coalesce(nullif(proposed->>'exportType', ''), 'executive_restricted'),
        'authorised',
        decided_at
      )
      returning id into export_id;
      outcome := jsonb_build_object(
        'exportJobId', export_id,
        'exportType', coalesce(nullif(proposed->>'exportType', ''), 'executive_restricted'),
        'status', 'authorised'
      );

    when 'bank_authority_change' then
      mandate_id := nullif(coalesce(old.target_id, proposed->>'mandateId'), '')::uuid;
      if mandate_id is null then
        insert into public.executive_budget_mandates (
          company_id,
          title,
          authority_role,
          limit_amount_minor,
          currency,
          status,
          notes,
          created_by,
          updated_by
        )
        values (
          old.company_id,
          coalesce(nullif(proposed->>'title', ''), 'Board-approved bank authority'),
          coalesce(nullif(proposed->>'authorityRole', ''), 'finance_director'),
          nullif(proposed->>'limitAmountMinor', '')::bigint,
          coalesce(nullif(proposed->>'currency', ''), 'GBP'),
          'active',
          coalesce(nullif(proposed->>'notes', ''), old.reason),
          new.decision_user_id,
          new.decision_user_id
        )
        returning id into mandate_id;
      else
        update public.executive_budget_mandates
           set title = coalesce(nullif(proposed->>'title', ''), title),
               authority_role = coalesce(nullif(proposed->>'authorityRole', ''), authority_role),
               limit_amount_minor = coalesce(nullif(proposed->>'limitAmountMinor', '')::bigint, limit_amount_minor),
               currency = coalesce(nullif(proposed->>'currency', ''), currency),
               status = coalesce(nullif(proposed->>'status', ''), 'active'),
               notes = coalesce(nullif(proposed->>'notes', ''), notes),
               updated_by = new.decision_user_id,
               updated_at = decided_at
         where id = mandate_id
           and company_id = old.company_id;
        if not found then
          raise exception using errcode = 'P0001', message = 'Bank authority mandate is missing';
        end if;
      end if;
      outcome := jsonb_build_object('mandateId', mandate_id, 'status', 'active');

    when 'support_access_change' then
      target_user_id := nullif(proposed->>'granteeUserId', '')::uuid;
      access_level := coalesce(nullif(proposed->>'accessLevel', ''), 'read_only');
      expires_at := coalesce(
        nullif(proposed->>'expiresAt', '')::timestamptz,
        decided_at + interval '4 hours'
      );
      if target_user_id is null then
        raise exception using errcode = '23514', message = 'Support access requires granteeUserId';
      end if;
      if expires_at <= decided_at or expires_at > decided_at + interval '72 hours' then
        raise exception using errcode = '23514', message = 'Support access expiry must be within 72 hours';
      end if;
      insert into public.privileged_access_grants (
        company_id,
        grantee_user_id,
        granted_by,
        reason,
        ticket_reference,
        access_level,
        starts_at,
        expires_at
      )
      values (
        old.company_id,
        target_user_id,
        new.decision_user_id,
        old.reason,
        nullif(proposed->>'ticketReference', ''),
        access_level,
        decided_at,
        expires_at
      )
      returning id into grant_id;
      outcome := jsonb_build_object(
        'grantId', grant_id,
        'granteeUserId', target_user_id,
        'accessLevel', access_level,
        'expiresAt', expires_at
      );

    when 'security_settings_change' then
      settings := coalesce(proposed->'settings', proposed);
      if jsonb_typeof(settings) <> 'object' then
        raise exception using errcode = '23514', message = 'Security settings require an object snapshot';
      end if;
      insert into public.executive_security_settings (
        company_id,
        settings,
        source_request_id,
        updated_by,
        updated_at
      )
      values (
        old.company_id,
        settings,
        old.id,
        new.decision_user_id,
        decided_at
      )
      on conflict (company_id)
      do update
         set settings = excluded.settings,
             source_request_id = excluded.source_request_id,
             updated_by = excluded.updated_by,
             updated_at = excluded.updated_at;
      outcome := jsonb_build_object('settings', settings, 'updatedAt', decided_at);

    when 'company_closure_or_deletion' then
      -- Soft closure only. Hard deletion is never executed by this path.
      update public.companies
         set status = 'archived',
             archived_at = decided_at,
             archived_by = new.decision_user_id,
             updated_at = decided_at,
             updated_by = new.decision_user_id
       where id = old.company_id
         and status = 'active';
      if not found then
        raise exception using errcode = 'P0001', message = 'Company is not active for soft closure';
      end if;
      outcome := jsonb_build_object(
        'companyId', old.company_id,
        'status', 'archived',
        'destructiveDeletion', false,
        'archivedAt', decided_at
      );

    else
      raise exception using
        errcode = '23514',
        message = 'Sensitive action type has no typed execution adapter';
  end case;

  insert into public.executive_sensitive_execution_outcomes (
    company_id,
    request_id,
    action_type,
    target_type,
    target_id,
    outcome,
    executed_at,
    executed_by_user_id,
    decision_session_id,
    request_correlation_id
  )
  values (
    old.company_id,
    old.id,
    old.action_type,
    old.target_type,
    old.target_id,
    outcome,
    decided_at,
    new.decision_user_id,
    new.decision_session_id,
    new.decision_correlation_id
  );

  new.executed_at := decided_at;
  new.updated_at := decided_at;
  return new;
end;
$function$;

revoke all on function private.execute_executive_typed_sensitive_decision()
  from public, anon, authenticated;
grant execute on function private.execute_executive_typed_sensitive_decision()
  to service_role, postgres;

drop trigger if exists executive_typed_sensitive_execute
  on public.executive_sensitive_action_requests;
create trigger executive_typed_sensitive_execute
before update of status on public.executive_sensitive_action_requests
for each row execute function private.execute_executive_typed_sensitive_decision();

comment on table public.executive_sensitive_execution_outcomes is
  'Append-only ledger of typed Executive sensitive-action executions after independent approval.';
comment on function private.execute_executive_typed_sensitive_decision() is
  'Applies domain mutations for non-budget sensitive actions and marks the request executed.';
