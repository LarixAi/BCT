-- Places / geofences (docs/architecture/14-navigation-location-services.md Phase 1).
-- Depots, customer sites, and waypoints as first-class, company-scoped objects
-- with a circle-radius geofence, distinct from the Yard-internal depot_zones
-- (bay/layout polygons within one depot's yard map).

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  kind text not null default 'customer_site'
    check (kind in ('depot', 'customer_site', 'waypoint')),
  name text not null,
  address text,
  lat double precision not null,
  lng double precision not null,
  radius_m numeric not null default 120
    check (radius_m > 0 and radius_m <= 2000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists places_company_kind_idx
  on public.places (company_id, kind, name);

alter table public.places enable row level security;

create policy places_select_company on public.places
  for select to authenticated
  using (private.user_has_company(company_id));

-- Nullable — existing stops stay address-only until dispatch links a place.
alter table public.journey_stops
  add column if not exists place_id uuid references public.places (id) on delete set null;

create index if not exists journey_stops_place_idx
  on public.journey_stops (place_id)
  where place_id is not null;
