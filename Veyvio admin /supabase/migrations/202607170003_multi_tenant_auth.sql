-- Multi-tenant SaaS authentication foundation
-- Company lifecycle, pending signup, sessions, MFA stubs, contracts, security events.
-- Complements Phase 1 identity tables. Does not open public employee self-registration.

create type public.tenant_status as enum (
  'PENDING_EMAIL_VERIFICATION',
  'PENDING_COMPANY_VERIFICATION',
  'PENDING_CONTRACT',
  'PENDING_PAYMENT',
  'SETUP_REQUIRED',
  'ACTIVE',
  'SUSPENDED',
  'READ_ONLY',
  'CLOSING',
  'CLOSED'
);

create type public.auth_strength as enum (
  'password',
  'password_mfa',
  'passkey',
  'phishing_resistant_mfa',
  'recovery'
);

create type public.security_event_severity as enum ('info', 'attention', 'critical');

alter table public.companies
  add column if not exists tenant_status public.tenant_status not null default 'SETUP_REQUIRED',
  add column if not exists country text,
  add column if not exists phone text,
  add column if not exists registered_address jsonb not null default '{}'::jsonb,
  add column if not exists operating_address jsonb not null default '{}'::jsonb,
  add column if not exists billing_contact jsonb not null default '{}'::jsonb,
  add column if not exists transport_manager_name text,
  add column if not exists estimated_fleet_size integer,
  add column if not exists estimated_user_count integer,
  add column if not exists verified_at timestamptz,
  add column if not exists activated_at timestamptz;

-- Existing demo/bootstrap companies become ACTIVE so login keeps working.
update public.companies
set tenant_status = 'ACTIVE',
    activated_at = coalesce(activated_at, timezone('utc', now()))
where tenant_status = 'SETUP_REQUIRED';

-- ---------------------------------------------------------------------------
-- Pending company registration (no operational access yet)
-- ---------------------------------------------------------------------------
create table public.pending_organisations (
  id uuid primary key default gen_random_uuid(),
  legal_name text,
  trading_name text not null,
  country text not null default 'GB',
  phone text,
  status text not null default 'pending_email',
  estimated_fleet_size integer,
  estimated_user_count integer,
  companies_house_number text,
  operator_licence_number text,
  registered_address jsonb not null default '{}'::jsonb,
  operating_address jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_company_id uuid references public.companies (id)
);

create table public.pending_users (
  id uuid primary key default gen_random_uuid(),
  pending_organisation_id uuid not null references public.pending_organisations (id) on delete cascade,
  email text not null,
  first_name text not null,
  last_name text not null,
  phone text,
  password_hash text,
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  email_verified_at timestamptz,
  auth_user_id uuid references auth.users (id),
  status text not null default 'pending_email',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index pending_users_email_active_idx
  on public.pending_users (lower(email))
  where status in ('pending_email', 'email_verified', 'company_pending');

create table public.email_verification_challenges (
  id uuid primary key default gen_random_uuid(),
  pending_user_id uuid not null references public.pending_users (id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  invalidated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  created_ip text,
  user_agent text
);

create table public.signup_risk_assessments (
  id uuid primary key default gen_random_uuid(),
  pending_organisation_id uuid not null references public.pending_organisations (id) on delete cascade,
  risk_level text not null default 'standard',
  signals jsonb not null default '{}'::jsonb,
  assessed_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Sessions / MFA / devices
-- ---------------------------------------------------------------------------
create table public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  active_company_id uuid references public.companies (id),
  membership_id uuid references public.company_memberships (id),
  device_id text,
  auth_method text not null default 'password',
  auth_strength public.auth_strength not null default 'password',
  created_at timestamptz not null default timezone('utc', now()),
  last_used_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  risk_level text not null default 'normal',
  ip_history text[] not null default '{}',
  user_agent text
);

create table public.user_mfa_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  method_type text not null,
  label text,
  is_primary boolean not null default false,
  enabled_at timestamptz not null default timezone('utc', now()),
  last_used_at timestamptz,
  disabled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  device_identifier text not null,
  platform text,
  trusted boolean not null default false,
  last_seen_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, device_identifier)
);

-- ---------------------------------------------------------------------------
-- Company security / contracts / subscription
-- ---------------------------------------------------------------------------
create table public.company_security_policies (
  company_id uuid primary key references public.companies (id) on delete cascade,
  mfa_required_for_roles text[] not null default array[
    'company_owner','company_administrator','dispatch_manager','safeguarding_lead',
    'incident_investigator','billing_administrator'
  ],
  session_idle_minutes integer not null default 480,
  password_min_length integer not null default 12,
  allow_sms_mfa_fallback boolean not null default true,
  require_reauth_for_exports boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.company_subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  status text not null default 'trial',
  plan_code text not null default 'command_standard',
  provider_customer_ref text,
  current_period_end timestamptz,
  grace_period_ends_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id)
);

