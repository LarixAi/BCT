-- Vehicle swap requests, duty closeouts, and server-tracked driver job execution events.

create table if not exists public.vehicle_swap_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  duty_id uuid not null references public.duties (id) on delete cascade,
  driver_id uuid not null references public.drivers (id),
  current_vehicle_id uuid not null references public.vehicles (id),
  requested_vehicle_id uuid not null references public.vehicles (id),
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  requested_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  resolved_by uuid references public.users (id),
  resolution_notes text,
  metadata jsonb not null default '{}'::jsonb,
  client_generated_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists vehicle_swap_requests_client_id_idx
  on public.vehicle_swap_requests (company_id, client_generated_id)
  where client_generated_id is not null;

create index if not exists vehicle_swap_requests_company_status_idx
  on public.vehicle_swap_requests (company_id, status, requested_at desc);

create table if not exists public.duty_closeouts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  duty_id uuid references public.duties (id) on delete set null,
  driver_id uuid not null references public.drivers (id),
  job_reference text,
  payload jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default timezone('utc', now()),
  client_generated_id text,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists duty_closeouts_client_id_idx
  on public.duty_closeouts (company_id, client_generated_id)
  where client_generated_id is not null;

create index if not exists duty_closeouts_duty_idx
  on public.duty_closeouts (company_id, duty_id, submitted_at desc);

create table if not exists public.driver_job_execution_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  driver_id uuid not null references public.drivers (id),
  job_id text not null,
  duty_id uuid references public.duties (id) on delete set null,
  journey_id uuid references public.runs (id) on delete set null,
  stop_id text,
  stop_sequence integer,
  event_type text not null
    check (event_type in (
      'job_accepted',
      'job_started',
      'arrived_stop',
      'completed_stop',
      'job_completed',
      'issue_reported'
    )),
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc', now()),
  client_generated_id text,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists driver_job_execution_events_client_id_idx
  on public.driver_job_execution_events (company_id, client_generated_id)
  where client_generated_id is not null;

create index if not exists driver_job_execution_events_job_idx
  on public.driver_job_execution_events (company_id, job_id, occurred_at desc);

alter table public.vehicle_swap_requests enable row level security;
alter table public.duty_closeouts enable row level security;
alter table public.driver_job_execution_events enable row level security;
