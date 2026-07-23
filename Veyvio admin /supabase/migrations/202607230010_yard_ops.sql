-- Yard operations — shared tasks and movements between Command Admin and Veyvio Yard.

create table if not exists public.yard_tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  depot_id uuid references public.depots (id) on delete set null,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  registration_number text not null default '—',
  task_type text not null,
  title text not null,
  priority text not null default 'routine',
  status text not null default 'open',
  assigned_staff_id uuid,
  assigned_staff_name text,
  due_at timestamptz,
  instructions text,
  evidence_required boolean not null default false,
  blocking_release boolean not null default false,
  sync_status text not null default 'synced',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by text not null default 'System',
  completion_note text,
  source_app text not null default 'command',
  updated_at timestamptz not null default now()
);

create index if not exists yard_tasks_company_depot_idx
  on public.yard_tasks (company_id, depot_id, status, created_at desc);

create table if not exists public.yard_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  depot_id uuid references public.depots (id) on delete set null,
  depot_name text,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  registration_number text not null default '—',
  from_location text not null,
  to_location text not null,
  reason text not null,
  status text not null default 'completed',
  requested_by text not null,
  completed_by text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  note text,
  source_app text not null default 'command',
  created_at timestamptz not null default now()
);

create index if not exists yard_movements_company_depot_idx
  on public.yard_movements (company_id, depot_id, created_at desc);

alter table public.yard_tasks enable row level security;
alter table public.yard_movements enable row level security;
