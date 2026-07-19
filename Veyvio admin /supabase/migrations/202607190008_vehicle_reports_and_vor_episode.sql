-- Vehicle reports spine + enriched VOR episode columns (Command / Yard / Driver).

create table if not exists public.vehicle_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  depot_id uuid references public.depots (id) on delete set null,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  reference text not null,
  report_type text not null,
  report_category text,
  severity text not null default 'moderate',
  stage text not null default 'reported',
  status text not null default 'awaiting_review',
  vehicle_operational_status text,
  title text not null,
  description text not null,
  vehicle_area text,
  reported_by text not null,
  reported_by_role text not null default 'staff',
  reported_at timestamptz not null default now(),
  mileage numeric,
  location text,
  passengers_onboard boolean not null default false,
  safe_to_move boolean,
  vor_required boolean not null default false,
  restriction_type text,
  linked_defect_id uuid,
  linked_work_order_id text,
  linked_vor_id text,
  linked_incident_id uuid,
  linked_check_id uuid,
  assigned_owner text,
  due_at timestamptz,
  root_cause text,
  resolution text,
  verified_by text,
  verified_at timestamptz,
  closed_at timestamptz,
  labour_cost numeric,
  parts_cost numeric,
  external_cost numeric,
  total_cost numeric,
  downtime_hours numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  unique (company_id, reference)
);

create index if not exists vehicle_reports_company_vehicle_idx
  on public.vehicle_reports (company_id, vehicle_id, reported_at desc);

create index if not exists vehicle_reports_company_status_idx
  on public.vehicle_reports (company_id, status, stage);

create table if not exists public.vehicle_report_evidence (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  report_id uuid not null references public.vehicle_reports (id) on delete cascade,
  kind text not null default 'photo',
  label text not null,
  captured_at timestamptz not null default now(),
  url text,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_report_status_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  report_id uuid not null references public.vehicle_reports (id) on delete cascade,
  action text not null,
  actor_name text not null,
  occurred_at timestamptz not null default now(),
  detail text
);

-- Enriched VOR episode fields on vehicle_vor_events if present; otherwise store as JSON on vehicles metadata later.
-- Prefer additive columns when a vor events table exists in a future migration.

alter table public.vehicle_reports enable row level security;
alter table public.vehicle_report_evidence enable row level security;
alter table public.vehicle_report_status_history enable row level security;
