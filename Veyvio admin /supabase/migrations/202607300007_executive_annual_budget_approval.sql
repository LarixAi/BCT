-- Veyvio Executive Phase 5: authoritative, versioned annual-budget approval.
-- Finance supplies the detailed cost snapshot. Executive owns formal approval.

create table public.executive_annual_budgets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  financial_year text not null
    check (financial_year ~ '^[0-9]{4}/[0-9]{2}$'),
  version integer not null check (version > 0),
  title text not null check (char_length(btrim(title)) between 3 and 160),
  budget_code text not null check (budget_code ~ '^[A-Za-z0-9][A-Za-z0-9._/-]{1,79}$'),
  finance_budget_reference text not null
    check (char_length(btrim(finance_budget_reference)) between 3 and 200),
  currency text not null default 'GBP'
    check (currency ~ '^[A-Z]{3}$'),
  total_income_minor bigint not null check (total_income_minor >= 0),
  total_expenditure_minor bigint not null check (total_expenditure_minor >= 0),
  contingency_minor bigint not null default 0 check (contingency_minor >= 0),
  line_items jsonb not null
    check (
      jsonb_typeof(line_items) = 'array'
      and jsonb_array_length(line_items) between 1 and 200
    ),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'proposed'
    check (status in ('proposed', 'approved', 'rejected', 'superseded')),
  approval_request_id uuid not null unique
    references public.executive_sensitive_action_requests(id),
  created_by_user_id uuid not null references public.users(id),
  decision_user_id uuid references public.users(id),
  decided_at timestamptz,
  approved_at timestamptz,
  superseded_by_request_id uuid
    references public.executive_sensitive_action_requests(id),
  superseded_by_user_id uuid references public.users(id),
  superseded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, financial_year, version)
);

create unique index executive_annual_budgets_one_approved_idx
  on public.executive_annual_budgets(company_id, financial_year)
  where status = 'approved';

create index executive_annual_budgets_company_year_idx
  on public.executive_annual_budgets(company_id, financial_year, version desc);

alter table public.executive_annual_budgets enable row level security;

drop policy if exists executive_annual_budgets_aal2_read
  on public.executive_annual_budgets;
create policy executive_annual_budgets_aal2_read
  on public.executive_annual_budgets
  as permissive
  for select
  to authenticated
  using (
    private.current_session_is_aal2()
    and private.user_has_active_executive_access(company_id)
  );

revoke insert, update, delete, truncate, references, trigger
  on public.executive_annual_budgets from authenticated, anon;
grant select on public.executive_annual_budgets to authenticated;
grant all on public.executive_annual_budgets to service_role;

comment on table public.executive_annual_budgets is
  'Immutable Finance-originated annual-budget versions formally decided through Executive separation of duties.';

create or replace function private.protect_executive_annual_budget()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  if row(
    new.company_id,
    new.financial_year,
    new.version,
    new.title,
    new.budget_code,
    new.finance_budget_reference,
    new.currency,
    new.total_income_minor,
    new.total_expenditure_minor,
    new.contingency_minor,
    new.line_items,
    new.content_hash,
    new.approval_request_id,
    new.created_by_user_id,
    new.created_at
  ) is distinct from row(
    old.company_id,
    old.financial_year,
    old.version,
    old.title,
    old.budget_code,
    old.finance_budget_reference,
    old.currency,
    old.total_income_minor,
    old.total_expenditure_minor,
    old.contingency_minor,
    old.line_items,
    old.content_hash,
    old.approval_request_id,
    old.created_by_user_id,
    old.created_at
  ) then
    raise exception 'Annual-budget proposal content is immutable';
  end if;
  return new;
end;
$function$;

revoke all on function private.protect_executive_annual_budget()
  from public, anon, authenticated;
grant execute on function private.protect_executive_annual_budget()
  to service_role, postgres;

create trigger executive_annual_budget_protect
before update on public.executive_annual_budgets
for each row execute function private.protect_executive_annual_budget();

create trigger executive_annual_budget_append_only
before delete on public.executive_annual_budgets
for each row execute function private.reject_append_only_mutation();

create or replace function private.audit_executive_annual_budget()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  decision_reason text;
  decision_correlation_id text;
