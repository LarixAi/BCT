-- Veyvio Platform — Phase 2 core operations
-- Modules: customers, passengers, commercial (contracts/pricing stubs), operations (bookings/trips/runs/duties),
-- workforce (drivers/staff), fleet (vehicles), dispatch validation scaffolding, live execution stubs.
-- Shared records; Command API projects authorised views.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.customer_type as enum (
  'local_authority', 'school', 'care_provider', 'nhs_organisation',
  'private_organisation', 'individual', 'other'
);
create type public.booking_type as enum (
  'single', 'return', 'multi_stop', 'recurring', 'urgent', 'group', 'school_route'
);
create type public.booking_status as enum (
  'draft', 'pending_validation', 'pending_approval', 'confirmed', 'planned',
  'partially_assigned', 'assigned', 'in_progress', 'completed', 'cancelled', 'rejected'
);
create type public.trip_status as enum (
  'planned', 'assigned', 'in_progress', 'completed', 'cancelled', 'no_show', 'aborted'
);
create type public.run_status as enum (
  'draft', 'planned', 'assigned', 'in_progress', 'completed', 'cancelled'
);
create type public.duty_status as enum (
  'planned', 'signed_on', 'in_progress', 'signed_off', 'cancelled'
);
create type public.vehicle_operational_status as enum (
  'draft', 'onboarding', 'available', 'allocated', 'in_service', 'awaiting_check',
  'restricted', 'vor', 'maintenance', 'quarantined', 'decommissioned'
);
create type public.driver_status as enum (
  'draft', 'active', 'suspended', 'inactive', 'left'
);
create type public.employment_status as enum (
  'active', 'probation', 'suspended', 'left', 'contractor'
);
create type public.defect_status as enum (
  'reported', 'under_review', 'accepted_for_monitoring', 'repair_required',
  'work_order_created', 'repair_in_progress', 'awaiting_verification', 'closed', 'rejected'
);
create type public.operational_decision as enum (
  'safe_to_continue', 'continue_with_restriction', 'return_to_depot',
  'stop_when_safe', 'do_not_move', 'vor'
);
create type public.incident_severity as enum ('low', 'medium', 'high', 'critical');
create type public.work_order_status as enum (
  'draft', 'open', 'scheduled', 'in_progress', 'awaiting_parts', 'completed', 'cancelled'
);
create type public.assignment_request_status as enum (
  'proposed', 'validated', 'accepted', 'rejected', 'overridden', 'cancelled'
);

-- ---------------------------------------------------------------------------
-- customers / commercial
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_type public.customer_type not null default 'private_organisation',
  legal_name text not null,
  trading_name text not null,
  billing_address jsonb not null default '{}'::jsonb,
  status public.record_lifecycle_status not null default 'active',
  account_manager_id uuid references public.users (id),
  payment_terms text,
  purchase_order_required boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND',
  archived_at timestamptz,
  archived_by uuid references public.users (id),
  external_reference text
);

create table public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  name text not null,
  role text,
  email text,
  phone text,
  is_primary boolean not null default false,
  communication_preferences jsonb not null default '{}'::jsonb,
  status public.record_lifecycle_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND'
);

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  name text not null,
  address jsonb not null default '{}'::jsonb,
  main_contact_id uuid references public.customer_contacts (id),
  opening_time time,
  closing_time time,
  term_calendar_id uuid,
  arrival_instructions text,
  collection_instructions text,
  accessibility_notes text,
  status public.record_lifecycle_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND',
  external_reference text
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  contract_number text not null,
  name text not null,
  start_date date not null,
  end_date date,
  status public.record_lifecycle_status not null default 'active',
  service_type text,
  billing_method text,
  notice_rules jsonb not null default '{}'::jsonb,
  performance_targets jsonb not null default '{}'::jsonb,
  document_ids uuid[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND',
  unique (company_id, contract_number)
);

create table public.rate_cards (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  contract_id uuid references public.contracts (id) on delete set null,
  name text not null,
  currency text not null default 'GBP',
  effective_from date not null,
  effective_to date,
  status public.record_lifecycle_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND'
);

-- ---------------------------------------------------------------------------
-- passengers (privacy-sensitive; Command full, Driver need-to-know, Yard none)
-- ---------------------------------------------------------------------------
create table public.passengers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  external_reference text,
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  status public.record_lifecycle_status not null default 'active',
  preferred_name text,
  photo_url text,
  primary_address_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND',
  archived_at timestamptz,
  archived_by uuid references public.users (id)
);

create table public.passenger_addresses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  passenger_id uuid not null references public.passengers (id) on delete cascade,
  label text not null default 'home',
  address jsonb not null default '{}'::jsonb,
  latitude double precision,
  longitude double precision,
  access_instructions text,
  parking_instructions text,
  valid_from date,
  valid_to date,
  status public.record_lifecycle_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND'
);

