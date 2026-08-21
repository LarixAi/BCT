-- Veyvio account hierarchy
-- Executive creates Executive, Command, Finance and HR accounts.
-- Command creates Driver and Yard accounts.
-- One company membership may hold several explicitly granted applications.

create table if not exists public.membership_application_access (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  membership_id uuid not null references public.company_memberships (id) on delete cascade,
  app_type public.app_type not null,
  access_level text not null default 'member'
    check (access_level in ('member', 'manager', 'admin', 'oversight')),
  status text not null default 'active'
    check (status in ('active', 'suspended', 'revoked')),
  granted_by uuid references public.users (id),
  granted_at timestamptz not null default timezone('utc', now()),
  revoked_by uuid references public.users (id),
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (membership_id, app_type)
);

create index if not exists membership_application_access_company_idx
  on public.membership_application_access (company_id, app_type, status);

create or replace function public.enforce_membership_application_company()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.company_memberships membership
    where membership.id = new.membership_id
      and membership.company_id = new.company_id
  ) then
    raise exception 'Application access membership must belong to the same company';
  end if;
  return new;
end;
$$;

drop trigger if exists membership_application_access_company_guard
  on public.membership_application_access;
create trigger membership_application_access_company_guard
before insert or update on public.membership_application_access
for each row execute function public.enforce_membership_application_company();

alter table public.membership_application_access enable row level security;

drop policy if exists membership_application_access_member
  on public.membership_application_access;
create policy membership_application_access_member
on public.membership_application_access
for select
using (private.user_has_company(company_id));

revoke all on function public.enforce_membership_application_company() from public, anon, authenticated;
grant execute on function public.enforce_membership_application_company() to service_role;
grant all on table public.membership_application_access to service_role;
grant select on table public.membership_application_access to authenticated;

insert into public.permissions (code, description, module) values
  ('accounts.department.manage', 'Create Executive, Command, Finance and HR accounts', 'identity'),
  ('accounts.operational.manage', 'Create Driver and Yard accounts', 'identity'),
  ('accounts.access.review', 'Review company application access and invitation history', 'audit')
on conflict (code) do update
set description = excluded.description,
    module = excluded.module;

-- Keep company creation authoritative for every current and future company.
-- The returned role is always the company owner used by the Executive signup.
create or replace function public.ensure_default_company_roles(p_company_id uuid, p_actor uuid)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  owner_role_id uuid;
  role_name text;
  created_role_id uuid;
  role_source public.source_app;
begin
  for role_name in
    select unnest(array[
      'company_owner',
      'company_administrator',
      'director',
      'executive_reader',
      'board_member',
      'transport_manager',
      'operations_manager',
      'dispatcher',
      'yard_manager',
      'yard_operative',
      'contractor',
      'driver',
      'escort',
      'compliance_manager',
      'safeguarding_lead',
      'read_only_auditor',
      'finance_director',
      'finance_admin',
      'finance_manager',
      'finance_officer',
      'cost_approver',
      'payroll_cost_reviewer',
      'auditor',
      'board_reader',
      'hr_director',
      'hr_manager',
      'hr_officer',
      'people_administrator'
    ])
  loop
    role_source := case
      when role_name in (
        'company_owner', 'company_administrator', 'director',
        'executive_reader', 'board_member'
      ) then 'EXECUTIVE'::public.source_app
      when role_name in (
        'finance_director', 'finance_admin', 'finance_manager',
        'finance_officer', 'cost_approver', 'payroll_cost_reviewer',
        'auditor', 'board_reader'
      ) then 'FINANCE'::public.source_app
      when role_name in (
        'hr_director', 'hr_manager', 'hr_officer', 'people_administrator'
      ) then 'HR'::public.source_app
      when role_name in ('yard_manager', 'yard_operative', 'contractor')
        then 'YARD'::public.source_app
      when role_name in ('driver', 'escort')
        then 'DRIVER'::public.source_app
      else 'COMMAND'::public.source_app
    end;

    insert into public.roles (
      company_id,
      name,
      description,
      is_system_role,
      created_by,
      updated_by,
      source_app
    )
    values (
      p_company_id,
      role_name,
      replace(role_name, '_', ' '),
      true,
      p_actor,
      p_actor,
      role_source
    )
    on conflict (company_id, name) do update
    set is_system_role = true,
        source_app = excluded.source_app,
        updated_at = timezone('utc', now())
    returning id into created_role_id;

    if role_name = 'company_owner' then
      owner_role_id := created_role_id;
    end if;
  end loop;

  insert into public.role_permissions as rp (role_id, permission_code, effect)
  select owner_role_id, permission.code, 'allow'
  from public.permissions permission
  on conflict (role_id, permission_code) do update set effect = excluded.effect;

  insert into public.company_security_policies (company_id)
  values (p_company_id)
  on conflict (company_id) do nothing;

  insert into public.company_subscriptions (company_id, status)
  values (p_company_id, 'trial')
  on conflict (company_id) do nothing;

  return owner_role_id;
