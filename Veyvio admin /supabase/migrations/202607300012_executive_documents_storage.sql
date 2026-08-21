-- Phase 8: Executive private document storage, access audit, legal holds, export metadata.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'executive-documents',
  'executive-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'text/plain',
    'text/csv',
    'application/json'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.executive_document_files (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  file_object_id uuid not null references public.file_objects(id) on delete cascade,
  entity_type text not null
    check (entity_type in (
      'executive_policy',
      'executive_company_record',
      'executive_board_pack',
      'executive_export',
      'executive_other'
    )),
  entity_id text,
  -- Text classification for Executive controls (kept as text so this migration
  -- does not depend on using newly added enum labels in the same transaction).
  classification text not null default 'executive_restricted'
    check (classification in (
      'executive_internal',
      'executive_restricted',
      'executive_highly_restricted'
    )),
  retention_category text not null default 'executive_documents',
  legal_hold boolean not null default false,
  watermark_required boolean not null default false,
  purpose text,
  replaced_by_id uuid references public.executive_document_files(id),
  deleted_at timestamptz,
  deleted_by uuid references public.users(id),
  created_by uuid references public.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists executive_document_files_company_idx
  on public.executive_document_files(company_id, created_at desc);
create index if not exists executive_document_files_entity_idx
  on public.executive_document_files(company_id, entity_type, entity_id);

create table if not exists public.executive_document_access_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  document_file_id uuid references public.executive_document_files(id) on delete set null,
  export_job_id uuid references public.data_export_jobs(id) on delete set null,
  event_type text not null
    check (event_type in ('preview', 'download', 'export', 'replace', 'delete', 'upload')),
  actor_user_id uuid not null references public.users(id),
  actor_membership_id uuid references public.company_memberships(id),
  actor_session_id uuid references public.user_sessions(id),
  classification text,
  purpose text,
  reason text,
  request_correlation_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists executive_document_access_events_company_idx
  on public.executive_document_access_events(company_id, created_at desc);

create table if not exists public.executive_legal_holds (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  retention_category text,
  entity_type text,
  entity_id text,
  reason text not null,
  status text not null default 'active'
    check (status in ('active', 'released')),
  placed_by uuid references public.users(id),
  released_by uuid references public.users(id),
  placed_at timestamptz not null default timezone('utc', now()),
  released_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists executive_legal_holds_company_idx
  on public.executive_legal_holds(company_id, status);

alter table public.data_export_jobs
  add column if not exists reason text,
  add column if not exists sensitive_action_request_id uuid
    references public.executive_sensitive_action_requests(id),
  add column if not exists classification text,
  add column if not exists purpose text,
  add column if not exists watermark_required boolean not null default false,
  add column if not exists executive_document_file_id uuid
    references public.executive_document_files(id);

insert into public.data_retention_policies (company_id, category, retention_days)
select c.id, x.category, x.days
from public.companies c
cross join (
  values
    ('executive_documents', 2555),
    ('executive_board_packs', 3650),
    ('executive_exports', 365),
    ('executive_policies', 2555)
) as x(category, days)
where not exists (
  select 1
    from public.data_retention_policies existing
   where existing.company_id = c.id
     and existing.category = x.category
);

alter table public.executive_document_files enable row level security;
alter table public.executive_document_access_events enable row level security;
alter table public.executive_legal_holds enable row level security;

drop policy if exists executive_document_files_aal2_read
  on public.executive_document_files;
create policy executive_document_files_aal2_read
  on public.executive_document_files
  as permissive
  for select
  to authenticated
  using (
    private.current_session_is_aal2()
    and private.user_has_active_executive_access(company_id)
  );

drop policy if exists executive_document_access_events_aal2_read
  on public.executive_document_access_events;
create policy executive_document_access_events_aal2_read
  on public.executive_document_access_events
  as permissive
  for select
  to authenticated
  using (
    private.current_session_is_aal2()
    and private.user_has_active_executive_access(company_id)
  );

drop policy if exists executive_legal_holds_aal2_read
  on public.executive_legal_holds;
create policy executive_legal_holds_aal2_read
  on public.executive_legal_holds
  as permissive
  for select
  to authenticated
  using (
    private.current_session_is_aal2()
    and private.user_has_active_executive_access(company_id)
  );

revoke all on table public.executive_document_files from authenticated, anon;
revoke all on table public.executive_document_access_events from authenticated, anon;
revoke all on table public.executive_legal_holds from authenticated, anon;
grant select on public.executive_document_files to authenticated;
grant select on public.executive_document_access_events to authenticated;
grant select on public.executive_legal_holds to authenticated;
grant all on public.executive_document_files to service_role;
grant all on public.executive_document_access_events to service_role;
grant all on public.executive_legal_holds to service_role;

create or replace function private.protect_executive_document_access_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  raise exception 'Executive document access events are append-only';
end;
$function$;

revoke all on function private.protect_executive_document_access_event()
  from public, anon, authenticated;
grant execute on function private.protect_executive_document_access_event()
  to service_role, postgres;

drop trigger if exists executive_document_access_events_append_only
  on public.executive_document_access_events;
create trigger executive_document_access_events_append_only
before update or delete on public.executive_document_access_events
for each row execute function private.protect_executive_document_access_event();

comment on table public.executive_document_files is
  'Executive binary documents stored in the private executive-documents bucket via file_objects.';
comment on table public.executive_document_access_events is
  'Append-only preview/download/export/replace/delete audit for Executive documents.';
comment on table public.executive_legal_holds is
  'Active legal holds that block destructive Executive retention jobs.';
