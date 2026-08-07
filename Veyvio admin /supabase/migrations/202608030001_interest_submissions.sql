-- Register Interest intake (third-party website → Command Incoming Interests).
-- Authoritative write path: command-api with integration API key (interests:create).
-- Clients never write these rows directly; RLS is company-scoped deny-by-default for anon.

-- ---------------------------------------------------------------------------
-- interest_submissions
-- ---------------------------------------------------------------------------
create table if not exists public.interest_submissions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  reference text not null,
  status text not null default 'new'
    check (status in (
      'new',
      'under_review',
      'assigned',
      'contact_attempted',
      'contacted',
      'qualified',
      'converted',
      'waiting_list',
      'closed',
      'spam'
    )),
  source text not null,
  source_label text,
  external_submission_id text,
  idempotency_key text,
  integration_api_key_id uuid references public.integration_api_keys (id) on delete set null,
  request_id text not null,

  contact_name text not null,
  contact_email text,
  contact_phone text,
  preferred_contact_method text,

  postcode text,
  borough text,

  service text,
  journey_types text[] not null default '{}',
  wheelchair_accessible_vehicle_required boolean not null default false,
  passenger_count integer,
  message text,

  privacy_accepted boolean not null,
  marketing_accepted boolean not null default false,
  privacy_notice_version text,
  consent_accepted_at timestamptz,

  assigned_to_user_id uuid references public.users (id) on delete set null,
  assigned_to_name text,
  last_activity_at timestamptz not null default timezone('utc', now()),
  possible_duplicate boolean not null default false,
  duplicate_of_id uuid references public.interest_submissions (id) on delete set null,

  raw_payload jsonb not null default '{}'::jsonb,
  staff_notes jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  closed_at timestamptz,
  closed_reason text,

  unique (company_id, reference)
);

create unique index if not exists interest_submissions_idempotency_uidx
  on public.interest_submissions (company_id, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists interest_submissions_external_uidx
  on public.interest_submissions (company_id, source, external_submission_id)
  where external_submission_id is not null;

create index if not exists interest_submissions_company_status_idx
  on public.interest_submissions (company_id, status, created_at desc);

create index if not exists interest_submissions_company_created_idx
  on public.interest_submissions (company_id, created_at desc);

create index if not exists interest_submissions_company_source_idx
  on public.interest_submissions (company_id, source);

create index if not exists interest_submissions_company_assigned_idx
  on public.interest_submissions (company_id, assigned_to_user_id)
  where assigned_to_user_id is not null;

create index if not exists interest_submissions_email_idx
  on public.interest_submissions (company_id, lower(contact_email))
  where contact_email is not null;

alter table public.interest_submissions enable row level security;

create policy interest_submissions_company on public.interest_submissions
  for all to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

-- Integration keys: hash lookup for intake auth (service role still bypasses RLS).
create index if not exists integration_api_keys_key_hash_idx
  on public.integration_api_keys (key_hash)
  where status = 'active';

-- Per-company yearly reference counter → INT-YYYY-NNNNNN
create table if not exists public.interest_reference_counters (
  company_id uuid not null references public.companies (id) on delete cascade,
  year integer not null,
  last_value integer not null default 0,
  primary key (company_id, year)
);

alter table public.interest_reference_counters enable row level security;

create policy interest_reference_counters_company on public.interest_reference_counters
  for all to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

create or replace function public.next_interest_reference(p_company_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer := extract(year from timezone('utc', now()))::integer;
  v_next integer;
begin
  insert into public.interest_reference_counters (company_id, year, last_value)
  values (p_company_id, v_year, 1)
  on conflict (company_id, year)
  do update set last_value = public.interest_reference_counters.last_value + 1
  returning last_value into v_next;

  return 'INT-' || v_year::text || '-' || lpad(v_next::text, 6, '0');
end;
$$;

revoke all on function public.next_interest_reference(uuid) from public;
grant execute on function public.next_interest_reference(uuid) to service_role;
