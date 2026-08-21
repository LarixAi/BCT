-- Driver push device tokens (FCM). organisation_id stores company_id (client upsert contract).
-- Distinct from driver_app_devices (trusted-device / biometrics metadata).

create table if not exists public.driver_devices (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.companies (id) on delete cascade,
  driver_id uuid not null references public.drivers (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  platform text not null default 'android'
    check (platform in ('android', 'ios', 'web')),
  push_token text not null,
  device_name text,
  app_version text,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (driver_id, push_token)
);

create index if not exists driver_devices_org_driver_idx
  on public.driver_devices (organisation_id, driver_id)
  where is_active = true;

create index if not exists driver_devices_token_idx
  on public.driver_devices (push_token);

alter table public.driver_devices enable row level security;

-- Drivers may manage their own device rows within a company they belong to.
drop policy if exists driver_devices_select_own on public.driver_devices;
create policy driver_devices_select_own on public.driver_devices
  for select to authenticated
  using (
    user_id = auth.uid()
    or private.user_has_company(organisation_id)
  );

drop policy if exists driver_devices_upsert_own on public.driver_devices;
create policy driver_devices_upsert_own on public.driver_devices
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and private.user_has_company(organisation_id)
  );

drop policy if exists driver_devices_update_own on public.driver_devices;
create policy driver_devices_update_own on public.driver_devices
  for update to authenticated
  using (
    user_id = auth.uid()
    and private.user_has_company(organisation_id)
  )
  with check (
    user_id = auth.uid()
    and private.user_has_company(organisation_id)
  );

grant select, insert, update on public.driver_devices to authenticated;
grant all on public.driver_devices to service_role;
