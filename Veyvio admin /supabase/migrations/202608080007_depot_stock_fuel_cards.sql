-- F-03 / F-18 / TD-027: durable depot stock + fuel cards (no invented inventory).

create table if not exists public.depot_stock_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  depot_id uuid not null references public.depots (id) on delete cascade,
  resource_item_id text not null,
  resource_name text not null,
  category text not null default 'consumable'
    check (
      category in (
        'fuel',
        'adblue',
        'electricity',
        'tyre',
        'fluid',
        'part',
        'consumable',
        'equipment',
        'cleaning',
        'safety_equipment',
        'accessibility_equipment',
        'card'
      )
    ),
  available numeric not null default 0 check (available >= 0),
  reserved numeric not null default 0 check (reserved >= 0),
  minimum numeric not null default 0 check (minimum >= 0),
  unit text not null default 'units',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id) on delete set null,
  unique (company_id, depot_id, resource_item_id)
);

create index if not exists depot_stock_items_company_depot_idx
  on public.depot_stock_items (company_id, depot_id);

create table if not exists public.depot_stock_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  stock_item_id uuid not null references public.depot_stock_items (id) on delete cascade,
  movement_type text not null
    check (
      movement_type in (
        'adjust',
        'receive',
        'issue',
        'restock',
        'transfer_out',
        'transfer_in'
      )
    ),
  quantity numeric not null,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  actor_user_id uuid references public.users (id) on delete set null,
  actor_name text,
  body text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists depot_stock_movements_item_idx
  on public.depot_stock_movements (company_id, stock_item_id, created_at desc);

create table if not exists public.stock_transfers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  resource_item_id text not null,
  resource_name text not null,
  quantity numeric not null check (quantity > 0),
  unit text not null default 'units',
  from_depot_id uuid not null references public.depots (id) on delete restrict,
  to_depot_id uuid not null references public.depots (id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'in_transit', 'received', 'cancelled')),
  requested_by text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (from_depot_id <> to_depot_id)
);

create index if not exists stock_transfers_company_idx
  on public.stock_transfers (company_id, created_at desc);

create table if not exists public.fuel_cards (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  provider text not null,
  masked_number text not null,
  status text not null default 'unassigned'
    check (
      status in (
        'unassigned',
        'active',
        'suspended',
        'blocked',
        'lost',
        'expired'
      )
    ),
  assignment_model text not null default 'vehicle'
    check (assignment_model in ('vehicle', 'driver', 'depot')),
  assigned_vehicle_id uuid references public.vehicles (id) on delete set null,
  assigned_driver_id uuid references public.drivers (id) on delete set null,
  assigned_driver_name text,
  depot_id uuid references public.depots (id) on delete set null,
  daily_limit numeric,
  last_transaction_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id) on delete set null
);

create index if not exists fuel_cards_company_idx
  on public.fuel_cards (company_id, status);

create table if not exists public.fuel_card_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  fuel_card_id uuid not null references public.fuel_cards (id) on delete cascade,
  event_type text not null
    check (
      event_type in (
        'created',
        'assigned',
        'unassigned',
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

create index if not exists fuel_card_events_card_idx
  on public.fuel_card_events (company_id, fuel_card_id, created_at asc);

create table if not exists public.vehicle_consumable_levels (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  def_id text not null,
  label text not null,
  current_qty numeric not null default 0 check (current_qty >= 0),
  target_qty numeric not null default 0 check (target_qty >= 0),
  unit text not null default 'units',
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, vehicle_id, def_id)
);

create index if not exists vehicle_consumable_levels_vehicle_idx
  on public.vehicle_consumable_levels (company_id, vehicle_id);

alter table public.depot_stock_items enable row level security;
alter table public.depot_stock_movements enable row level security;
alter table public.stock_transfers enable row level security;
alter table public.fuel_cards enable row level security;
alter table public.fuel_card_events enable row level security;
alter table public.vehicle_consumable_levels enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'depot_stock_items' and policyname = 'depot_stock_items_company'
  ) then
    create policy depot_stock_items_company on public.depot_stock_items
      for all to authenticated
      using (private.user_has_company(company_id))
      with check (private.user_has_company(company_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'depot_stock_movements' and policyname = 'depot_stock_movements_company'
  ) then
    create policy depot_stock_movements_company on public.depot_stock_movements
      for all to authenticated
      using (private.user_has_company(company_id))
      with check (private.user_has_company(company_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'stock_transfers' and policyname = 'stock_transfers_company'
  ) then
    create policy stock_transfers_company on public.stock_transfers
      for all to authenticated
      using (private.user_has_company(company_id))
      with check (private.user_has_company(company_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fuel_cards' and policyname = 'fuel_cards_company'
  ) then
    create policy fuel_cards_company on public.fuel_cards
      for all to authenticated
      using (private.user_has_company(company_id))
      with check (private.user_has_company(company_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fuel_card_events' and policyname = 'fuel_card_events_company'
  ) then
    create policy fuel_card_events_company on public.fuel_card_events
      for all to authenticated
      using (private.user_has_company(company_id))
      with check (private.user_has_company(company_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'vehicle_consumable_levels'
      and policyname = 'vehicle_consumable_levels_company'
  ) then
    create policy vehicle_consumable_levels_company on public.vehicle_consumable_levels
      for all to authenticated
      using (private.user_has_company(company_id))
      with check (private.user_has_company(company_id));
  end if;
end $$;
