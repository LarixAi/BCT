-- Brent Community Transport company + BCT Main Depot Live Yard Map seed
-- Idempotent — safe to re-run

do $$
declare
  v_company_id uuid;
  v_depot_id uuid;
  v_layout_id uuid;
  v_version_id uuid;
  v_zone_id uuid;
  v_lifo_a uuid;
  v_lifo_b uuid;
begin
  select id into v_company_id from public.companies
  where external_reference = 'BCT'
     or trading_name ilike '%Brent Community Transport%'
  order by created_at asc limit 1;

  if v_company_id is null then
    insert into public.companies (
      legal_name, trading_name, timezone, status, subscription_status,
      external_reference, source_app
    ) values (
      'Brent Community Transport Ltd',
      'Brent Community Transport',
      'Europe/London',
      'active',
      'active',
      'BCT',
      'COMMAND'
    ) returning id into v_company_id;
    raise notice 'Created BCT company %', v_company_id;
  end if;

  select id into v_depot_id from public.depots
  where company_id = v_company_id and code = 'BCT-MAIN'
  limit 1;

  if v_depot_id is null then
    insert into public.depots (
      company_id, name, code, yard_map_enabled, yard_capacity, status, source_app
    ) values (
      v_company_id, 'BCT Main Depot', 'BCT-MAIN', true, 26, 'active', 'COMMAND'
    ) returning id into v_depot_id;
  else
    update public.depots
    set yard_map_enabled = true, yard_capacity = 26, updated_at = timezone('utc', now())
    where id = v_depot_id;
  end if;

  select id into v_layout_id from public.yard_layouts
  where depot_id = v_depot_id and name = 'Main Depot Parking Map'
  limit 1;

  if v_layout_id is not null then
    raise notice 'BCT yard layout already exists for depot %', v_depot_id;
    return;
  end if;

  insert into public.yard_layouts (
    company_id, depot_id, name, status, canvas_width, canvas_height, source_app
  ) values (
    v_company_id, v_depot_id, 'Main Depot Parking Map', 'published', 1000, 700, 'COMMAND'
  ) returning id into v_layout_id;

  insert into public.yard_layout_versions (
    company_id, layout_id, version_number, label, published_at, snapshot, change_notes
  ) values (
    v_company_id, v_layout_id, 1, 'Initial digital map', timezone('utc', now()),
    jsonb_build_object('source', 'bct-main-depot-v1'),
    'Seeded from BCT physical depot plan'
  ) returning id into v_version_id;

  update public.yard_layouts set active_version_id = v_version_id where id = v_layout_id;

  insert into public.depot_zones (
    company_id, depot_id, layout_id, name, type, colour_key, vehicle_access, pedestrian_access, parking_allowed, display_order, source_app
  ) values
    (v_company_id, v_depot_id, v_layout_id, 'Main Portacabin', 'OFFICE', '#3B82F6', false, true, false, 1, 'COMMAND'),
    (v_company_id, v_depot_id, v_layout_id, 'Pedestrian routes', 'PEDESTRIAN', '#22C55E', false, true, false, 2, 'COMMAND'),
    (v_company_id, v_depot_id, v_layout_id, 'Vehicle circulation', 'ROADWAY', '#FEF08A', true, false, false, 3, 'COMMAND'),
    (v_company_id, v_depot_id, v_layout_id, 'Minibus parking', 'PARKING', '#D4A574', true, false, true, 4, 'COMMAND');

  select id into v_zone_id from public.depot_zones
  where layout_id = v_layout_id and type = 'PARKING' limit 1;

  insert into public.lifo_groups (company_id, depot_id, layout_id, name, exit_order, access_direction)
  values (v_company_id, v_depot_id, v_layout_id, 'Column 3 LIFO', 'front_first', 'north')
  returning id into v_lifo_a;

  insert into public.lifo_groups (company_id, depot_id, layout_id, name, exit_order, access_direction)
  values (v_company_id, v_depot_id, v_layout_id, 'Centre row LIFO', 'front_first', 'east')
  returning id into v_lifo_b;

  insert into public.parking_bays (
    company_id, depot_zone_id, layout_id, label, bay_number, display_name,
    position_x, position_y, width, height, parking_direction,
    is_lifo, is_reserved, operational_status, capacity, qr_token, source_app
  )
  select
    v_company_id,
    v_zone_id,
    v_layout_id,
    'Bay ' || n,
    n,
    'Bay ' || n,
    case n
      when 1 then 860 when 2 then 860 when 3 then 860 when 4 then 860
      when 5 then 760 when 6 then 760 when 7 then 760
      when 8 then 660 when 9 then 660 when 10 then 660
      when 11 then 560 when 12 then 560
      when 13 then 380 when 14 then 490 when 15 then 600
      when 16 then 100
      when 17 then 100 when 18 then 100 when 19 then 100 when 20 then 100
      when 21 then 280
      when 22 then 280 when 23 then 280 when 24 then 280
      when 25 then 400 when 26 then 470
      else 0
    end,
    case n
      when 1 then 540 when 2 then 430 when 3 then 320 when 4 then 210
      when 5 then 500 when 6 then 390 when 7 then 280
      when 8 then 460 when 9 then 350 when 10 then 240
      when 11 then 420 when 12 then 300
      when 13 then 580 when 14 then 580 when 15 then 580
      when 16 then 560
      when 17 then 500 when 18 then 430 when 19 then 360 when 20 then 290
      when 21 then 420
      when 22 then 340 when 23 then 270 when 24 then 200
      when 25 then 120 when 26 then 120
      else 0
    end,
    case when n in (13,14,15,17,18,19,20,22,23,24) then 100 else 56 end,
    case when n in (13,14,15,17,18,19,20,22,23,24) then 56 else 100 end,
    case when n in (13,14,15,17,18,19,20,22,23,24) then 'east' else 'north' end,
    n in (10, 15),
    n in (10, 15),
    'available',
    1,
    'bct-bay-' || lpad(n::text, 2, '0'),
    'COMMAND'
  from generate_series(1, 26) as n;

  update public.parking_bays set lifo_group_id = v_lifo_a where layout_id = v_layout_id and bay_number = 10;
  update public.parking_bays set lifo_group_id = v_lifo_b where layout_id = v_layout_id and bay_number = 15;

  raise notice 'BCT Live Yard Map seeded — company % depot %', v_company_id, v_depot_id;
end $$;
