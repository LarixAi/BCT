-- Sprint 3 — Platform feature flags (Veyvio staff control plane)

create table if not exists public.platform_feature_flags (
  flag_key text primary key,
  description text not null default '',
  enabled boolean not null default false,
  updated_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.platform_feature_flags (flag_key, description, enabled) values
  ('saas_billing_live', 'Enable SaaS Stripe Checkout live mode (otherwise placeholder)', false),
  ('self_serve_signup', 'Allow public self-serve company signup purchase flow', false),
  ('usage_limit_enforcement', 'Enforce driver/vehicle/depot usage limits on create paths', false)
on conflict (flag_key) do update set
  description = excluded.description;

alter table public.platform_feature_flags enable row level security;

drop policy if exists platform_feature_flags_deny_client on public.platform_feature_flags;
create policy platform_feature_flags_deny_client on public.platform_feature_flags
  for select to authenticated using (false);

grant select on public.platform_feature_flags to authenticated;
grant all on public.platform_feature_flags to service_role;

comment on table public.platform_feature_flags is
  'Veyvio Platform control flags. Mutated only via Command API platform role.';
