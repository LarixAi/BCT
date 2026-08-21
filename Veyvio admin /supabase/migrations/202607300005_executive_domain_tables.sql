-- Executive domain tables for live governance pages (not demo fixtures).
-- Scoped by company_id; accessed only via command-api executive/* handlers.

create table if not exists public.executive_board_meetings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  meeting_type text not null default 'board',
  scheduled_at timestamptz,
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'completed', 'cancelled')),
  location text,
  notes text,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists executive_board_meetings_company_idx
  on public.executive_board_meetings (company_id, scheduled_at desc);

create table if not exists public.executive_decisions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  decision_type text not null default 'operational'
    check (decision_type in ('operational', 'reserved', 'budget', 'policy', 'personnel', 'other')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'deferred')),
  summary text,
  proposer_user_id uuid references public.users(id),
  approver_user_id uuid references public.users(id),
  due_at timestamptz,
  decided_at timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists executive_decisions_company_idx
  on public.executive_decisions (company_id, status, due_at);

create table if not exists public.executive_policies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  category text not null default 'governance',
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'approved', 'retired')),
  version_label text,
  owner_user_id uuid references public.users(id),
  approved_at timestamptz,
  next_review_at timestamptz,
  summary text,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists executive_policies_company_idx
  on public.executive_policies (company_id, status);

create table if not exists public.executive_company_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  record_type text not null default 'legal'
    check (record_type in ('legal', 'licence', 'insurance', 'contract', 'constitution', 'other')),
  status text not null default 'current'
    check (status in ('current', 'expiring', 'expired', 'draft')),
  reference text,
  effective_from date,
  effective_to date,
  notes text,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists executive_company_records_company_idx
  on public.executive_company_records (company_id, record_type);

create table if not exists public.executive_conflicts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  person_user_id uuid references public.users(id),
  person_name text not null,
  declaration text not null,
  status text not null default 'open'
    check (status in ('open', 'managed', 'closed')),
  declared_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists executive_conflicts_company_idx
  on public.executive_conflicts (company_id, status);

create table if not exists public.executive_budget_mandates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  authority_role text not null,
  limit_amount_minor bigint,
  currency text not null default 'GBP',
  status text not null default 'active'
    check (status in ('active', 'proposed', 'retired')),
  notes text,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists executive_budget_mandates_company_idx
  on public.executive_budget_mandates (company_id, status);

alter table public.executive_board_meetings enable row level security;
alter table public.executive_decisions enable row level security;
alter table public.executive_policies enable row level security;
alter table public.executive_company_records enable row level security;
alter table public.executive_conflicts enable row level security;
alter table public.executive_budget_mandates enable row level security;
