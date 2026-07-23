-- SaaS licensing domain: plans, entitlements, platform operators.
-- Commercial source of truth remains company_subscriptions.plan_code.

create table if not exists public.subscription_plans (
  code text primary key,
  name text not null,
  description text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.plan_features (
  plan_code text not null references public.subscription_plans (code) on delete cascade,
  module_key text not null,
  enabled boolean not null default true,
  primary key (plan_code, module_key)
);

create table if not exists public.company_entitlement_overrides (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  module_key text not null,
  enabled boolean not null,
  reason text,
  created_by uuid references public.users (id),
  created_at timestamptz not null default timezone('utc', now()),
  unique (company_id, module_key)
);

create table if not exists public.platform_users (
  user_id uuid primary key references public.users (id) on delete cascade,
  platform_role text not null default 'platform_admin'
    check (platform_role in ('platform_admin', 'platform_support', 'platform_billing')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.platform_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users (id),
  action text not null,
  target_company_id uuid references public.companies (id) on delete set null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.company_subscriptions
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists trial_ends_at timestamptz;

insert into public.subscription_plans (code, name, description, sort_order) values
  ('starter', 'Starter', 'Core Command: drivers, vehicles, basic scheduling', 10),
  ('professional', 'Professional', 'Adds maintenance, yard, training and advanced reports', 20),
  ('enterprise', 'Enterprise', 'Full platform including multi-depot, SSO-ready and integrations', 30),
  ('command_standard', 'Command Standard', 'Legacy default plan — treated as Professional', 15)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());

-- Module keys align with PLATFORM_MODULES in the Admin client.
with modules(module_key) as (
  values
    ('identity'), ('tenancy'), ('operations'), ('dispatch'), ('workforce'),
    ('fleet'), ('yard'), ('maintenance'), ('safety'), ('compliance'),
    ('customers'), ('passengers'), ('commercial'), ('communications'),
    ('reporting'), ('integrations'), ('audit')
),
starter(module_key) as (
  values
    ('identity'), ('tenancy'), ('operations'), ('dispatch'), ('workforce'),
    ('fleet'), ('customers'), ('communications'), ('audit')
),
professional(module_key) as (
  select module_key from modules
  where module_key not in ('integrations')
)
insert into public.plan_features (plan_code, module_key, enabled)
select 'starter', module_key, true from starter
union all
select 'professional', module_key, true from professional
union all
select 'enterprise', module_key, true from modules
union all
select 'command_standard', module_key, true from professional
on conflict (plan_code, module_key) do update set enabled = excluded.enabled;

alter table public.subscription_plans enable row level security;
alter table public.plan_features enable row level security;
alter table public.company_entitlement_overrides enable row level security;
alter table public.platform_users enable row level security;
alter table public.platform_audit_logs enable row level security;

create policy subscription_plans_authenticated_select on public.subscription_plans
  for select to authenticated using (true);

create policy plan_features_authenticated_select on public.plan_features
  for select to authenticated using (true);

create policy company_entitlement_overrides_member on public.company_entitlement_overrides
  for select to authenticated using (public.user_has_company(company_id));

create policy platform_users_self_select on public.platform_users
  for select to authenticated using (user_id = auth.uid());

create policy platform_audit_logs_deny_client on public.platform_audit_logs
  for select to authenticated using (false);
