-- Veyvio Platform — Phase 1 foundation
-- Modules: identity, tenancy, roles/permissions, company/depots, audit, files, notifications, offline sync
-- Shared by Command, Driver and Yard. company_id is the tenancy key (blueprint: companyId).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared enums
-- ---------------------------------------------------------------------------
create type public.source_app as enum ('COMMAND', 'DRIVER', 'YARD', 'MAINTENANCE', 'SYSTEM');
create type public.record_lifecycle_status as enum ('active', 'inactive', 'archived', 'suspended');
create type public.membership_status as enum ('invited', 'active', 'suspended', 'revoked');
create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');
create type public.app_type as enum ('COMMAND', 'DRIVER', 'YARD');
create type public.depot_access_level as enum ('none', 'read', 'operate', 'manage');
create type public.permission_effect as enum ('allow', 'deny');
create type public.notification_severity as enum ('info', 'attention', 'critical');
create type public.file_classification as enum ('general', 'evidence', 'identity', 'safeguarding', 'commercial');
create type public.virus_scan_status as enum ('pending', 'clean', 'infected', 'failed');
create type public.sync_conflict_status as enum ('open', 'resolved_client', 'resolved_server', 'escalated');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  new.version = coalesce(old.version, 0) + 1;
  return new;
end;
$$;

create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.uid()::text, '')::uuid;
$$;

create or replace function public.jwt_company_ids()
returns uuid[]
language sql
stable
as $$
  select coalesce(
    (
      select array_agg(value::uuid)
      from jsonb_array_elements_text(coalesce(auth.jwt() -> 'app_metadata' -> 'company_ids', '[]'::jsonb)) as value
    ),
    '{}'::uuid[]
  );
$$;

-- ---------------------------------------------------------------------------
-- identity / tenancy
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  phone text,
  first_name text not null default '',
  last_name text not null default '',
  authentication_status text not null default 'active',
  last_login_at timestamptz,
  mfa_enabled boolean not null default false,
  account_locked_at timestamptz,
  preferred_language text not null default 'en-GB',
  timezone text not null default 'Europe/London',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  version integer not null default 1
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  trading_name text not null,
  operator_licence_number text,
  company_number text,
  address jsonb not null default '{}'::jsonb,
  timezone text not null default 'Europe/London',
  status public.record_lifecycle_status not null default 'active',
  subscription_status text not null default 'trial',
  logo_url text,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND',
  archived_at timestamptz,
  archived_by uuid references public.users (id),
  external_reference text
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  description text not null default '',
  is_system_role boolean not null default false,
  status public.record_lifecycle_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND',
  unique (company_id, name)
);

create table public.permissions (
  code text primary key,
  description text not null default '',
  module text not null
);

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_code text not null references public.permissions (code) on delete cascade,
  effect public.permission_effect not null default 'allow',
  primary key (role_id, permission_code)
);

create table public.company_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  staff_id uuid,
  role_ids uuid[] not null default '{}',
  status public.membership_status not null default 'invited',
  invited_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND',
  unique (user_id, company_id)
);

create or replace function public.user_has_company(target_company_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.company_memberships m
    where m.user_id = auth.uid()
      and m.company_id = target_company_id
      and m.status = 'active'
  )
  or target_company_id = any (public.jwt_company_ids());
$$;

create table public.depots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  code text not null,
  address jsonb not null default '{}'::jsonb,
  latitude double precision,
  longitude double precision,
  phone text,
  operating_hours jsonb not null default '{}'::jsonb,
  yard_capacity integer,
  status public.record_lifecycle_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND',
  archived_at timestamptz,
  archived_by uuid references public.users (id),
  external_reference text,
  unique (company_id, code)
);

create table public.depot_zones (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  depot_id uuid not null references public.depots (id) on delete cascade,
  name text not null,
  type text not null,
  capacity integer,
  status public.record_lifecycle_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND'
);

create table public.parking_bays (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  depot_zone_id uuid not null references public.depot_zones (id) on delete cascade,
  label text not null,
  vehicle_class_restrictions text[] not null default '{}',
  status public.record_lifecycle_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND'
);

create table public.operating_areas (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  polygon jsonb not null default '[]'::jsonb,
  service_restrictions jsonb not null default '{}'::jsonb,
  status public.record_lifecycle_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND'
);

