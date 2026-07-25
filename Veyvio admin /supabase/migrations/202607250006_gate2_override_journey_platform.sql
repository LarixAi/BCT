-- Gate 2: F-07 override audit, journey lifecycle, compliance settings,
-- domain events, fuel records, integration API keys.

-- ---------------------------------------------------------------------------
-- F-07 — overrides never silent (append-only)
-- ---------------------------------------------------------------------------
create table if not exists public.override_audit_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  actor_user_id uuid references public.users (id) on delete set null,
  rule_code text not null,
  reason text not null,
  entity_type text not null,
  entity_id text not null,
  blockers jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists override_audit_events_company_occurred_idx
  on public.override_audit_events (company_id, occurred_at desc);

create index if not exists override_audit_events_entity_idx
  on public.override_audit_events (company_id, entity_type, entity_id);

alter table public.override_audit_events enable row level security;

-- ---------------------------------------------------------------------------
-- F-08 — journey lifecycle on runs (Duty → Journey)
-- ---------------------------------------------------------------------------
alter table public.runs
  add column if not exists lifecycle_status text not null default 'scheduled';

alter table public.runs
  add column if not exists started_at timestamptz;

alter table public.runs
  add column if not exists completed_at timestamptz;

alter table public.duties
  add column if not exists active_journey_id uuid references public.runs (id) on delete set null;

create index if not exists runs_company_lifecycle_idx
  on public.runs (company_id, lifecycle_status);

-- ---------------------------------------------------------------------------
-- F-05 — company compliance / automation settings
-- ---------------------------------------------------------------------------
create table if not exists public.company_compliance_settings (
  company_id uuid primary key references public.companies (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id) on delete set null
);

alter table public.company_compliance_settings enable row level security;

-- ---------------------------------------------------------------------------
-- F-09 — domain events (append-only)
-- ---------------------------------------------------------------------------
create table if not exists public.domain_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  event_type text not null,
  entity_type text not null,
  entity_id text not null,
  actor_user_id uuid references public.users (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists domain_events_company_occurred_idx
  on public.domain_events (company_id, occurred_at desc);

create index if not exists domain_events_entity_idx
  on public.domain_events (company_id, entity_type, entity_id);

alter table public.domain_events enable row level security;

-- ---------------------------------------------------------------------------
-- Fuel purchase / refill records (Gate 2 §4.2)
-- ---------------------------------------------------------------------------
create table if not exists public.fuel_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  driver_id uuid references public.drivers (id) on delete set null,
  depot_id uuid references public.depots (id) on delete set null,
  litres numeric,
  odometer numeric,
  fuel_type text not null default 'diesel',
  notes text,
  recorded_at timestamptz not null default timezone('utc', now()),
  client_id text,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id) on delete set null,
  unique (company_id, client_id)
);

create index if not exists fuel_records_company_vehicle_idx
  on public.fuel_records (company_id, vehicle_id, recorded_at desc);

alter table public.fuel_records enable row level security;

-- ---------------------------------------------------------------------------
-- Vehicle equipment confirmations (Driver → Command)
-- ---------------------------------------------------------------------------
create table if not exists public.vehicle_equipment_checks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  driver_id uuid references public.drivers (id) on delete set null,
  items jsonb not null default '[]'::jsonb,
  missing_items jsonb not null default '[]'::jsonb,
  checked_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id) on delete set null
);

create index if not exists vehicle_equipment_checks_company_vehicle_idx
  on public.vehicle_equipment_checks (company_id, vehicle_id, checked_at desc);

alter table public.vehicle_equipment_checks enable row level security;

-- ---------------------------------------------------------------------------
-- F-14 — integration API keys (hashed secrets)
-- ---------------------------------------------------------------------------
create table if not exists public.integration_api_keys (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null,
  scopes text[] not null default '{}',
  status text not null default 'active',
  expires_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references public.users (id) on delete set null,
  unique (company_id, name)
);

create index if not exists integration_api_keys_company_status_idx
  on public.integration_api_keys (company_id, status);

alter table public.integration_api_keys enable row level security;
