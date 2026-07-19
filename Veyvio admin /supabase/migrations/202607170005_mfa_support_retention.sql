-- MFA login challenges, JIT support access, retention defaults, export jobs.

create table if not exists public.mfa_login_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  created_ip text,
  user_agent text
);

create table if not exists public.privileged_access_grants (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  grantee_user_id uuid not null references public.users (id),
  granted_by uuid references public.users (id),
  reason text not null,
  ticket_reference text,
  access_level text not null default 'read_only',
  starts_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.support_access_sessions (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references public.privileged_access_grants (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  support_user_id uuid not null references public.users (id),
  started_at timestamptz not null default timezone('utc', now()),
  ended_at timestamptz,
  banner_acknowledged_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.data_export_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  requested_by uuid not null references public.users (id),
  export_type text not null default 'company_full',
  status text not null default 'queued',
  file_id uuid,
  started_at timestamptz,
  completed_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.mfa_login_challenges enable row level security;
alter table public.privileged_access_grants enable row level security;
alter table public.support_access_sessions enable row level security;
alter table public.data_export_jobs enable row level security;

create policy privileged_grants_company on public.privileged_access_grants
  for select using (public.user_has_company(company_id));
create policy support_sessions_company on public.support_access_sessions
  for select using (public.user_has_company(company_id));
create policy export_jobs_company on public.data_export_jobs
  for select using (public.user_has_company(company_id));

grant all on table public.mfa_login_challenges to service_role;
grant all on table public.privileged_access_grants to service_role;
grant all on table public.support_access_sessions to service_role;
grant all on table public.data_export_jobs to service_role;
grant select on table public.privileged_access_grants to authenticated;
grant select on table public.support_access_sessions to authenticated;
grant select on table public.data_export_jobs to authenticated;

-- Default retention categories for every existing company
insert into public.data_retention_policies (company_id, category, retention_days)
select c.id, x.category, x.days
from public.companies c
cross join (
  values
    ('unaccepted_invitations', 30),
    ('authentication_logs', 365),
    ('device_sessions', 90),
    ('gps_history', 90),
    ('routine_messages', 365),
    ('trip_records', 2555),
    ('vehicle_checks', 2555),
    ('defects', 2555),
    ('incidents', 3650),
    ('safeguarding_records', 3650),
    ('driver_documents', 2555),
    ('passenger_records', 2555),
    ('audit_events', 3650)
) as x(category, days)
on conflict (company_id, category) do nothing;
