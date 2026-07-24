-- Live Yard Map — Phase 1 foundation
-- Extends depot/bay model with layout versioning, geometry, and vehicle locations.

-- ---------------------------------------------------------------------------
-- Depot extensions
-- ---------------------------------------------------------------------------
alter table public.depots
  add column if not exists yard_map_enabled boolean not null default false,
  add column if not exists primary_entrance text,
  add column if not exists emergency_assembly_point jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- Yard layouts
-- ---------------------------------------------------------------------------
create table if not exists public.yard_layouts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  depot_id uuid not null references public.depots (id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  active_version_id uuid,
  canvas_width numeric not null default 1000,
  canvas_height numeric not null default 700,
  background_image_url text,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND',
  unique (depot_id, name)
);

create table if not exists public.yard_layout_versions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  layout_id uuid not null references public.yard_layouts (id) on delete cascade,
  version_number integer not null,
  label text not null default '',
  published_at timestamptz,
  published_by uuid references public.users (id),
  snapshot jsonb not null default '{}'::jsonb,
  change_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (layout_id, version_number)
);

alter table public.yard_layouts
  add constraint yard_layouts_active_version_fk
  foreign key (active_version_id) references public.yard_layout_versions (id)
  deferrable initially deferred;

-- ---------------------------------------------------------------------------
-- Zone extensions
-- ---------------------------------------------------------------------------
alter table public.depot_zones
  add column if not exists layout_id uuid references public.yard_layouts (id) on delete set null,
  add column if not exists polygon_coordinates jsonb not null default '[]'::jsonb,
  add column if not exists colour_key text,
  add column if not exists vehicle_access boolean not null default true,
  add column if not exists pedestrian_access boolean not null default false,
  add column if not exists parking_allowed boolean not null default false,
  add column if not exists operational_rules jsonb not null default '{}'::jsonb,
  add column if not exists display_order integer not null default 0;

-- ---------------------------------------------------------------------------
-- Parking bay extensions
-- ---------------------------------------------------------------------------
alter table public.parking_bays
  add column if not exists layout_id uuid references public.yard_layouts (id) on delete set null,
  add column if not exists bay_number integer,
  add column if not exists display_name text,
  add column if not exists position_x numeric not null default 0,
  add column if not exists position_y numeric not null default 0,
  add column if not exists width numeric not null default 64,
  add column if not exists height numeric not null default 120,
  add column if not exists rotation numeric not null default 0,
  add column if not exists parking_direction text,
  add column if not exists capacity integer not null default 1,
  add column if not exists operational_status text not null default 'available',
  add column if not exists is_lifo boolean not null default false,
  add column if not exists is_reserved boolean not null default false,
  add column if not exists is_accessible boolean not null default false,
  add column if not exists notes text,
  add column if not exists qr_token text,
  add column if not exists lifo_group_id uuid;

create unique index if not exists parking_bays_qr_token_idx
  on public.parking_bays (qr_token)
  where qr_token is not null;

