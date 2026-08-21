-- F-03 / F-18 / TD-027: durable tyre assets (fit / remove / rotate).

create table if not exists public.tyre_assets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  internal_id text not null,
  brand text not null,
  size text not null,
  dot_code text not null default '',
  status text not null default 'in_stock'
    check (
      status in (
        'in_stock',
        'fitted',
        'removed',
        'quarantine',
        'disposed',
        'awaiting_retorque'
      )
    ),
  tread_depth_mm numeric,
  pressure_psi numeric,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  position text,
  position_label text,
  depot_id uuid references public.depots (id) on delete set null,
  fitted_at timestamptz,
  removed_at timestamptz,
  retorque_due_at timestamptz,
  recommendation text,
  linked_defect_id uuid,
  linked_inspection_id uuid,
  unit_cost numeric,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id) on delete set null,
  unique (company_id, internal_id)
);

create index if not exists tyre_assets_company_vehicle_idx
  on public.tyre_assets (company_id, vehicle_id)
  where vehicle_id is not null;

create index if not exists tyre_assets_company_status_idx
  on public.tyre_assets (company_id, status);

create table if not exists public.tyre_asset_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  tyre_id uuid not null references public.tyre_assets (id) on delete cascade,
  event_type text not null
    check (
      event_type in (
        'created',
        'fitted',
        'removed',
        'rotated',
        'status_changed',
        'updated'
      )
    ),
  actor_user_id uuid references public.users (id) on delete set null,
  actor_name text,
  body text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists tyre_asset_events_tyre_idx
  on public.tyre_asset_events (company_id, tyre_id, created_at asc);

alter table public.tyre_assets enable row level security;
alter table public.tyre_asset_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'tyre_assets' and policyname = 'tyre_assets_company'
  ) then
    create policy tyre_assets_company on public.tyre_assets
      for all to authenticated
      using (private.user_has_company(company_id))
      with check (private.user_has_company(company_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'tyre_asset_events' and policyname = 'tyre_asset_events_company'
  ) then
    create policy tyre_asset_events_company on public.tyre_asset_events
      for all to authenticated
      using (private.user_has_company(company_id))
      with check (private.user_has_company(company_id));
  end if;
end $$;
