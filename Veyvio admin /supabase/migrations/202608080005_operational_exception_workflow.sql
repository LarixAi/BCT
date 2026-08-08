-- F-18: durable operational exception case workflow (raise / assign / escalate / close / notes).

alter table public.operational_exceptions
  add column if not exists escalated boolean not null default false,
  add column if not exists category text not null default 'dispatch',
  add column if not exists type_code text not null default 'manual_exception',
  add column if not exists depot_id uuid references public.depots (id) on delete set null,
  add column if not exists related_record text,
  add column if not exists related_href text;

-- Legacy seed/suspend rows used status = 'open'; map into the Command inbox status model.
update public.operational_exceptions
set status = 'new'
where status = 'open';

alter table public.operational_exceptions
  drop constraint if exists operational_exceptions_status_check;

alter table public.operational_exceptions
  add constraint operational_exceptions_status_check
  check (
    status in (
      'new',
      'acknowledged',
      'assigned',
      'investigating',
      'action_in_progress',
      'awaiting_external',
      'monitoring',
      'resolved',
      'dismissed',
      'reopened'
    )
  );

create table if not exists public.operational_exception_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  exception_id uuid not null references public.operational_exceptions (id) on delete cascade,
  event_type text not null
    check (
      event_type in (
        'raised',
        'acknowledged',
        'assigned',
        'investigating',
        'escalated',
        'note',
        'closed',
        'reopened',
        'status_changed'
      )
    ),
  actor_user_id uuid references public.users (id) on delete set null,
  actor_name text,
  body text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists operational_exception_events_case_idx
  on public.operational_exception_events (company_id, exception_id, created_at asc);

create index if not exists operational_exceptions_open_idx
  on public.operational_exceptions (company_id, status)
  where status not in ('resolved', 'dismissed');

alter table public.operational_exception_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'operational_exception_events'
      and policyname = 'operational_exception_events_company'
  ) then
    create policy operational_exception_events_company on public.operational_exception_events
      for all
      using (company_id = (auth.jwt() ->> 'active_company_id')::uuid)
      with check (company_id = (auth.jwt() ->> 'active_company_id')::uuid);
  end if;
end $$;
