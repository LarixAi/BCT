-- Body Condition Inspection System — linked structured tables (append-only inspections).

-- ---------------------------------------------------------------------------
-- body_inspections
-- ---------------------------------------------------------------------------
create table if not exists public.body_inspections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  depot_id uuid references public.depots (id) on delete set null,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  client_inspection_id text,
  reference_number text not null,
  inspection_type text not null,
  inspection_reason text,
  status text not null default 'draft',
  inspection_started_at timestamptz not null default timezone('utc', now()),
  inspection_submitted_at timestamptz,
  inspection_completed_at timestamptz,
  inspector_user_id uuid references auth.users (id) on delete set null,
  reviewer_user_id uuid references auth.users (id) on delete set null,
  mileage numeric,
  parking_bay_id uuid,
  parking_bay_label text,
  vehicle_assignment_id uuid,
  driver_id uuid references public.drivers (id) on delete set null,
  duty_id uuid references public.duties (id) on delete set null,
  overall_condition text,
  recommended_vehicle_status text,
  approved_vehicle_status text,
  visibility_limitations text,
  notes text,
  device_id text,
  app_version text,
  source_app text not null default 'YARD',
  version integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  unique (company_id, reference_number),
  unique (company_id, client_inspection_id)
);

create index if not exists body_inspections_company_vehicle_idx
  on public.body_inspections (company_id, vehicle_id, inspection_started_at desc);

create index if not exists body_inspections_company_status_idx
  on public.body_inspections (company_id, status, inspection_started_at desc);

-- ---------------------------------------------------------------------------
-- body_inspection_media
-- ---------------------------------------------------------------------------
create table if not exists public.body_inspection_media (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  inspection_id uuid not null references public.body_inspections (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  damage_case_id uuid,
  media_type text not null default 'photo',
  view_category text,
  storage_key text,
  thumbnail_key text,
  mime_type text,
  file_size bigint,
  checksum text,
  captured_at timestamptz not null default timezone('utc', now()),
  uploaded_at timestamptz,
  captured_by_user_id uuid references auth.users (id) on delete set null,
  capture_source text not null default 'live_camera',
  latitude numeric,
  longitude numeric,
  metadata jsonb not null default '{}'::jsonb,
  withdrawn_at timestamptz,
  withdrawn_reason text,
  withdrawn_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists body_inspection_media_inspection_idx
  on public.body_inspection_media (inspection_id, captured_at);

-- ---------------------------------------------------------------------------
-- vehicle_damage_cases
-- ---------------------------------------------------------------------------
create table if not exists public.vehicle_damage_cases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  reference_number text not null,
  first_detected_inspection_id uuid references public.body_inspections (id) on delete set null,
  first_detected_at timestamptz not null default timezone('utc', now()),
  damage_type text not null,
  vehicle_zone text not null,
  severity text not null default 'cosmetic',
  safety_impact text,
  description text,
  suspected_cause text,
  status text not null default 'provisional',
  is_existing_damage boolean not null default false,
  is_disputed boolean not null default false,
  requires_investigation boolean not null default false,
  requires_repair boolean not null default false,
  vor_triggered boolean not null default false,
  assigned_team text,
  assigned_user_id uuid references auth.users (id) on delete set null,
  incident_id uuid,
  insurance_case_id uuid,
  repair_work_order_id text,
  closed_at timestamptz,
  closed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  unique (company_id, reference_number)
);

create index if not exists vehicle_damage_cases_company_vehicle_idx
  on public.vehicle_damage_cases (company_id, vehicle_id, first_detected_at desc);

create index if not exists vehicle_damage_cases_company_status_idx
  on public.vehicle_damage_cases (company_id, status);

alter table public.body_inspection_media
  add constraint body_inspection_media_damage_case_fk
  foreign key (damage_case_id) references public.vehicle_damage_cases (id) on delete set null;

-- ---------------------------------------------------------------------------
-- damage_observations
-- ---------------------------------------------------------------------------
create table if not exists public.damage_observations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  damage_case_id uuid not null references public.vehicle_damage_cases (id) on delete cascade,
  inspection_id uuid not null references public.body_inspections (id) on delete cascade,
  observation_type text not null default 'sighting',
  condition_change text,
  severity_at_observation text,
  classification text,
  notes text,
  observed_by uuid references auth.users (id) on delete set null,
  observed_by_name text,
  observed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists damage_observations_case_idx
  on public.damage_observations (damage_case_id, observed_at desc);

create index if not exists damage_observations_inspection_idx
  on public.damage_observations (inspection_id);

-- ---------------------------------------------------------------------------
-- vehicle_condition_markers
-- ---------------------------------------------------------------------------
create table if not exists public.vehicle_condition_markers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  damage_case_id uuid not null references public.vehicle_damage_cases (id) on delete cascade,
  diagram_view text not null,
  zone_code text not null,
  x_coordinate numeric not null,
  y_coordinate numeric not null,
  width numeric,
  height numeric,
  rotation numeric default 0,
  annotation text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists vehicle_condition_markers_case_idx
  on public.vehicle_condition_markers (damage_case_id);

-- ---------------------------------------------------------------------------
-- inspection_reviews
-- ---------------------------------------------------------------------------
create table if not exists public.inspection_reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  inspection_id uuid not null references public.body_inspections (id) on delete cascade,
  reviewer_id uuid references auth.users (id) on delete set null,
  reviewer_name text,
  review_decision text not null,
  vehicle_status_decision text,
  comments text,
  reviewed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists inspection_reviews_inspection_idx
  on public.inspection_reviews (inspection_id, reviewed_at desc);

-- ---------------------------------------------------------------------------
-- condition_acknowledgements
-- ---------------------------------------------------------------------------
create table if not exists public.condition_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  inspection_id uuid references public.body_inspections (id) on delete set null,
  assignment_id uuid,
  driver_id uuid references public.drivers (id) on delete set null,
  acknowledgement_type text not null,
  acknowledged_at timestamptz not null default timezone('utc', now()),
  condition_difference_reported boolean not null default false,
  driver_statement text,
  signature_method text,
  device_id text,
  latitude numeric,
  longitude numeric,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users (id) on delete set null
);

