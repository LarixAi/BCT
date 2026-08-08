-- Durable journey-sequence driver acknowledgements (Command ops + driver response).

create table if not exists public.journey_sequence_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  trip_key text not null,
  duty_id uuid references public.duties (id) on delete set null,
  run_id uuid references public.runs (id) on delete set null,
  status text not null default 'sent'
    check (status in ('not_required', 'sent', 'delivered', 'viewed', 'acknowledged', 'declined', 'failed')),
  summary text not null default '',
  decline_reason text,
  escalate_after_minutes integer not null default 10,
  sent_at timestamptz,
  delivered_at timestamptz,
  viewed_at timestamptz,
  acknowledged_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  unique (company_id, trip_key)
);

create index if not exists journey_sequence_acks_company_status_idx
  on public.journey_sequence_acknowledgements (company_id, status, updated_at desc);

create index if not exists journey_sequence_acks_duty_idx
  on public.journey_sequence_acknowledgements (duty_id)
  where duty_id is not null;

alter table public.journey_sequence_acknowledgements enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'journey_sequence_acknowledgements'
      and policyname = 'journey_sequence_acks_company'
  ) then
    create policy journey_sequence_acks_company on public.journey_sequence_acknowledgements
      for all
      using (company_id = (auth.jwt() ->> 'active_company_id')::uuid)
      with check (company_id = (auth.jwt() ->> 'active_company_id')::uuid);
  end if;
end $$;
