-- Wave 3B: make membership_application_access the sole runtime authority for
-- COMMAND / YARD / DRIVER / EXECUTIVE / FINANCE / HR.
--
-- Inventory active memberships missing explicit grants, then deterministically
-- backfill from the historical role mapping + driver_app_accounts linkage.
-- After this migration, command-api must not fall back to role inference.

do $$
declare
  active_memberships integer := 0;
  memberships_with_grant integer := 0;
  memberships_missing_grant integer := 0;
begin
  select count(*) into active_memberships
  from public.company_memberships
  where status = 'active';

  select count(distinct membership.id) into memberships_with_grant
  from public.company_memberships membership
  where membership.status = 'active'
    and exists (
      select 1
      from public.membership_application_access access
      where access.membership_id = membership.id
        and access.company_id = membership.company_id
        and access.status = 'active'
    );

  memberships_missing_grant := active_memberships - memberships_with_grant;

  raise notice
    'Wave 3B inventory before backfill: active_memberships=%, with_active_grant=%, missing_grant=%',
    active_memberships,
    memberships_with_grant,
    memberships_missing_grant;
end $$;

-- Role → app backfill (same mapping as 202607300002 + company owner COMMAND).
with role_access as (
  select distinct
    membership.company_id,
    membership.id as membership_id,
    case
      when role.name in ('company_owner', 'company_administrator') then 'EXECUTIVE'
      when role.name in (
        'transport_manager', 'operations_manager', 'dispatcher',
        'compliance_manager', 'safeguarding_lead', 'read_only_auditor'
      ) then 'COMMAND'
      when role.name in (
        'finance_director', 'finance_admin', 'finance_manager', 'finance_officer',
        'cost_approver', 'payroll_cost_reviewer', 'auditor', 'board_reader'
      ) then 'FINANCE'
      when role.name in ('hr_director', 'hr_manager', 'hr_officer', 'people_administrator') then 'HR'
      when role.name in ('yard_manager', 'yard_operative', 'contractor') then 'YARD'
      when role.name in ('driver', 'escort') then 'DRIVER'
      else null
    end as app_name
  from public.company_memberships membership
  cross join lateral unnest(coalesce(membership.role_ids, '{}'::uuid[])) as role_id
  join public.roles role
    on role.id = role_id
   and role.company_id = membership.company_id
  where membership.status = 'active'
)
insert into public.membership_application_access (
  company_id,
  membership_id,
  app_type,
  access_level,
  status,
  granted_by
)
select
  role_access.company_id,
  role_access.membership_id,
  role_access.app_name::public.app_type,
  case when role_access.app_name = 'EXECUTIVE' then 'admin' else 'member' end,
  'active',
  membership.created_by
from role_access
join public.company_memberships membership on membership.id = role_access.membership_id
where role_access.app_name is not null
on conflict (membership_id, app_type) do nothing;

insert into public.membership_application_access (
  company_id,
  membership_id,
  app_type,
  access_level,
  status,
  granted_by
)
select distinct
  membership.company_id,
  membership.id,
  'COMMAND'::public.app_type,
  'oversight',
  'active',
  membership.created_by
from public.company_memberships membership
cross join lateral unnest(coalesce(membership.role_ids, '{}'::uuid[])) as role_id
join public.roles role
  on role.id = role_id
 and role.company_id = membership.company_id
where membership.status = 'active'
  and role.name in ('company_owner', 'company_administrator')
on conflict (membership_id, app_type) do nothing;

insert into public.membership_application_access (
  company_id,
  membership_id,
  app_type,
  access_level,
  status,
  granted_by
)
select
  account.company_id,
  account.membership_id,
  'DRIVER'::public.app_type,
  'member',
  'active',
  account.updated_by
from public.driver_app_accounts account
where account.membership_id is not null
on conflict (membership_id, app_type) do nothing;

do $$
declare
  active_memberships integer := 0;
  memberships_with_grant integer := 0;
  memberships_missing_grant integer := 0;
begin
  select count(*) into active_memberships
  from public.company_memberships
  where status = 'active';

  select count(distinct membership.id) into memberships_with_grant
  from public.company_memberships membership
  where membership.status = 'active'
    and exists (
      select 1
      from public.membership_application_access access
      where access.membership_id = membership.id
        and access.company_id = membership.company_id
        and access.status = 'active'
    );

  memberships_missing_grant := active_memberships - memberships_with_grant;

  raise notice
    'Wave 3B inventory after backfill: active_memberships=%, with_active_grant=%, missing_grant=%',
    active_memberships,
    memberships_with_grant,
    memberships_missing_grant;
end $$;

comment on table public.membership_application_access is
  'Wave 3B: sole runtime authority for Veyvio application access (COMMAND/YARD/DRIVER/EXECUTIVE/FINANCE/HR). Role inference is migration/backfill only — never a runtime fallback.';
