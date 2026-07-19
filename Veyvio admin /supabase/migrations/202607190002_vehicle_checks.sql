-- Driver walkaround / pre-use vehicle checks (Command persistence)

create table if not exists public.vehicle_checks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id),
  driver_id uuid references public.drivers (id),
  duty_id uuid references public.duties (id),
  client_check_id text,
  check_type text not null default 'driver_pre_use',
  template_version text,
  result text not null,
  ops_outcome text,
  checklist jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  odometer numeric,
  fuel_level text,
  started_at timestamptz,
  submitted_at timestamptz not null default timezone('utc', now()),
  source_app public.source_app not null default 'DRIVER',
  sync_status text not null default 'synced',
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  constraint vehicle_checks_result_check
    check (result in ('pass', 'fail', 'pass_with_advisory', 'nil_defect', 'passed', 'failed'))
);

create unique index if not exists vehicle_checks_client_id_uidx
  on public.vehicle_checks (company_id, client_check_id)
  where client_check_id is not null;

create index if not exists vehicle_checks_company_submitted_idx
  on public.vehicle_checks (company_id, submitted_at desc);

create index if not exists vehicle_checks_vehicle_submitted_idx
  on public.vehicle_checks (company_id, vehicle_id, submitted_at desc);

create index if not exists vehicle_checks_driver_submitted_idx
  on public.vehicle_checks (company_id, driver_id, submitted_at desc);

alter table public.vehicle_checks enable row level security;

create policy vehicle_checks_select_company on public.vehicle_checks
  for select using (public.user_has_company(company_id));

comment on table public.vehicle_checks is
  'Driver pre-use / walkaround checks submitted from Veyvio Driver into Command.';
