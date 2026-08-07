-- Phase 10: retention purge jobs, continuity drills, retention_purge action type.

alter table public.executive_sensitive_action_requests
  drop constraint if exists executive_sensitive_action_requests_action_type_check;

alter table public.executive_sensitive_action_requests
  add constraint executive_sensitive_action_requests_action_type_check
  check (action_type in (
    'executive_administrator_change',
    'director_or_officer_change',
    'annual_budget_approval',
    'company_policy_publication',
    'restricted_export',
    'bank_authority_change',
    'support_access_change',
    'security_settings_change',
    'company_closure_or_deletion',
    'retention_purge'
  ));

create table if not exists public.executive_retention_purge_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sensitive_action_request_id uuid
    references public.executive_sensitive_action_requests(id) on delete set null,
  status text not null default 'approved'
    check (status in ('approved', 'running', 'completed', 'failed', 'cancelled')),
  retention_category text not null,
  document_file_ids uuid[] not null default '{}',
  candidate_count integer not null default 0
    check (candidate_count >= 0),
  purged_count integer not null default 0
    check (purged_count >= 0),
  reason text not null check (char_length(btrim(reason)) between 10 and 2000),
  proposed_by uuid references public.users(id),
  approved_by uuid references public.users(id),
  executed_by uuid references public.users(id),
  legal_hold_blocked_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  approved_at timestamptz not null default timezone('utc', now()),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists executive_retention_purge_jobs_company_idx
  on public.executive_retention_purge_jobs(company_id, created_at desc);

