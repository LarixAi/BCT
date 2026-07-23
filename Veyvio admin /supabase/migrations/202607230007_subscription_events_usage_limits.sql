-- Sprint 2 — licensing foundation (no Stripe UI)
-- subscription_events: commercial audit trail
-- plan_usage_limits / company_usage_limits: seat/depot caps
-- provider_customer_ref on company_subscriptions remains the billing customer ref

create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  event_type text not null,
  source text not null default 'system'
    check (source in ('system', 'platform', 'stripe_webhook', 'seed', 'api')),
  from_status text,
  to_status text,
  from_plan_code text,
  to_plan_code text,
  from_tenant_status text,
  to_tenant_status text,
  actor_user_id uuid references public.users (id) on delete set null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists subscription_events_company_created_idx
  on public.subscription_events (company_id, created_at desc);

create table if not exists public.plan_usage_limits (
  plan_code text not null references public.subscription_plans (code) on delete cascade,
  limit_key text not null,
  limit_value integer,
  primary key (plan_code, limit_key),
  constraint plan_usage_limits_non_negative check (limit_value is null or limit_value >= 0)
);

create table if not exists public.company_usage_limits (
  company_id uuid not null references public.companies (id) on delete cascade,
  limit_key text not null,
  limit_value integer,
  reason text,
  updated_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (company_id, limit_key),
  constraint company_usage_limits_non_negative check (limit_value is null or limit_value >= 0)
);

-- Default commercial caps (null = unlimited)
insert into public.plan_usage_limits (plan_code, limit_key, limit_value) values
  ('starter', 'drivers', 25),
  ('starter', 'vehicles', 25),
  ('starter', 'depots', 1),
  ('professional', 'drivers', 100),
  ('professional', 'vehicles', 100),
  ('professional', 'depots', 5),
  ('command_standard', 'drivers', 100),
  ('command_standard', 'vehicles', 100),
  ('command_standard', 'depots', 5),
  ('enterprise', 'drivers', null),
  ('enterprise', 'vehicles', null),
  ('enterprise', 'depots', null)
on conflict (plan_code, limit_key) do update set limit_value = excluded.limit_value;

alter table public.subscription_events enable row level security;
alter table public.plan_usage_limits enable row level security;
alter table public.company_usage_limits enable row level security;

drop policy if exists subscription_events_member_select on public.subscription_events;
create policy subscription_events_member_select on public.subscription_events
  for select to authenticated
  using (private.user_has_company(company_id));

drop policy if exists plan_usage_limits_authenticated_select on public.plan_usage_limits;
create policy plan_usage_limits_authenticated_select on public.plan_usage_limits
  for select to authenticated using (true);

drop policy if exists company_usage_limits_member_select on public.company_usage_limits;
create policy company_usage_limits_member_select on public.company_usage_limits
  for select to authenticated
  using (private.user_has_company(company_id));

grant select on public.subscription_events to authenticated;
grant select on public.plan_usage_limits to authenticated;
grant select on public.company_usage_limits to authenticated;
grant all on public.subscription_events to service_role;
grant all on public.plan_usage_limits to service_role;
grant all on public.company_usage_limits to service_role;

comment on table public.subscription_events is
  'Commercial lifecycle audit. SaaS Stripe webhooks and Platform Admin write here; Driver PHV Stripe is separate.';
comment on table public.plan_usage_limits is
  'Default usage caps per subscription plan. null limit_value = unlimited.';
comment on table public.company_usage_limits is
  'Per-company overrides of plan_usage_limits.';