create table public.depot_access (
  membership_id uuid not null references public.company_memberships (id) on delete cascade,
  depot_id uuid not null references public.depots (id) on delete cascade,
  access_level public.depot_access_level not null default 'read',
  primary key (membership_id, depot_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  email text not null,
  phone text,
  app_type public.app_type not null,
  role_ids uuid[] not null default '{}',
  depot_ids uuid[] not null default '{}',
  token_hash text not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  invited_by uuid references public.users (id),
  status public.invitation_status not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND'
);

-- ---------------------------------------------------------------------------
-- audit
-- ---------------------------------------------------------------------------
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete set null,
  actor_type text not null default 'user',
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text,
  occurred_at timestamptz not null default timezone('utc', now()),
  source_app public.source_app not null default 'SYSTEM',
  device_id text,
  ip_address text,
  before_snapshot jsonb,
  after_snapshot jsonb,
  reason text,
  correlation_id text,
  created_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- files / evidence
-- ---------------------------------------------------------------------------
create table public.file_objects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  storage_key text not null,
  original_filename text not null,
  mime_type text not null,
  size bigint not null default 0,
  checksum text not null,
  uploaded_by uuid references public.users (id),
  uploaded_at timestamptz not null default timezone('utc', now()),
  classification public.file_classification not null default 'general',
  virus_scan_status public.virus_scan_status not null default 'pending',
  status public.record_lifecycle_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  version integer not null default 1,
  source_app public.source_app not null default 'COMMAND',
  unique (company_id, storage_key)
);

create table public.evidence_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  file_id uuid not null references public.file_objects (id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  evidence_type text not null default 'attachment',
  captured_at timestamptz,
  captured_by uuid references public.users (id),
  source_app public.source_app not null default 'COMMAND',
  created_at timestamptz not null default timezone('utc', now())
);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  parent_document_id uuid not null,
  version integer not null,
  file_id uuid not null references public.file_objects (id),
  effective_from timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id),
  created_at timestamptz not null default timezone('utc', now()),
  unique (parent_document_id, version)
);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  recipient_user_id uuid not null references public.users (id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text not null,
  severity public.notification_severity not null default 'info',
  source_entity_type text,
  source_entity_id text,
  created_at timestamptz not null default timezone('utc', now()),
  read_at timestamptz,
  dismissed_at timestamptz,
  action_url text,
  status text not null default 'unread'
);

create table public.notification_preferences (
  user_id uuid not null references public.users (id) on delete cascade,
  notification_type text not null,
  in_app_enabled boolean not null default true,
  push_enabled boolean not null default true,
  email_enabled boolean not null default false,
  sms_enabled boolean not null default false,
  quiet_hours jsonb not null default '{}'::jsonb,
  primary key (user_id, notification_type)
);

-- ---------------------------------------------------------------------------
-- offline synchronisation
-- ---------------------------------------------------------------------------
create table public.device_sync_cursors (
  device_id text not null,
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  last_pull_cursor text,
  last_push_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (device_id, company_id, user_id)
);

create table public.outbox_commands (
  client_command_id text primary key,
  company_id uuid not null references public.companies (id) on delete cascade,
  device_id text not null,
  command_type text not null,
  entity_type text not null,
  entity_id text,
  base_version integer,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  received_at timestamptz not null default timezone('utc', now()),
  source_app public.source_app not null,
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc', now())
);

create table public.processed_commands (
  client_command_id text primary key,
  company_id uuid not null references public.companies (id) on delete cascade,
  processed_at timestamptz not null default timezone('utc', now()),
  result_entity_id text,
  result_version integer
);

create table public.sync_conflicts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  client_version integer,
  server_version integer,
  client_payload jsonb not null default '{}'::jsonb,
  resolution_type text,
  status public.sync_conflict_status not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Seed permissions (Command Phase 1–2 surface)
-- ---------------------------------------------------------------------------
insert into public.permissions (code, description, module) values
  ('bookings.read', 'Read bookings', 'operations'),
  ('bookings.create', 'Create bookings', 'operations'),
  ('bookings.edit', 'Edit bookings', 'operations'),
  ('bookings.cancel', 'Cancel bookings', 'operations'),
  ('dispatch.manage', 'Manage dispatch', 'dispatch'),
  ('drivers.read', 'Read drivers', 'workforce'),
  ('drivers.manage', 'Manage drivers', 'workforce'),
  ('vehicles.read', 'Read vehicles', 'fleet'),
  ('vehicles.manage', 'Manage vehicles', 'fleet'),
  ('vehicles.mark_vor', 'Mark vehicle VOR', 'fleet'),
  ('incidents.investigate', 'Investigate incidents', 'safety'),
  ('settings.users.manage', 'Manage users', 'identity'),
  ('settings.roles.manage', 'Manage roles', 'identity'),
  ('depots.read', 'Read depots', 'tenancy'),
  ('depots.manage', 'Manage depots', 'tenancy'),
  ('customers.read', 'Read customers', 'customers'),
  ('customers.manage', 'Manage customers', 'customers'),
  ('passengers.read', 'Read passengers', 'passengers'),
  ('passengers.manage', 'Manage passengers', 'passengers'),
  ('audit.read', 'Read audit events', 'audit'),
  ('reports.read', 'Read reports', 'reporting'),
  ('notifications.read', 'Read notifications', 'communications');

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create trigger companies_set_updated_at before update on public.companies
  for each row execute function public.set_updated_at();
