-- F-03 / F-18 / TD-027: durable fleet resource purchase requests.

create table if not exists public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  resource_name text not null,
  quantity numeric not null default 1 check (quantity > 0),
  unit text not null default 'each',
  estimated_cost numeric not null default 0 check (estimated_cost >= 0),
  vehicle_id uuid references public.vehicles (id) on delete set null,
  depot_id uuid references public.depots (id) on delete set null,
  reason text not null default '',
  urgency text not null default 'routine'
    check (urgency in ('routine', 'urgent', 'emergency')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  requested_by_user_id uuid references public.users (id) on delete set null,
  requested_by_name text not null,
  needed_by date,
  approved_by_user_id uuid references public.users (id) on delete set null,
  approved_by_name text,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists purchase_requests_company_status_idx
  on public.purchase_requests (company_id, status, created_at desc);

create index if not exists purchase_requests_company_vehicle_idx
  on public.purchase_requests (company_id, vehicle_id)
  where vehicle_id is not null;

alter table public.purchase_requests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'purchase_requests' and policyname = 'purchase_requests_company'
  ) then
    create policy purchase_requests_company on public.purchase_requests
      for all to authenticated
      using (private.user_has_company(company_id))
      with check (private.user_has_company(company_id));
  end if;
end $$;
