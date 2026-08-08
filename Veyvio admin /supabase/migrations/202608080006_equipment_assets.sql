-- F-03 / F-18 / TD-027: durable vehicle equipment inventory (sole write path for kit assets).

create table if not exists public.equipment_assets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  depot_id uuid references public.depots (id) on delete set null,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  name text not null,
  category text not null default 'equipment'
    check (
      category in (
        'safety_equipment',
        'accessibility_equipment',
        'equipment',
        'cleaning'
      )
    ),
  status text not null default 'available'
    check (
      status in (
        'available',
        'assigned',
        'in_service',
        'missing',
        'unserviceable',
        'expired'
      )
    ),
  qr_code text,
  serial_number text,
  required_for_duty boolean not null default false,
  expiry_at date,
  inspection_due_at date,
  assigned_at timestamptz,
  assigned_by_user_id uuid references public.users (id) on delete set null,
  assigned_by_name text,
  last_verified_at timestamptz,
  serviceable boolean not null default true,
  in_date boolean not null default true,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id) on delete set null
);

create unique index if not exists equipment_assets_company_qr_uidx
  on public.equipment_assets (company_id, qr_code)
  where qr_code is not null and length(trim(qr_code)) > 0;

create index if not exists equipment_assets_company_vehicle_idx
  on public.equipment_assets (company_id, vehicle_id)
  where vehicle_id is not null;

create index if not exists equipment_assets_company_depot_idx
  on public.equipment_assets (company_id, depot_id);

create table if not exists public.equipment_asset_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  equipment_id uuid not null references public.equipment_assets (id) on delete cascade,
  event_type text not null
    check (
      event_type in (
        'created',
        'assigned',
        'unassigned',
        'transferred',
        'status_changed',
        'verified',
        'restocked',
        'updated'
      )
    ),
  actor_user_id uuid references public.users (id) on delete set null,
  actor_name text,
  body text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists equipment_asset_events_asset_idx
  on public.equipment_asset_events (company_id, equipment_id, created_at asc);

alter table public.equipment_assets enable row level security;
alter table public.equipment_asset_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'equipment_assets'
      and policyname = 'equipment_assets_company'
  ) then
    create policy equipment_assets_company on public.equipment_assets
      for all to authenticated
      using (private.user_has_company(company_id))
      with check (private.user_has_company(company_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'equipment_asset_events'
      and policyname = 'equipment_asset_events_company'
  ) then
    create policy equipment_asset_events_company on public.equipment_asset_events
      for all to authenticated
      using (private.user_has_company(company_id))
      with check (private.user_has_company(company_id));
  end if;
end $$;
