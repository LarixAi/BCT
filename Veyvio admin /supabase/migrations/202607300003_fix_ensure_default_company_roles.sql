-- Fix PL/pgSQL variable shadowing: `role_id` clashed with
-- role_permissions.role_id in ON CONFLICT, causing
-- "column reference role_id is ambiguous" during signup verify.

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