-- primary_address_id is soft-linked to passenger_addresses.id (avoids circular FK inserts).

create table public.passenger_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  passenger_id uuid not null references public.passengers (id) on delete cascade,
  name text not null,
  relationship text,
  phone text,
  email text,
  contact_priority integer not null default 1,
  authorised_for_collection boolean not null default false,
  emergency_contact boolean not null default false,
  status public.record_lifecycle_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND'
);

create table public.passenger_needs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  passenger_id uuid not null references public.passengers (id) on delete cascade,
  need_type text not null,
  description text,
  severity text,
  transport_impact text,
  effective_from date,
  effective_to date,
  status public.record_lifecycle_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND'
);

-- ---------------------------------------------------------------------------
-- workforce
-- ---------------------------------------------------------------------------
create table public.staff_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  employee_number text,
  first_name text not null,
  last_name text not null,
  job_title text,
  department_id uuid,
  primary_depot_id uuid references public.depots (id),
  employment_status public.employment_status not null default 'active',
  user_id uuid references public.users (id),
  status public.record_lifecycle_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND',
  external_reference text
);

alter table public.company_memberships
  add constraint company_memberships_staff_fk
  foreign key (staff_id) references public.staff_members (id);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  staff_id uuid references public.staff_members (id),
  driver_number text not null,
  status public.driver_status not null default 'active',
  primary_depot_id uuid references public.depots (id),
  employment_type text,
  licence_number_encrypted text,
  licence_country text not null default 'GB',
  licence_expiry_date date,
  vehicle_categories text[] not null default '{}',
  start_date date,
  end_date date,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND',
  archived_at timestamptz,
  archived_by uuid references public.users (id),
  external_reference text,
  unique (company_id, driver_number)
);

create table public.driver_capabilities (
  driver_id uuid not null references public.drivers (id) on delete cascade,
  capability_code text not null,
  valid_from date,
  valid_to date,
  source text,
  primary key (driver_id, capability_code)
);

create table public.driver_eligibility_results (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  driver_id uuid not null references public.drivers (id) on delete cascade,
  checked_at timestamptz not null default timezone('utc', now()),
  eligible boolean not null,
  blocking_reasons text[] not null default '{}',
  warnings text[] not null default '{}',
  next_expiry_at timestamptz,
  ruleset_version text,
  created_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- fleet
-- ---------------------------------------------------------------------------
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  fleet_number text not null,
  registration text not null,
  vin_encrypted text,
  make text,
  model text,
  year integer,
  vehicle_class text,
  body_type text,
  fuel_type text,
  colour text,
  seat_capacity integer not null default 0,
  wheelchair_capacity integer not null default 0,
  standing_capacity integer not null default 0,
  primary_depot_id uuid references public.depots (id),
  operational_status public.vehicle_operational_status not null default 'draft',
  ownership_type text,
  commissioned_at timestamptz,
  decommissioned_at timestamptz,
  status public.record_lifecycle_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND',
  archived_at timestamptz,
  archived_by uuid references public.users (id),
  external_reference text,
  unique (company_id, fleet_number)
);

create table public.vehicle_capabilities (
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  capability_code text not null,
  quantity integer not null default 1,
  primary key (vehicle_id, capability_code)
);

create table public.vehicle_status_transitions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  from_status public.vehicle_operational_status,
  to_status public.vehicle_operational_status not null,
  reason text,
  authorised_by uuid references public.users (id),
  occurred_at timestamptz not null default timezone('utc', now()),
  evidence_ids uuid[] not null default '{}',
  source_app public.source_app not null default 'COMMAND',
  created_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- bookings / trips / runs / duties (separate concepts)
-- ---------------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid references public.customers (id),
  contract_id uuid references public.contracts (id),
  booking_reference text not null,
  booking_type public.booking_type not null default 'single',
  priority text not null default 'normal',
  requested_by_contact_id uuid references public.customer_contacts (id),
  passenger_ids uuid[] not null default '{}',
  requested_date date,
  status public.booking_status not null default 'draft',
  source text not null default 'command',
  purchase_order_number text,
  notes text,
  depot_id uuid references public.depots (id),
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND',
  client_generated_id text,
  external_reference text,
  unique (company_id, booking_reference)
);