create table if not exists public.executive_continuity_drills (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  drill_type text not null
    check (drill_type in (
      'database_restore',
      'document_restore',
      'compromised_ceo',
      'backup_admin_separation',
      'tabletop_continuity'
    )),
  status text not null default 'passed'
    check (status in ('passed', 'failed', 'partial', 'skipped')),
  title text not null,
  summary text not null,
  rpo_minutes_observed integer,
  rto_minutes_observed integer,
  evidence jsonb not null default '{}'::jsonb,
  performed_by text,
  performed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists executive_continuity_drills_type_idx
  on public.executive_continuity_drills(drill_type, performed_at desc);

alter table public.executive_retention_purge_jobs enable row level security;
alter table public.executive_continuity_drills enable row level security;

drop policy if exists executive_retention_purge_aal2_read on public.executive_retention_purge_jobs;
create policy executive_retention_purge_aal2_read
  on public.executive_retention_purge_jobs
  as permissive
  for select
  to authenticated
  using (
    private.current_session_is_aal2()
    and private.user_has_active_executive_access(company_id)
  );

drop policy if exists executive_continuity_drills_aal2_read on public.executive_continuity_drills;
create policy executive_continuity_drills_aal2_read
  on public.executive_continuity_drills
  as permissive
  for select
  to authenticated
  using (
    company_id is not null
    and private.current_session_is_aal2()
    and private.user_has_active_executive_access(company_id)
  );

revoke all on table public.executive_retention_purge_jobs from authenticated, anon;
revoke all on table public.executive_continuity_drills from authenticated, anon;
grant select on public.executive_retention_purge_jobs to authenticated;
grant select on public.executive_continuity_drills to authenticated;
grant all on table public.executive_retention_purge_jobs to service_role;
grant all on table public.executive_continuity_drills to service_role;

-- Replace typed executor with Phase 8 body + retention_purge branch (preserve existing adapters).
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
  target_membership_id uuid;
  target_user_id uuid;
  role_names text[];
  resolved_role_ids uuid[];
  target_access_level text;
  mandate_id uuid;
  grant_id uuid;
  export_id uuid;
  expires_at timestamptz;
  settings jsonb;
  purge_ids uuid[];
  purge_category text;
  purge_job_id uuid;
  purged integer := 0;
  blocked integer := 0;
begin
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
      target_membership_id := nullif(proposed->>'membershipId', '')::uuid;
      target_access_level := coalesce(nullif(proposed->>'accessLevel', ''), 'admin');
      if target_access_level not in ('member', 'manager', 'admin', 'oversight') then
        raise exception using errcode = '23514', message = 'Administrator accessLevel is invalid';
      end if;
      if target_membership_id is null then
        raise exception using errcode = '23514', message = 'Administrator change requires membershipId';
      end if;
      if not exists (
        select 1
          from public.company_memberships membership
         where membership.id = target_membership_id
           and membership.company_id = old.company_id
           and membership.status = 'active'
      ) then
        raise exception using errcode = '23514', message = 'Administrator membership is not active for this company';
      end if;
      insert into public.membership_application_access as access_row (
        membership_id,
        company_id,
        app_type,
        access_level,
        status,
        granted_at,
        granted_by
      )
      values (
        target_membership_id,
        old.company_id,
        'EXECUTIVE',
        target_access_level,
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
        'membershipId', target_membership_id,
        'appType', 'EXECUTIVE',
        'accessLevel', target_access_level,
        'status', 'active'
      );

    when 'director_or_officer_change' then
      target_membership_id := nullif(proposed->>'membershipId', '')::uuid;
      role_names := array(
        select distinct lower(trim(value))
          from jsonb_array_elements_text(coalesce(proposed->'roleNames', '[]'::jsonb)) as value
         where trim(value) <> ''
      );
      if target_membership_id is null or coalesce(cardinality(role_names), 0) = 0 then
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
       where membership.id = target_membership_id
         and membership.company_id = old.company_id
         and membership.status = 'active';
      if not found then
        raise exception using errcode = 'P0001', message = 'Director change membership is missing';
      end if;
      outcome := jsonb_build_object(
        'membershipId', target_membership_id,
        'addedRoleNames', to_jsonb(role_names),
        'addedRoleIds', to_jsonb(resolved_role_ids)
      );

    when 'restricted_export' then
      insert into public.data_export_jobs (
        company_id,
        requested_by,
        export_type,
        status,
        started_at,
        reason,
        sensitive_action_request_id,
        classification,
        purpose,
        watermark_required
      )
      values (
        old.company_id,
        old.proposer_user_id,
        coalesce(nullif(proposed->>'exportType', ''), 'executive_restricted'),
        'authorised',
        decided_at,
        old.reason,
        old.id,
        coalesce(nullif(proposed->>'classification', ''), 'executive_restricted'),
        coalesce(nullif(proposed->>'purpose', ''), 'board_restricted_export'),
        true
      )
      returning id into export_id;
      outcome := jsonb_build_object(
        'exportJobId', export_id,
        'exportType', coalesce(nullif(proposed->>'exportType', ''), 'executive_restricted'),
        'status', 'authorised',
        'classification', coalesce(nullif(proposed->>'classification', ''), 'executive_restricted'),
        'watermarkRequired', true
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
      target_access_level := coalesce(nullif(proposed->>'accessLevel', ''), 'read_only');
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
        target_access_level,
        decided_at,
        expires_at
      )
      returning id into grant_id;
      outcome := jsonb_build_object(
        'grantId', grant_id,
        'granteeUserId', target_user_id,
        'accessLevel', target_access_level,
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

    when 'retention_purge' then
      purge_category := coalesce(nullif(proposed->>'retentionCategory', ''), 'executive_exports');
      select coalesce(array_agg(value::uuid), '{}'::uuid[])
        into purge_ids
        from jsonb_array_elements_text(coalesce(proposed->'documentFileIds', '[]'::jsonb)) as value
       where value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
      if cardinality(purge_ids) < 1 then
        raise exception using errcode = '23514', message = 'retention_purge requires documentFileIds';
      end if;

      select count(*)::int into blocked
        from public.executive_document_files
       where company_id = old.company_id
         and id = any(purge_ids)
         and legal_hold is true;

      update public.executive_document_files
         set deleted_at = decided_at,
             updated_at = decided_at
       where company_id = old.company_id
         and id = any(purge_ids)
         and deleted_at is null
         and legal_hold is not true;
      get diagnostics purged = row_count;

      insert into public.executive_retention_purge_jobs (
        company_id,
        sensitive_action_request_id,
        status,
        retention_category,
        document_file_ids,
        candidate_count,
        purged_count,
        reason,
        proposed_by,
        approved_by,
        executed_by,
        legal_hold_blocked_count,
        metadata,
        approved_at,
        started_at,
        completed_at
      )
      values (
        old.company_id,
        old.id,
        'completed',
        purge_category,
        purge_ids,
        cardinality(purge_ids),
        purged,
        old.reason,
        old.proposer_user_id,
        new.decision_user_id,
        new.decision_user_id,
        blocked,
        jsonb_build_object('softDeleteOnly', true, 'hardStorageDelete', false),
        decided_at,
        decided_at,
        decided_at
      )
      returning id into purge_job_id;

      outcome := jsonb_build_object(
        'purgeJobId', purge_job_id,
        'purgedCount', purged,
        'legalHoldBlockedCount', blocked,
        'softDeleteOnly', true
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

comment on table public.executive_retention_purge_jobs is
  'Phase 10 approved destructive retention soft-delete jobs. Hard storage purge remains residual.';

comment on table public.executive_continuity_drills is
  'Phase 10 restore and compromise-recovery drill evidence.';
