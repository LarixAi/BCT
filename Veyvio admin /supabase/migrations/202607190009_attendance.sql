-- Live Attendance: leave + manager overrides + notes.
-- Day board / scores project primarily from duties (planned vs actual sign-on).

create table if not exists public.attendance_leave_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  person_id uuid not null,
  person_kind text not null check (person_kind in ('driver', 'staff')),
  person_name text not null,
  person_number text,
  depot_name text,
  reference text not null,
  leave_type text not null,
  status text not null check (status in ('pending', 'approved', 'rejected', 'cancelled', 'moved')),
  start_date date not null,
  end_date date not null,
  start_time time,
  end_time time,
  partial_day boolean not null default false,
  reason text not null default '',
  attachment_label text,
  submitted_at timestamptz not null default timezone('utc', now()),
  decided_at timestamptz,
  decided_by text,
  impact jsonb not null default '{}'::jsonb,
  previous_window jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists attendance_leave_company_status_idx
  on public.attendance_leave_requests (company_id, status, start_date);

create index if not exists attendance_leave_person_idx
  on public.attendance_leave_requests (company_id, person_id, start_date);

create table if not exists public.attendance_leave_audit (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  leave_request_id uuid not null references public.attendance_leave_requests (id) on delete cascade,
  at timestamptz not null default timezone('utc', now()),
  actor_name text not null,
  action text not null,
  detail text not null default ''
);

create index if not exists attendance_leave_audit_leave_idx
  on public.attendance_leave_audit (leave_request_id, at);

create table if not exists public.attendance_day_overrides (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  person_id uuid not null,
  operational_date date not null,
  status text,
  reported_reason text,
  manager_classification text,
  note text,
  actor_name text,
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, person_id, operational_date)
);

create table if not exists public.attendance_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  person_id uuid not null,
  at timestamptz not null default timezone('utc', now()),
  author text not null,
  note text not null,
  kind text not null default 'manager' check (kind in ('manager', 'adjustment'))
);

create index if not exists attendance_notes_person_idx
  on public.attendance_notes (company_id, person_id, at desc);

create table if not exists public.attendance_return_to_work (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  person_id uuid not null,
  interview_date date not null,
  summary text not null,
  completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists attendance_rtw_person_idx
  on public.attendance_return_to_work (company_id, person_id, interview_date desc);

comment on table public.attendance_leave_requests is
  'Command Time Off / leave queue — approved leave also drives attendance board status.';
comment on table public.attendance_day_overrides is
  'Manager classification overrides for a person+day when duty-derived status needs correction.';