create index if not exists condition_acknowledgements_vehicle_idx
  on public.condition_acknowledgements (company_id, vehicle_id, acknowledged_at desc);

-- ---------------------------------------------------------------------------
-- damage_responsibility_reviews
-- ---------------------------------------------------------------------------
create table if not exists public.damage_responsibility_reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  damage_case_id uuid not null references public.vehicle_damage_cases (id) on delete cascade,
  review_status text not null default 'open',
  relevant_assignment_id uuid,
  relevant_driver_id uuid references public.drivers (id) on delete set null,
  finding text,
  evidence_summary text,
  decision_by uuid references auth.users (id) on delete set null,
  decision_at timestamptz,
  appeal_status text,
  confidential_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists damage_responsibility_reviews_case_idx
  on public.damage_responsibility_reviews (damage_case_id);

-- ---------------------------------------------------------------------------
-- body_condition_audit_events
-- ---------------------------------------------------------------------------
create table if not exists public.body_condition_audit_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_name text,
  previous_value jsonb,
  new_value jsonb,
  reason text,
  device_id text,
  session_id text,
  occurred_at timestamptz not null default timezone('utc', now())
);

create index if not exists body_condition_audit_entity_idx
  on public.body_condition_audit_events (company_id, entity_type, entity_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.body_inspections enable row level security;
alter table public.body_inspection_media enable row level security;
alter table public.vehicle_damage_cases enable row level security;
alter table public.damage_observations enable row level security;
alter table public.vehicle_condition_markers enable row level security;
alter table public.inspection_reviews enable row level security;
alter table public.condition_acknowledgements enable row level security;
alter table public.damage_responsibility_reviews enable row level security;
alter table public.body_condition_audit_events enable row level security;

create policy body_inspections_company_select on public.body_inspections
  for select to authenticated using (private.user_has_company(company_id));

create policy body_inspection_media_company_select on public.body_inspection_media
  for select to authenticated using (private.user_has_company(company_id));

create policy vehicle_damage_cases_company_select on public.vehicle_damage_cases
  for select to authenticated using (private.user_has_company(company_id));

create policy damage_observations_company_select on public.damage_observations
  for select to authenticated using (private.user_has_company(company_id));

create policy vehicle_condition_markers_company_select on public.vehicle_condition_markers
  for select to authenticated using (private.user_has_company(company_id));

create policy inspection_reviews_company_select on public.inspection_reviews
  for select to authenticated using (private.user_has_company(company_id));

create policy condition_acknowledgements_company_select on public.condition_acknowledgements
  for select to authenticated using (private.user_has_company(company_id));

create policy damage_responsibility_reviews_company_select on public.damage_responsibility_reviews
  for select to authenticated using (private.user_has_company(company_id));

create policy body_condition_audit_company_select on public.body_condition_audit_events
  for select to authenticated using (private.user_has_company(company_id));

comment on table public.body_inspections is
  'Body condition inspections — append-only moments in time. Never replace previous inspection.';

comment on table public.vehicle_damage_cases is
  'Long-term damage record linking all observations of the same physical damage.';

comment on table public.damage_responsibility_reviews is
  'Confidential responsibility investigation — separate from factual damage record.';