create table public.booking_legs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  sequence integer not null,
  pickup_location jsonb not null default '{}'::jsonb,
  destination_location jsonb not null default '{}'::jsonb,
  requested_pickup_time timestamptz,
  requested_arrival_time timestamptz,
  passenger_ids uuid[] not null default '{}',
  vehicle_requirements jsonb not null default '{}'::jsonb,
  escort_requirements jsonb not null default '{}'::jsonb,
  special_instructions text,
  status public.record_lifecycle_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND',
  unique (booking_id, sequence)
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  booking_id uuid references public.bookings (id),
  booking_leg_id uuid references public.booking_legs (id),
  trip_reference text not null,
  service_date date not null,
  planned_pickup_at timestamptz,
  planned_arrival_at timestamptz,
  pickup_location jsonb not null default '{}'::jsonb,
  destination_location jsonb not null default '{}'::jsonb,
  passenger_ids uuid[] not null default '{}',
  status public.trip_status not null default 'planned',
  priority text not null default 'normal',
  required_vehicle_capabilities text[] not null default '{}',
  required_driver_capabilities text[] not null default '{}',
  depot_id uuid references public.depots (id),
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND',
  unique (company_id, trip_reference)
);

create table public.runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  run_reference text not null,
  service_date date not null,
  depot_id uuid references public.depots (id),
  planned_start_at timestamptz,
  planned_end_at timestamptz,
  status public.run_status not null default 'planned',
  driver_id uuid references public.drivers (id),
  vehicle_id uuid references public.vehicles (id),
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND',
  unique (company_id, run_reference)
);

create table public.run_trips (
  run_id uuid not null references public.runs (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  sequence integer not null,
  planned_travel_minutes integer,
  planned_distance numeric,
  primary key (run_id, trip_id),
  unique (run_id, sequence)
);

create table public.trip_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  run_id uuid references public.runs (id),
  driver_id uuid references public.drivers (id),
  vehicle_id uuid references public.vehicles (id),
  assigned_at timestamptz not null default timezone('utc', now()),
  assigned_by uuid references public.users (id),
  status text not null default 'active',
  effective_from timestamptz,
  effective_to timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND'
);

create table public.duties (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  driver_id uuid not null references public.drivers (id),
  depot_id uuid references public.depots (id),
  service_date date not null,
  planned_sign_on_at timestamptz,
  planned_sign_off_at timestamptz,
  actual_sign_on_at timestamptz,
  actual_sign_off_at timestamptz,
  status public.duty_status not null default 'planned',
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND'
);

create table public.duty_runs (
  duty_id uuid not null references public.duties (id) on delete cascade,
  run_id uuid not null references public.runs (id) on delete cascade,
  sequence integer not null,
  primary key (duty_id, run_id),
  unique (duty_id, sequence)
);

-- ---------------------------------------------------------------------------
-- dispatch
-- ---------------------------------------------------------------------------
create table public.dispatch_assignment_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  trip_ids uuid[] not null default '{}',
  run_id uuid references public.runs (id),
  proposed_driver_id uuid references public.drivers (id),
  proposed_vehicle_id uuid references public.vehicles (id),
  requested_by uuid references public.users (id),
  validation_result jsonb not null default '{}'::jsonb,
  status public.assignment_request_status not null default 'proposed',
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND'
);

create table public.dispatch_overrides (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  assignment_id uuid not null references public.dispatch_assignment_requests (id) on delete cascade,
  rule_code text not null,
  reason text not null,
  approved_by uuid references public.users (id),
  approved_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- live operations (execution separate from planning)
-- ---------------------------------------------------------------------------
create table public.trip_executions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  run_id uuid references public.runs (id),
  driver_id uuid references public.drivers (id),
  vehicle_id uuid references public.vehicles (id),
  status text not null default 'not_started',
  started_at timestamptz,
  completed_at timestamptz,
  current_stop_sequence integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  version integer not null default 1,
  source_app public.source_app not null default 'SYSTEM',
  unique (trip_id)
);

create table public.trip_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  trip_execution_id uuid not null references public.trip_executions (id) on delete cascade,
  event_type text not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default timezone('utc', now()),
  latitude double precision,
  longitude double precision,
  actor_id uuid,
  source_app public.source_app not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.operational_exceptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  type text not null,
  severity public.incident_severity not null default 'medium',
  status text not null default 'open',
  source_entity_type text,
  source_entity_id text,
  title text not null,
  description text,
  detected_at timestamptz not null default timezone('utc', now()),
  owner_id uuid references public.users (id),
  resolution_due_at timestamptz,
  resolved_at timestamptz,
  resolution text,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'SYSTEM'
);

