-- BCT Main Depot — align parking bay geometry with official depot parking map (v2 layout).

do $$
declare
  v_layout_id uuid;
begin
  select yl.id into v_layout_id
  from public.yard_layouts yl
  join public.depots d on d.id = yl.depot_id
  join public.companies c on c.id = yl.company_id
  where d.code = 'BCT-MAIN'
    and (c.external_reference = 'BCT' or c.trading_name ilike '%Brent Community Transport%')
    and yl.name = 'Main Depot Parking Map'
  limit 1;

  if v_layout_id is null then
    raise notice 'BCT yard layout not found — skip geometry refresh';
    return;
  end if;

  update public.yard_layouts
  set canvas_width = 1000, canvas_height = 720, updated_at = timezone('utc', now())
  where id = v_layout_id;

  update public.parking_bays set
    position_x = v.x, position_y = v.y, width = v.w, height = v.h,
    parking_direction = v.dir, updated_at = timezone('utc', now())
  from (values
    (1,  918, 472, 52, 92, 'north'),
    (2,  918, 352, 52, 92, 'north'),
    (3,  918, 232, 52, 92, 'north'),
    (4,  918, 108, 52, 118, 'north'),
    (5,  848, 442, 52, 92, 'north'),
    (6,  848, 322, 52, 92, 'north'),
    (7,  848, 202, 52, 92, 'north'),
    (8,  778, 442, 52, 92, 'north'),
    (9,  778, 322, 52, 92, 'north'),
    (10, 778, 202, 52, 92, 'north'),
    (11, 708, 402, 52, 92, 'north'),
    (12, 708, 262, 52, 92, 'north'),
    (13, 598, 432, 108, 44, 'east'),
    (14, 598, 492, 108, 44, 'east'),
    (15, 638, 278, 52, 92, 'north'),
    (16, 108, 608, 52, 92, 'north'),
    (17, 28,  624, 108, 44, 'east'),
    (18, 28,  572, 108, 44, 'east'),
    (19, 28,  520, 108, 44, 'east'),
    (20, 28,  468, 108, 44, 'east'),
    (21, 162, 392, 52, 72, 'north'),
    (22, 36,  234, 108, 44, 'east'),
    (23, 36,  182, 108, 44, 'east'),
    (24, 36,  130, 108, 44, 'east'),
    (25, 292, 28,  52, 92, 'north'),
    (26, 292, 128, 52, 92, 'north')
  ) as v(n, x, y, w, h, dir)
  where parking_bays.layout_id = v_layout_id and parking_bays.bay_number = v.n;

  update public.parking_bays set is_lifo = true, is_reserved = true
  where layout_id = v_layout_id and bay_number in (10, 15);

  raise notice 'BCT bay geometry updated for layout %', v_layout_id;
end $$;
