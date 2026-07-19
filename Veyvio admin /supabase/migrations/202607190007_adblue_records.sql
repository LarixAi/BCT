-- Shared AdBlue top-up records for Yard, Driver and Command.
create table if not exists public.adblue_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  depot_id uuid references public.depots (id) on delete set null,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  vehicle_registration text,
  recorded_by_user_id uuid references auth.users (id) on delete set null,
  recorded_by_name text not null,
  recorded_by_role text not null default 'staff',
  physically_added_by text not null default 'self',
  physically_added_by_name text,
  recorded_at timestamptz not null default now(),
  top_up_at timestamptz not null default now(),
  mileage numeric not null,
  mileage_unit text not null default 'miles',
  amount_litres numeric not null check (amount_litres > 0),
  fill_type text not null default 'partial',
  source_type text not null default 'depot_dispenser',
  source_label text,
  supplier text,
  station_location text,
  receipt_reference text,
  cost numeric,
  payment_method text,
  warning_before text not null default 'none',
  warning_cleared text not null default 'not_checked',
  notes text,
  linked_duty_id uuid,
  linked_trip_id uuid,
  linked_task_id uuid,
  linked_defect_id uuid,
  gps_location jsonb,
  offline_created_at timestamptz,
  synced_at timestamptz,
  status text not null default 'recorded',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null
);

create index if not exists adblue_records_company_vehicle_idx
  on public.adblue_records (company_id, vehicle_id, top_up_at desc);

create index if not exists adblue_records_company_top_up_idx
  on public.adblue_records (company_id, top_up_at desc);

alter table public.adblue_records enable row level security;