create table public.company_contract_acceptances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  document_type text not null,
  document_version text not null,
  accepted_by uuid not null references public.users (id),
  accepted_at timestamptz not null default timezone('utc', now()),
  ip_address text,
  user_agent text,
  acceptance_method text not null default 'web_checkbox'
);

create table public.data_retention_policies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  category text not null,
  retention_days integer not null,
  legal_hold_allowed boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (company_id, category)
);

-- ---------------------------------------------------------------------------
-- Security audit (separate from operational audit_events)
-- ---------------------------------------------------------------------------
create table public.security_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete set null,
  actor_user_id uuid references public.users (id),
  event_type text not null,
  severity public.security_event_severity not null default 'info',
  message text not null,
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Default role templates per company
-- ---------------------------------------------------------------------------
create or replace function public.ensure_default_company_roles(p_company_id uuid, p_actor uuid)
returns uuid
language plpgsql
as $$
declare
  owner_role_id uuid;
  role_name text;
  role_id uuid;
begin
  for role_name in
    select unnest(array[
      'company_owner',
      'company_administrator',
      'transport_manager',
      'dispatcher',
      'yard_manager',
      'driver',
      'compliance_manager',
      'safeguarding_lead',
      'read_only_auditor'
    ])
  loop
    insert into public.roles (company_id, name, description, is_system_role, created_by, updated_by, source_app)
    values (
      p_company_id,
      role_name,
      replace(role_name, '_', ' '),
      true,
      p_actor,
      p_actor,
      'COMMAND'
    )
    on conflict (company_id, name) do update set updated_at = timezone('utc', now())
    returning id into role_id;

    if role_name = 'company_owner' then
      owner_role_id := role_id;
    end if;
  end loop;

  -- Owner gets all current permissions
  insert into public.role_permissions (role_id, permission_code, effect)
  select owner_role_id, p.code, 'allow'
  from public.permissions p
  on conflict do nothing;

  insert into public.company_security_policies (company_id)
  values (p_company_id)
  on conflict (company_id) do nothing;

  insert into public.company_subscriptions (company_id, status)
  values (p_company_id, 'trial')
  on conflict (company_id) do nothing;

  return owner_role_id;
end;
$$;

-- Granular passenger permissions (privacy by default)
insert into public.permissions (code, description, module) values
  ('passengers.basic.read', 'Read basic passenger identity', 'passengers'),
  ('passengers.contact.read', 'Read passenger contacts', 'passengers'),
  ('passengers.needs.read', 'Read passenger needs', 'passengers'),
  ('passengers.risks.read', 'Read passenger risks', 'passengers'),
  ('passengers.safeguarding.read', 'Read safeguarding-linked passenger data', 'passengers'),
  ('passengers.create', 'Create passengers', 'passengers'),
  ('passengers.edit', 'Edit passengers', 'passengers'),
  ('passengers.export', 'Export passenger data', 'passengers'),
  ('settings.company.manage', 'Manage company settings', 'tenancy'),
  ('settings.security.manage', 'Manage security settings', 'identity'),
  ('billing.manage', 'Manage billing', 'commercial'),
  ('support.view', 'View support access history', 'audit')
on conflict (code) do nothing;

alter table public.pending_organisations enable row level security;
alter table public.pending_users enable row level security;
alter table public.email_verification_challenges enable row level security;
alter table public.signup_risk_assessments enable row level security;
alter table public.user_sessions enable row level security;
alter table public.user_mfa_methods enable row level security;
alter table public.user_devices enable row level security;
alter table public.company_security_policies enable row level security;
alter table public.company_subscriptions enable row level security;
alter table public.company_contract_acceptances enable row level security;
alter table public.data_retention_policies enable row level security;
alter table public.security_events enable row level security;

create policy user_sessions_self on public.user_sessions
  for select using (user_id = auth.uid());
create policy user_mfa_self on public.user_mfa_methods
  for select using (user_id = auth.uid());
create policy user_devices_self on public.user_devices
  for select using (user_id = auth.uid());
create policy company_security_member on public.company_security_policies
  for select using (public.user_has_company(company_id));
create policy company_subscriptions_member on public.company_subscriptions
  for select using (public.user_has_company(company_id));
create policy contract_acceptances_member on public.company_contract_acceptances
  for select using (public.user_has_company(company_id));
create policy retention_policies_member on public.data_retention_policies
  for select using (public.user_has_company(company_id));
create policy security_events_member on public.security_events
  for select using (company_id is null or public.user_has_company(company_id));

grant all on all tables in schema public to service_role;
grant select on all tables in schema public to authenticated;