begin
  if coalesce(new.superseded_by_request_id, new.approval_request_id) is not null then
    select request.decision_reason, request.decision_correlation_id
      into decision_reason, decision_correlation_id
      from public.executive_sensitive_action_requests request
     where request.id = coalesce(new.superseded_by_request_id, new.approval_request_id);
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
    coalesce(new.superseded_by_user_id, new.decision_user_id, new.created_by_user_id),
    case
      when tg_op = 'INSERT' then 'executive.annual_budget.proposed'
      when new.status = 'approved' then 'executive.annual_budget.approved'
      when new.status = 'rejected' then 'executive.annual_budget.rejected'
      when new.status = 'superseded' then 'executive.annual_budget.superseded'
      else 'executive.annual_budget.changed'
    end,
    'executive_annual_budget',
    new.id::text,
    'EXECUTIVE',
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new),
    decision_reason,
    decision_correlation_id
  );
  return new;
end;
$function$;

revoke all on function private.audit_executive_annual_budget()
  from public, anon, authenticated;
grant execute on function private.audit_executive_annual_budget()
  to service_role, postgres;

create trigger executive_annual_budget_audit
after insert or update on public.executive_annual_budgets
for each row execute function private.audit_executive_annual_budget();

create or replace function public.create_executive_annual_budget_proposal(
  p_company_id uuid,
  p_financial_year text,
  p_title text,
  p_budget_code text,
  p_finance_budget_reference text,
  p_currency text,
  p_total_income_minor bigint,
  p_contingency_minor bigint,
  p_line_items jsonb,
  p_reason text,
  p_evidence_references jsonb,
  p_proposer_user_id uuid,
  p_proposer_membership_id uuid,
  p_proposer_session_id uuid,
  p_request_correlation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  start_year integer;
  expected_suffix text;
  next_version integer;
  expenditure_minor bigint;
  budget_id uuid := gen_random_uuid();
  request_id uuid := gen_random_uuid();
  content jsonb;
  content_hash text;
  proposer_roles text[];
  proposer_authorised boolean := false;
  before_snapshot jsonb := jsonb_build_object('state', 'no_approved_budget');
  proposed_snapshot jsonb;
begin
  if p_financial_year !~ '^[0-9]{4}/[0-9]{2}$' then
    raise exception using errcode = '23514', message = 'Invalid financial year';
  end if;
  start_year := substring(p_financial_year from 1 for 4)::integer;
  expected_suffix := lpad(((start_year + 1) % 100)::text, 2, '0');
  if substring(p_financial_year from 6 for 2) <> expected_suffix then
    raise exception using errcode = '23514', message = 'Financial year must be consecutive';
  end if;
  if p_currency !~ '^[A-Z]{3}$' then
    raise exception using errcode = '23514', message = 'Invalid currency';
  end if;
  if p_total_income_minor < 0 or p_contingency_minor < 0 then
    raise exception using errcode = '23514', message = 'Budget values cannot be negative';
  end if;
  if jsonb_typeof(p_line_items) <> 'array'
     or jsonb_array_length(p_line_items) not between 1 and 200 then
    raise exception using errcode = '23514', message = 'Budget lines are required';
  end if;
  if exists (
    select 1
      from jsonb_array_elements(p_line_items) line
     where jsonb_typeof(line) <> 'object'
        or coalesce(line->>'code', '') !~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,39}$'
        or char_length(btrim(coalesce(line->>'label', ''))) not between 2 and 120
        or jsonb_typeof(line->'amountMinor') <> 'number'
        or (line->>'amountMinor')::numeric <> trunc((line->>'amountMinor')::numeric)
        or (line->>'amountMinor')::numeric < 0
  ) then
    raise exception using errcode = '23514', message = 'A budget line is invalid';
  end if;
  if (
    select count(*) <> count(distinct lower(line->>'code'))
      from jsonb_array_elements(p_line_items) line
  ) then
    raise exception using errcode = '23514', message = 'Budget line codes must be unique';
  end if;

  select coalesce(sum((line->>'amountMinor')::bigint), 0) + p_contingency_minor
    into expenditure_minor
    from jsonb_array_elements(p_line_items) line;

  select
    array_agg(distinct role.name order by role.name),
    bool_or(lower(role.name) in ('company_owner', 'chief_executive', 'director'))
    into proposer_roles, proposer_authorised
    from public.company_memberships membership
    join public.membership_application_access access
      on access.membership_id = membership.id
     and access.company_id = membership.company_id
     and access.app_type = 'EXECUTIVE'
     and access.status = 'active'
    join public.roles role
      on role.company_id = membership.company_id
     and role.id = any(membership.role_ids)
   where membership.id = p_proposer_membership_id
     and membership.company_id = p_company_id
     and membership.user_id = p_proposer_user_id
     and membership.status = 'active';
  if coalesce(proposer_authorised, false) is not true then
    raise exception using errcode = '23514', message = 'Proposer lacks annual-budget authority';
  end if;

  if not exists (
    select 1
      from public.company_memberships membership
      join public.membership_application_access access
        on access.membership_id = membership.id
       and access.company_id = membership.company_id
       and access.app_type = 'EXECUTIVE'
       and access.status = 'active'
      join public.roles role
        on role.company_id = membership.company_id
       and role.id = any(membership.role_ids)
     where membership.company_id = p_company_id
       and membership.user_id <> p_proposer_user_id
       and membership.status = 'active'
       and lower(role.name) in ('director', 'board_member')
  ) then
    raise exception using errcode = '23514', message = 'Independent budget approver is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_company_id::text || ':' || p_financial_year, 0));

  select to_jsonb(budget)
    into before_snapshot
    from public.executive_annual_budgets budget
   where budget.company_id = p_company_id
     and budget.financial_year = p_financial_year
     and budget.status = 'approved'
   for update;
  before_snapshot := coalesce(before_snapshot, jsonb_build_object('state', 'no_approved_budget'));

  select coalesce(max(budget.version), 0) + 1
    into next_version
    from public.executive_annual_budgets budget
   where budget.company_id = p_company_id
     and budget.financial_year = p_financial_year;

  content := jsonb_build_object(
    'companyId', p_company_id,
    'financialYear', p_financial_year,
    'version', next_version,
    'title', btrim(p_title),
    'budgetCode', btrim(p_budget_code),
    'financeBudgetReference', btrim(p_finance_budget_reference),
    'currency', p_currency,
    'totalIncomeMinor', p_total_income_minor,
    'totalExpenditureMinor', expenditure_minor,
    'contingencyMinor', p_contingency_minor,
    'lineItems', p_line_items
  );
  content_hash := encode(digest(convert_to(content::text, 'UTF8'), 'sha256'::text), 'hex');
  proposed_snapshot := content || jsonb_build_object(
    'id', budget_id,
    'contentHash', content_hash,
    'status', 'proposed'
  );

  insert into public.executive_sensitive_action_requests (
    id,
    company_id,
    action_type,
    target_type,
    target_id,
    reason,
    evidence_references,
    before_snapshot,
    proposed_snapshot,
    proposer_user_id,
    proposer_membership_id,
    proposer_roles,
    proposer_session_id,
    request_correlation_id,
    required_independent_approvals
  ) values (
    request_id,
    p_company_id,
    'annual_budget_approval',
    'executive_annual_budget',
    budget_id::text,
    btrim(p_reason),
    p_evidence_references,
    before_snapshot,
    proposed_snapshot,
    p_proposer_user_id,
    p_proposer_membership_id,
    proposer_roles,
    p_proposer_session_id,
    p_request_correlation_id,
    1
  );

  insert into public.executive_annual_budgets (
    id,
    company_id,
    financial_year,
    version,
    title,
    budget_code,
    finance_budget_reference,
    currency,
    total_income_minor,
    total_expenditure_minor,
    contingency_minor,
    line_items,
    content_hash,
    status,
    approval_request_id,
    created_by_user_id
  ) values (
    budget_id,
    p_company_id,
    p_financial_year,
    next_version,
    btrim(p_title),
    btrim(p_budget_code),
    btrim(p_finance_budget_reference),
    p_currency,
    p_total_income_minor,
    expenditure_minor,
    p_contingency_minor,
    p_line_items,
    content_hash,
    'proposed',
    request_id,
    p_proposer_user_id
  );

  return jsonb_build_object(
    'requestId', request_id,
    'budgetId', budget_id,
    'financialYear', p_financial_year,
    'version', next_version,
    'status', 'pending_approval',
    'contentHash', content_hash,
    'totalIncomeMinor', p_total_income_minor,
    'totalExpenditureMinor', expenditure_minor,
    'contingencyMinor', p_contingency_minor
  );
