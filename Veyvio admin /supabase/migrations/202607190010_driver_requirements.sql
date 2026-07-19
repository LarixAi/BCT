-- Activation requirements: request history + status overrides for onboarding resolution.

create table if not exists public.driver_requirements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  driver_id uuid not null references public.drivers (id) on delete cascade,
  definition_key text not null,
  requirement_type text not null default 'document',
  status_override text,
  assigned_to_name text,
  due_at date,
  last_requested_at timestamptz,
  last_requested_by uuid references public.users (id),
  last_requested_channels text[] not null default '{}',
  opened_at timestamptz,
  request_count integer not null default 0,
  reminder_count integer not null default 0,
  last_reminder_at timestamptz,
  rejection_reason text,
  internal_note text,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  unique (driver_id, definition_key)
);

create index if not exists driver_requirements_driver_idx
  on public.driver_requirements (company_id, driver_id);

create table if not exists public.driver_requirement_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  driver_id uuid not null references public.drivers (id) on delete cascade,
  requirement_id uuid references public.driver_requirements (id) on delete set null,
  definition_key text not null,
  requested_by uuid references public.users (id),
  requested_by_name text not null default 'Admin',
  channels text[] not null default '{}',
  status text not null default 'sent',
  message text,
  due_at date,
  sent_at timestamptz not null default timezone('utc', now()),
  delivered_at timestamptz,
  opened_at timestamptz,
  completed_at timestamptz,
  reminder_count integer not null default 0,
  last_reminder_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists driver_requirement_requests_driver_idx
  on public.driver_requirement_requests (company_id, driver_id, sent_at desc);

create index if not exists driver_requirement_requests_key_idx
  on public.driver_requirement_requests (driver_id, definition_key, sent_at desc);

do $$
declare
  t text;
begin
  foreach t in array array['driver_requirements', 'driver_requirement_requests']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I_company_select on public.%I for select using (public.user_has_company(company_id))',
      t, t
    );
  end loop;
end $$;

grant select on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
