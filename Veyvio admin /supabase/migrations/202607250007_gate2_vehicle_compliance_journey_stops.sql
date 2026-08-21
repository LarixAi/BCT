-- Gate 2 remainder: vehicle compliance dates + journey stop events.

alter table public.vehicles
  add column if not exists mot_expiry date,
  add column if not exists insurance_expiry date,
  add column if not exists tax_expiry date,
  add column if not exists tachograph_calibration_expiry date,
  add column if not exists pmi_due_at date,
  add column if not exists next_service_due_at date,
  add column if not exists wheel_retorque_due_at timestamptz;

create table if not exists public.journey_stops (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  run_id uuid not null references public.runs (id) on delete cascade,
  sequence integer not null default 1,
  stop_kind text not null default 'waypoint',
  label text,
  status text not null default 'planned',
  arrived_at timestamptz,
  completed_at timestamptz,
  outcome text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id) on delete set null,
  unique (run_id, sequence)
);

create index if not exists journey_stops_company_run_idx
  on public.journey_stops (company_id, run_id, sequence);

alter table public.journey_stops enable row level security;