-- ---------------------------------------------------------------------------
-- LIFO groups
-- ---------------------------------------------------------------------------
create table if not exists public.lifo_groups (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  depot_id uuid not null references public.depots (id) on delete cascade,
  layout_id uuid references public.yard_layouts (id) on delete set null,
  name text not null,
  bay_ids uuid[] not null default '{}',
  exit_order text not null default 'front_first',
  maximum_vehicles integer,
  access_direction text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.parking_bays
  add constraint parking_bays_lifo_group_fk
  foreign key (lifo_group_id) references public.lifo_groups (id)
  on delete set null;

-- ---------------------------------------------------------------------------
-- Vehicle locations (one active per vehicle)
-- ---------------------------------------------------------------------------
create table if not exists public.vehicle_locations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  depot_id uuid not null references public.depots (id) on delete cascade,
  location_type text not null default 'BAY',
  bay_id uuid references public.parking_bays (id) on delete set null,
  zone_id uuid references public.depot_zones (id) on delete set null,
  free_text_location text,
  latitude double precision,
  longitude double precision,
  confidence text not null default 'unverified',
  source text not null default 'SYSTEM',
  reported_by uuid references public.users (id),
  reported_at timestamptz not null default timezone('utc', now()),
  confirmed_by uuid references public.users (id),
  confirmed_at timestamptz,
  active boolean not null default true,
  layout_version_id uuid references public.yard_layout_versions (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists vehicle_locations_one_active_per_vehicle
  on public.vehicle_locations (vehicle_id)
  where active = true;

create index if not exists vehicle_locations_depot_active_idx
  on public.vehicle_locations (company_id, depot_id, active);

-- ---------------------------------------------------------------------------
-- Bay reservations
-- ---------------------------------------------------------------------------
create table if not exists public.bay_reservations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  depot_id uuid not null references public.depots (id) on delete cascade,
  bay_id uuid not null references public.parking_bays (id) on delete cascade,
  reservation_type text not null,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  start_time timestamptz not null,
  end_time timestamptz,
  reason text,
  created_by uuid references public.users (id),
  priority text not null default 'routine',
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Yard issues (hazards)
-- ---------------------------------------------------------------------------
create table if not exists public.yard_issues (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  depot_id uuid not null references public.depots (id) on delete cascade,
  zone_id uuid references public.depot_zones (id) on delete set null,
  bay_id uuid references public.parking_bays (id) on delete set null,
  issue_type text not null,
  severity text not null default 'action_required',
  description text not null,
  reported_by uuid references public.users (id),
  reported_at timestamptz not null default timezone('utc', now()),
  assigned_to uuid references public.users (id),
  due_at timestamptz,
  status text not null default 'open',
  photographs jsonb not null default '[]'::jsonb,
  resolution text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Yard movement extensions
-- ---------------------------------------------------------------------------
alter table public.yard_movements
  add column if not exists from_bay_id uuid references public.parking_bays (id) on delete set null,
  add column if not exists to_bay_id uuid references public.parking_bays (id) on delete set null,
  add column if not exists from_zone_id uuid references public.depot_zones (id) on delete set null,
  add column if not exists to_zone_id uuid references public.depot_zones (id) on delete set null,
  add column if not exists movement_reason_code text,
  add column if not exists authorised_by text,
  add column if not exists mileage_before integer,
  add column if not exists mileage_after integer,
  add column if not exists evidence jsonb not null default '[]'::jsonb,
  add column if not exists layout_version_id uuid references public.yard_layout_versions (id) on delete set null,
  add column if not exists corrected_by_movement_id uuid references public.yard_movements (id) on delete set null;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.yard_layouts enable row level security;
alter table public.yard_layout_versions enable row level security;
alter table public.lifo_groups enable row level security;
alter table public.vehicle_locations enable row level security;
alter table public.bay_reservations enable row level security;
alter table public.yard_issues enable row level security;

create policy yard_layouts_company_select on public.yard_layouts
  for select using (private.user_has_company(company_id));

create policy yard_layout_versions_company_select on public.yard_layout_versions
  for select using (private.user_has_company(company_id));

create policy lifo_groups_company_select on public.lifo_groups
  for select using (private.user_has_company(company_id));

create policy vehicle_locations_company_select on public.vehicle_locations
  for select using (private.user_has_company(company_id));

create policy bay_reservations_company_select on public.bay_reservations
  for select using (private.user_has_company(company_id));

create policy yard_issues_company_select on public.yard_issues
  for select using (private.user_has_company(company_id));

-- Writes via command-api service role

-- ---------------------------------------------------------------------------
-- Updated-at triggers
-- ---------------------------------------------------------------------------
create trigger yard_layouts_set_updated_at
  before update on public.yard_layouts
  for each row execute function public.set_updated_at();

create trigger vehicle_locations_set_updated_at
  before update on public.vehicle_locations
  for each row execute function public.set_updated_at();
