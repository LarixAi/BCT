-- Trusted Driver app devices (security metadata only — never biometric templates).

create table if not exists public.driver_app_devices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  driver_id uuid not null references public.drivers (id) on delete cascade,
  app_account_id uuid references public.driver_app_accounts (id) on delete set null,
  device_key text not null,
  label text not null default 'Driver phone',
  platform text,
  operating_system text,
  app_version text,
  security_status text not null default 'trusted'
    check (security_status in ('trusted', 'untrusted', 'revoked')),
  biometric_unlock boolean not null default false,
  biometric_method text,
  biometric_enabled_at timestamptz,
  last_biometric_unlock_at timestamptz,
  push_notifications_enabled boolean not null default false,
  location_access text not null default 'unknown'
    check (location_access in ('while_on_duty', 'always', 'denied', 'unknown')),
  require_password_next_login boolean not null default false,
  registered_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  revoked_by uuid references public.users (id),
  revoke_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, driver_id, device_key)
);

create index if not exists driver_app_devices_driver_idx
  on public.driver_app_devices (company_id, driver_id);

create index if not exists driver_app_devices_status_idx
  on public.driver_app_devices (company_id, security_status);

alter table public.driver_app_devices enable row level security;

create policy driver_app_devices_company_select on public.driver_app_devices
  for select using (public.user_has_company(company_id));

grant select on public.driver_app_devices to authenticated;
grant all on public.driver_app_devices to service_role;