end;
$function$;

revoke all on function public.create_executive_annual_budget_proposal(
  uuid, text, text, text, text, text, bigint, bigint, jsonb, text, jsonb,
  uuid, uuid, uuid, text
) from public, anon, authenticated;
grant execute on function public.create_executive_annual_budget_proposal(
  uuid, text, text, text, text, text, bigint, bigint, jsonb, text, jsonb,
  uuid, uuid, uuid, text
) to service_role, postgres;

comment on function public.create_executive_annual_budget_proposal(
  uuid, text, text, text, text, text, bigint, bigint, jsonb, text, jsonb,
  uuid, uuid, uuid, text
) is 'Service-only atomic annual-budget proposal creation; not available to browser roles.';

create or replace function private.execute_executive_annual_budget_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  target_budget public.executive_annual_budgets%rowtype;
  canonical_content jsonb;
  calculated_hash text;
  decision_time timestamptz := timezone('utc', now());
begin
  if old.status <> 'pending_approval'
     or new.status not in ('approved', 'rejected')
     or old.action_type <> 'annual_budget_approval' then
    return new;
  end if;
  if old.target_type <> 'executive_annual_budget'
     or old.target_id !~ '^[0-9a-fA-F-]{36}$' then
    raise exception 'Annual-budget target is invalid';
  end if;
  if new.decision_user_id is null
     or new.decision_session_id is null
     or new.decision_reason is null
     or new.decision_correlation_id is null then
    raise exception 'Annual-budget decision evidence is incomplete';
  end if;

  select *
    into target_budget
    from public.executive_annual_budgets budget
   where budget.id = old.target_id::uuid
     and budget.company_id = old.company_id
     and budget.approval_request_id = old.id
     and budget.status = 'proposed'
   for update;
  if not found then
    raise exception 'Annual-budget proposal is missing or no longer pending';
  end if;

  canonical_content := jsonb_build_object(
    'companyId', target_budget.company_id,
    'financialYear', target_budget.financial_year,
    'version', target_budget.version,
    'title', target_budget.title,
    'budgetCode', target_budget.budget_code,
    'financeBudgetReference', target_budget.finance_budget_reference,
    'currency', target_budget.currency,
    'totalIncomeMinor', target_budget.total_income_minor,
    'totalExpenditureMinor', target_budget.total_expenditure_minor,
    'contingencyMinor', target_budget.contingency_minor,
    'lineItems', target_budget.line_items
  );
  calculated_hash := encode(digest(convert_to(canonical_content::text, 'UTF8'), 'sha256'::text), 'hex');
  if calculated_hash <> target_budget.content_hash
     or old.proposed_snapshot->>'contentHash' <> target_budget.content_hash then
    raise exception 'Annual-budget proposal integrity check failed';
  end if;

  if new.status = 'approved' then
    update public.executive_annual_budgets
       set status = 'superseded',
           superseded_by_request_id = new.id,
           superseded_by_user_id = new.decision_user_id,
           superseded_at = decision_time,
           updated_at = decision_time
     where company_id = target_budget.company_id
       and financial_year = target_budget.financial_year
       and status = 'approved'
       and id <> target_budget.id;

    update public.executive_annual_budgets
       set status = 'approved',
           decision_user_id = new.decision_user_id,
           decided_at = decision_time,
           approved_at = decision_time,
           updated_at = decision_time
     where id = target_budget.id;
    new.executed_at := decision_time;
  else
    update public.executive_annual_budgets
       set status = 'rejected',
           decision_user_id = new.decision_user_id,
           decided_at = decision_time,
           updated_at = decision_time
     where id = target_budget.id;
  end if;

  return new;
end;
$function$;

revoke all on function private.execute_executive_annual_budget_decision()
  from public, anon, authenticated;
grant execute on function private.execute_executive_annual_budget_decision()
  to service_role, postgres;

create trigger executive_annual_budget_execute
before update of status on public.executive_sensitive_action_requests
for each row execute function private.execute_executive_annual_budget_decision();