end;
$$;

revoke all on function public.ensure_default_company_roles(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.ensure_default_company_roles(uuid, uuid)
  to service_role;

-- Company system roles for current and future account workflows.
insert into public.roles (
  company_id,
  name,
  description,
  is_system_role,
  created_by,
  updated_by,
  source_app
)
select
  company.id,
  role_definition.name,
  role_definition.description,
  true,
  company.created_by,
  company.updated_by,
  role_definition.source_app::public.source_app
from public.companies company
cross join (
  values
    ('operations_manager', 'Command operations manager', 'COMMAND'),
    ('yard_operative', 'Yard operative', 'YARD'),
    ('contractor', 'Authorised yard contractor', 'YARD'),
    ('escort', 'Passenger escort', 'DRIVER'),
    ('director', 'Company director', 'EXECUTIVE'),
    ('executive_reader', 'Executive read-only user', 'EXECUTIVE'),
    ('board_member', 'Board member', 'EXECUTIVE'),
    ('finance_director', 'Finance director', 'FINANCE'),
    ('finance_admin', 'Finance administrator', 'FINANCE'),
    ('finance_manager', 'Finance manager', 'FINANCE'),
    ('finance_officer', 'Finance officer', 'FINANCE'),
    ('cost_approver', 'Cost approver', 'FINANCE'),
    ('payroll_cost_reviewer', 'Payroll cost reviewer', 'FINANCE'),
    ('auditor', 'Finance auditor', 'FINANCE'),
    ('board_reader', 'Board finance reader', 'FINANCE'),
    ('hr_director', 'HR director', 'HR'),
    ('hr_manager', 'HR manager', 'HR'),
    ('hr_officer', 'HR officer', 'HR'),
    ('people_administrator', 'People administrator', 'HR')
) as role_definition(name, description, source_app)
on conflict (company_id, name) do update
set description = excluded.description,
    is_system_role = true,
    source_app = excluded.source_app,
    updated_at = timezone('utc', now());

-- Executive authority: owner and company administrator create department accounts.
insert into public.role_permissions (role_id, permission_code, effect)
select role.id, permission.code, 'allow'
from public.roles role
cross join public.permissions permission
where role.name in ('company_owner', 'company_administrator')
  and permission.code in (
    'accounts.department.manage',
    'accounts.access.review',
    'settings.invitations.manage'
  )
on conflict (role_id, permission_code) do update set effect = 'allow';

-- Command authority: only transport/operations managers create Driver and Yard accounts.
insert into public.role_permissions (role_id, permission_code, effect)
select role.id, 'accounts.operational.manage', 'allow'
from public.roles role
where role.name in ('transport_manager', 'operations_manager')
on conflict (role_id, permission_code) do update set effect = 'allow';

-- Backfill explicit access for existing memberships without changing their roles.
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
  cross join lateral unnest(membership.role_ids) role_id
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

-- Existing company owners retain Command oversight while Executive becomes
-- their root application.
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
cross join lateral unnest(membership.role_ids) role_id
join public.roles role on role.id = role_id
where membership.status = 'active'
  and role.name in ('company_owner', 'company_administrator')
on conflict (membership_id, app_type) do nothing;

-- Driver linkage remains an independent proof of Driver application access.
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

comment on table public.membership_application_access is
  'Explicit application grants for one Veyvio identity within a company. Server-authoritative; clients never choose company or app scope.';
