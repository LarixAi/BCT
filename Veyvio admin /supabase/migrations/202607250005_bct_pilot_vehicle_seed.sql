-- BCT pilot fleet seed — at least one diesel minibus for Gate 1 yard hub + AdBlue smoke.
-- Idempotent — safe to re-run.

do $$
declare
  v_company_id uuid;
  v_depot_id uuid;
begin
  select id into v_company_id
  from public.companies
  where external_reference = 'BCT'
     or trading_name ilike '%Brent Community Transport%'
  order by created_at asc
  limit 1;

  if v_company_id is null then
    raise notice 'BCT company not found — skip pilot vehicle seed';
    return;
  end if;

  select id into v_depot_id
  from public.depots
  where company_id = v_company_id and code = 'BCT-MAIN'
  limit 1;

  if v_depot_id is null then
    raise notice 'BCT Main Depot not found — skip pilot vehicle seed';
    return;
  end if;

  insert into public.vehicles (
    company_id,
    fleet_number,
    registration,
    make,
    model,
    year,
    vehicle_class,
    fuel_type,
    colour,
    seat_capacity,
    wheelchair_capacity,
    primary_depot_id,
    operational_status,
    ownership_type,
    commissioned_at,
    status,
    external_reference,
    source_app
  ) values (
    v_company_id,
    'BCT-01',
    'BX62 BCT',
    'Ford',
    'Transit Custom',
    2022,
    'minibus',
    'diesel',
    'White',
    12,
    1,
    v_depot_id,
    'available',
    'owned',
    timezone('utc', now()) - interval '2 years',
    'active',
    'BCT-PILOT-01',
    'COMMAND'
  )
  on conflict (company_id, fleet_number) do update
    set registration = excluded.registration,
        primary_depot_id = excluded.primary_depot_id,
        operational_status = excluded.operational_status,
        fuel_type = excluded.fuel_type,
        status = 'active',
        updated_at = timezone('utc', now());

  raise notice 'BCT pilot vehicle seeded for company % depot %', v_company_id, v_depot_id;
end $$;
