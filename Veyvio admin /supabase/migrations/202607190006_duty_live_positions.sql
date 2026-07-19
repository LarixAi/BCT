-- Latest driver GPS per duty for Command Live Operations.
create table if not exists public.duty_live_positions (
  duty_id uuid primary key references public.duties (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  driver_id uuid references public.drivers (id) on delete set null,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  latitude double precision not null,
  longitude double precision not null,
  accuracy_meters double precision,
  heading double precision,
  speed_mps double precision,
  recorded_at timestamptz not null,
  source_app public.source_app not null default 'DRIVER',
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists duty_live_positions_company_recorded_idx
  on public.duty_live_positions (company_id, recorded_at desc);

create index if not exists duty_live_positions_driver_idx
  on public.duty_live_positions (company_id, driver_id, recorded_at desc);

comment on table public.duty_live_positions is
  'Latest GPS ping per duty from Driver app — projected by Command Live Operations.';
