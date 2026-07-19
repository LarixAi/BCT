-- Duty publication first slice: draft vs published, acknowledgements, assignment events.
-- Execution status remains public.duty_status (planned / signed_on / …).

alter table public.duties
  add column if not exists vehicle_id uuid references public.vehicles (id),
  add column if not exists publication_status text not null default 'draft',
  add column if not exists published_at timestamptz,
  add column if not exists published_by uuid references public.users (id),
  add column if not exists acknowledgement_required boolean not null default true,
  add column if not exists acknowledgement_deadline timestamptz,
  add column if not exists special_instructions text,
  add column if not exists driver_lifecycle_status text;

alter table public.duties
  drop constraint if exists duties_publication_status_check;

alter table public.duties
  add constraint duties_publication_status_check
  check (publication_status in ('draft', 'ready_to_publish', 'published', 'cancelled'));

comment on column public.duties.publication_status is
  'Driver visibility: draft/ready_to_publish hidden; published visible in Driver bootstrap.';
comment on column public.duties.version is
  'Duty revision number; incremented on material amend (later slice).';
comment on column public.duties.driver_lifecycle_status is
  'Driver-facing lifecycle: published | delivered | viewed | acknowledged | ready | in_progress | completed | cancelled';

create index if not exists duties_publication_driver_date_idx
  on public.duties (company_id, driver_id, publication_status, service_date);

create table if not exists public.duty_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  duty_id uuid not null references public.duties (id) on delete cascade,
  driver_id uuid not null references public.drivers (id),
  revision integer not null default 1,
  acknowledged_at timestamptz not null default timezone('utc', now()),
  device_id text,
  source_app public.source_app not null default 'DRIVER',
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  unique (duty_id, driver_id, revision)
);

create index if not exists duty_acknowledgements_duty_idx
  on public.duty_acknowledgements (duty_id, acknowledged_at desc);

create table if not exists public.duty_assignment_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  duty_id uuid not null references public.duties (id) on delete cascade,
  event_type text not null,
  actor_user_id uuid references public.users (id),
  actor_driver_id uuid references public.drivers (id),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  source_app public.source_app not null default 'COMMAND'
);

create index if not exists duty_assignment_events_duty_idx
  on public.duty_assignment_events (duty_id, created_at desc);

alter table public.duty_acknowledgements enable row level security;
alter table public.duty_assignment_events enable row level security;

-- Backfill: existing planned duties with a driver become ready_to_publish so demos can publish.
update public.duties
set publication_status = 'ready_to_publish'
where publication_status = 'draft'
  and driver_id is not null
  and status in ('planned', 'signed_on', 'in_progress');

-- Demo smoke: publish today's seeded duties so Driver bootstrap has work.
update public.duties
set
  publication_status = 'published',
  published_at = coalesce(published_at, timezone('utc', now())),
  driver_lifecycle_status = coalesce(driver_lifecycle_status, 'published'),
  acknowledgement_required = true,
  acknowledgement_deadline = coalesce(
    acknowledgement_deadline,
    (service_date::timestamp + interval '1 day' - interval '1 second') at time zone 'utc'
  )
where service_date >= (timezone('utc', now()))::date - 1
  and driver_id is not null
  and status <> 'cancelled'
  and publication_status <> 'cancelled';
