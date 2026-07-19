-- Driver onboarding: draft/invite/activate support
-- Separates operational status, compliance evidence, and app account access.

-- ---------------------------------------------------------------------------
-- Expand driver_status for onboarding lifecycle
-- ---------------------------------------------------------------------------
alter type public.driver_status add value if not exists 'onboarding';
alter type public.driver_status add value if not exists 'pending_compliance';
alter type public.driver_status add value if not exists 'eligible';
alter type public.driver_status add value if not exists 'restricted';

create type public.driver_account_status as enum (
  'not_created',
  'invite_pending',
  'invitation_sent',
  'invitation_expired',
  'registration_started',
  'active',
  'locked',
  'password_reset_required',
  'suspended',
  'disabled',
  'offboarded'
);

create type public.driver_document_verification as enum (
  'not_supplied',
  'uploaded',
  'awaiting_review',
  'verified',
  'rejected',
  'expired',
  'expiring_soon'
);

-- ---------------------------------------------------------------------------
-- Staff contact fields (driver personal details live with staff)
-- ---------------------------------------------------------------------------
alter table public.staff_members
  add column if not exists preferred_name text,
  add column if not exists date_of_birth date,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists home_address text,
  add column if not exists emergency_contact text;

-- ---------------------------------------------------------------------------
-- Driver onboarding / compliance columns
-- ---------------------------------------------------------------------------
alter table public.drivers
  add column if not exists onboarding_step text not null default 'personal',
  add column if not exists operational_status text not null default 'draft',
  add column if not exists account_status public.driver_account_status not null default 'not_created',
  add column if not exists invitation_id uuid references public.invitations (id) on delete set null,
  add column if not exists invitation_channel text,
  add column if not exists invitation_sent_at timestamptz,
  add column if not exists invitation_expires_at timestamptz,
  add column if not exists manager_name text,
  add column if not exists secondary_depot_ids uuid[] not null default '{}',
  add column if not exists work_permission_keys text[] not null default '{}',
  add column if not exists cpc_expiry_date date,
  add column if not exists dbs_expiry_date date,
  add column if not exists medical_expiry_date date,
  add column if not exists tacho_card_number text,
  add column if not exists tacho_card_expiry date,
  add column if not exists dqc_number text,
  add column if not exists right_to_work_status text,
  add column if not exists licence_categories text,
  add column if not exists suspend_reason text,
  add column if not exists suspend_keep_app_access boolean,
  add column if not exists suspend_review_date date,
  add column if not exists suspended_at timestamptz;

-- Backfill operational_status from legacy status
update public.drivers
set operational_status = case status
  when 'draft' then 'draft'
  when 'active' then 'eligible'
  when 'suspended' then 'suspended'
  when 'inactive' then 'inactive'
  when 'left' then 'left_company'
  else 'eligible'
end
where operational_status = 'draft' and status <> 'draft';

-- ---------------------------------------------------------------------------
-- Documents, restrictions, training, app accounts
-- ---------------------------------------------------------------------------
create table if not exists public.driver_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  driver_id uuid not null references public.drivers (id) on delete cascade,
  requirement_type text not null,
  label text not null,
  reference_number text,
  issuing_organisation text,
  issue_date date,
  expiry_date date,
  verification_status public.driver_document_verification not null default 'uploaded',
  verified_by uuid references public.users (id),
  verified_at timestamptz,
  rejection_reason text,
  notes text,
  file_name text,
  file_object_id uuid references public.file_objects (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND'
);

create table if not exists public.driver_restrictions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  driver_id uuid not null references public.drivers (id) on delete cascade,
  restriction_type text not null,
  label text not null,
  reason text not null,
  status text not null default 'active',
  effective_from date,
  effective_to date,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND'
);

create table if not exists public.driver_training (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  driver_id uuid not null references public.drivers (id) on delete cascade,
  training_key text not null,
  label text not null,
  required_for text,
  status text not null default 'missing',
  completed_at date,
  expires_at date,
  trainer text,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND',
  unique (driver_id, training_key)
);

create table if not exists public.driver_app_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  driver_id uuid not null references public.drivers (id) on delete cascade unique,
  user_id uuid references public.users (id),
  membership_id uuid references public.company_memberships (id),
  invitation_id uuid references public.invitations (id) on delete set null,
  account_status public.driver_account_status not null default 'not_created',
  invitation_channel text,
  invitation_sent_at timestamptz,
  invitation_expires_at timestamptz,
  registration_completed_at timestamptz,
  mfa_enabled boolean not null default false,
  last_login_at timestamptz,
  active_session_count integer not null default 0,
  registered_device_count integer not null default 0,
  app_version text,
  operating_system text,
  last_app_sync_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND'
);

create index if not exists driver_documents_driver_idx on public.driver_documents (driver_id);
create index if not exists driver_restrictions_driver_idx on public.driver_restrictions (driver_id);
create index if not exists driver_training_driver_idx on public.driver_training (driver_id);
create index if not exists driver_app_accounts_driver_idx on public.driver_app_accounts (driver_id);
create index if not exists drivers_operational_status_idx on public.drivers (company_id, operational_status);

do $$
declare
  t text;
begin
  foreach t in array array[
    'driver_documents', 'driver_restrictions', 'driver_training', 'driver_app_accounts'
  ]
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
