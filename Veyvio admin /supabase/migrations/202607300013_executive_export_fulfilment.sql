-- Phase 8: restricted_export jobs carry reason, classification, purpose and sensitive-action link.

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