create trigger roles_set_updated_at before update on public.roles
  for each row execute function public.set_updated_at();
create trigger company_memberships_set_updated_at before update on public.company_memberships
  for each row execute function public.set_updated_at();
create trigger depots_set_updated_at before update on public.depots
  for each row execute function public.set_updated_at();
create trigger depot_zones_set_updated_at before update on public.depot_zones
  for each row execute function public.set_updated_at();
create trigger parking_bays_set_updated_at before update on public.parking_bays
  for each row execute function public.set_updated_at();
create trigger operating_areas_set_updated_at before update on public.operating_areas
  for each row execute function public.set_updated_at();
create trigger invitations_set_updated_at before update on public.invitations
  for each row execute function public.set_updated_at();
create trigger file_objects_set_updated_at before update on public.file_objects
  for each row execute function public.set_updated_at();
create trigger users_set_updated_at before update on public.users
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.companies enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.company_memberships enable row level security;
alter table public.depots enable row level security;
alter table public.depot_zones enable row level security;
alter table public.parking_bays enable row level security;
alter table public.operating_areas enable row level security;
alter table public.depot_access enable row level security;
alter table public.invitations enable row level security;
alter table public.audit_events enable row level security;
alter table public.file_objects enable row level security;
alter table public.evidence_links enable row level security;
alter table public.document_versions enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.device_sync_cursors enable row level security;
alter table public.outbox_commands enable row level security;
alter table public.processed_commands enable row level security;
alter table public.sync_conflicts enable row level security;

create policy users_self on public.users
  for select using (id = auth.uid());

create policy users_self_update on public.users
  for update using (id = auth.uid());

create policy permissions_read on public.permissions
  for select using (auth.role() = 'authenticated');

create policy companies_member_select on public.companies
  for select using (public.user_has_company(id));

create policy memberships_self_select on public.company_memberships
  for select using (user_id = auth.uid() or public.user_has_company(company_id));

create policy roles_company_select on public.roles
  for select using (public.user_has_company(company_id));

create policy role_permissions_select on public.role_permissions
  for select using (
    exists (
      select 1 from public.roles r
      where r.id = role_id and public.user_has_company(r.company_id)
    )
  );

create policy depots_company_select on public.depots
  for select using (public.user_has_company(company_id));

create policy depot_zones_company_select on public.depot_zones
  for select using (public.user_has_company(company_id));

create policy parking_bays_company_select on public.parking_bays
  for select using (public.user_has_company(company_id));

create policy operating_areas_company_select on public.operating_areas
  for select using (public.user_has_company(company_id));

create policy depot_access_select on public.depot_access
  for select using (
    exists (
      select 1 from public.company_memberships m
      where m.id = membership_id and (m.user_id = auth.uid() or public.user_has_company(m.company_id))
    )
  );

create policy invitations_company_select on public.invitations
  for select using (public.user_has_company(company_id));

create policy audit_company_select on public.audit_events
  for select using (company_id is null or public.user_has_company(company_id));

create policy files_company_select on public.file_objects
  for select using (public.user_has_company(company_id));

create policy evidence_company_select on public.evidence_links
  for select using (public.user_has_company(company_id));

create policy document_versions_company_select on public.document_versions
  for select using (public.user_has_company(company_id));

create policy notifications_recipient_select on public.notifications
  for select using (recipient_user_id = auth.uid());

create policy notification_preferences_self on public.notification_preferences
  for all using (user_id = auth.uid());

create policy sync_cursors_self on public.device_sync_cursors
  for all using (user_id = auth.uid() and public.user_has_company(company_id));

create policy outbox_company_select on public.outbox_commands
  for select using (public.user_has_company(company_id));

create policy processed_commands_company_select on public.processed_commands
  for select using (public.user_has_company(company_id));

create policy sync_conflicts_company_select on public.sync_conflicts
  for select using (public.user_has_company(company_id));

-- Service role bypasses RLS for Edge Function gateway writes.
grant usage on schema public to authenticated, service_role;
grant select on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