-- ---------------------------------------------------------------------------
-- safety / maintenance (core tables for Command lists)
-- ---------------------------------------------------------------------------
create table public.defects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id),
  defect_reference text not null,
  source_type text,
  source_id text,
  reported_by uuid references public.users (id),
  reported_at timestamptz not null default timezone('utc', now()),
  category text,
  component text,
  severity text not null default 'attention',
  description text not null,
  location_on_vehicle text,
  status public.defect_status not null default 'reported',
  operational_decision public.operational_decision,
  depot_id uuid references public.depots (id),
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND',
  occurred_at timestamptz,
  received_at timestamptz,
  client_generated_id text,
  unique (company_id, defect_reference)
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  incident_reference text not null,
  incident_type text not null,
  severity public.incident_severity not null default 'medium',
  status text not null default 'open',
  occurred_at timestamptz not null,
  reported_at timestamptz not null default timezone('utc', now()),
  location jsonb not null default '{}'::jsonb,
  reported_by uuid references public.users (id),
  vehicle_id uuid references public.vehicles (id),
  driver_id uuid references public.drivers (id),
  trip_id uuid references public.trips (id),
  run_id uuid references public.runs (id),
  passenger_ids uuid[] not null default '{}',
  description text not null,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND',
  unique (company_id, incident_reference)
);

create table public.maintenance_work_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id),
  work_order_reference text not null,
  source_type text,
  source_id text,
  priority text not null default 'normal',
  status public.work_order_status not null default 'open',
  assigned_supplier_id uuid,
  assigned_technician_id uuid,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  estimated_cost numeric,
  actual_cost numeric,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND',
  unique (company_id, work_order_reference)
);

create table public.vor_cases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id),
  status text not null default 'active',
  reason_code text not null,
  source_defect_id uuid references public.defects (id),
  source_inspection_id uuid,
  declared_by uuid references public.users (id),
  declared_at timestamptz not null default timezone('utc', now()),
  physical_location text,
  expected_resolution_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND'
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  conversation_id uuid,
  sender_id uuid references public.users (id),
  body text not null,
  message_type text not null default 'text',
  sent_at timestamptz not null default timezone('utc', now()),
  source_app public.source_app not null default 'COMMAND',
  reply_to_message_id uuid,
  status text not null default 'sent',
  created_at timestamptz not null default timezone('utc', now())
);

create table public.command_page_snapshots (
  company_id uuid not null references public.companies (id) on delete cascade,
  path text not null,
  title text not null,
  summary text not null default '',
  items jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (company_id, path)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index customers_company_idx on public.customers (company_id);
create index passengers_company_idx on public.passengers (company_id);
create index bookings_company_status_idx on public.bookings (company_id, status);
create index trips_company_date_idx on public.trips (company_id, service_date);
create index runs_company_date_idx on public.runs (company_id, service_date);
create index duties_company_date_idx on public.duties (company_id, service_date);
create index drivers_company_idx on public.drivers (company_id);
create index vehicles_company_status_idx on public.vehicles (company_id, operational_status);
create index defects_company_status_idx on public.defects (company_id, status);
create index incidents_company_idx on public.incidents (company_id);
create index exceptions_company_status_idx on public.operational_exceptions (company_id, status);
create index trip_events_execution_idx on public.trip_events (trip_execution_id, occurred_at);

-- ---------------------------------------------------------------------------
-- Updated-at triggers
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'customers','customer_contacts','schools','contracts','rate_cards','passengers',
    'passenger_addresses','passenger_contacts','passenger_needs','staff_members','drivers',
    'vehicles','bookings','booking_legs','trips','runs','trip_assignments','duties',
    'dispatch_assignment_requests','trip_executions','operational_exceptions','defects',
    'incidents','maintenance_work_orders','vor_cases'
  ]
  loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'customers','customer_contacts','schools','contracts','rate_cards','passengers',
    'passenger_addresses','passenger_contacts','passenger_needs','staff_members','drivers',
    'driver_capabilities','driver_eligibility_results','vehicles','vehicle_capabilities',
    'vehicle_status_transitions','bookings','booking_legs','trips','runs','run_trips',
    'trip_assignments','duties','duty_runs','dispatch_assignment_requests','dispatch_overrides',
    'trip_executions','trip_events','operational_exceptions','defects','incidents',
    'maintenance_work_orders','vor_cases','messages','command_page_snapshots'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    if t in ('driver_capabilities', 'vehicle_capabilities', 'run_trips', 'duty_runs') then
      -- join tables without company_id: covered via parent policies in gateway; allow authenticated select via service role primarily
      execute format(
        'create policy %I_authenticated_select on public.%I for select using (auth.role() = ''authenticated'')',
        t, t
      );
    elsif t = 'command_page_snapshots' then
      execute format(
        'create policy %I_company_select on public.%I for select using (public.user_has_company(company_id))',
        t, t
      );
    else
      execute format(
        'create policy %I_company_select on public.%I for select using (public.user_has_company(company_id))',
        t, t
      );
    end if;
  end loop;
end $$;

grant select on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
