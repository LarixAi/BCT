-- Wave 3F / FIX-P1-013 — first-wave same-company structural triggers.
-- Rejects cross-tenant parent links at the database layer, including forged service-role writes.
-- Join tables duty_runs and run_trips already covered by 202607230006.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function private.lookup_public_company_id(
  p_table text,
  p_id uuid
)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result uuid;
begin
  if p_id is null then
    return null;
  end if;
  execute format('select company_id from public.%I where id = $1', p_table)
    into result
    using p_id;
  return result;
end;
$$;

revoke all on function private.lookup_public_company_id(text, uuid) from public, anon, authenticated;
grant execute on function private.lookup_public_company_id(text, uuid) to service_role, postgres;

create or replace function private.assert_fk_same_as_anchor(
  anchor_company_id uuid,
  fk_table text,
  fk_id uuid,
  context_label text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  linked_company uuid;
begin
  if fk_id is null then
    return;
  end if;
  linked_company := private.lookup_public_company_id(fk_table, fk_id);
  perform private.assert_same_company_pair(anchor_company_id, linked_company, context_label);
end;
$$;

revoke all on function private.assert_fk_same_as_anchor(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function private.assert_fk_same_as_anchor(uuid, text, uuid, text) to service_role, postgres;

-- TG_ARGV triplets: fk_table, column_name, context_label (null table terminates).
create or replace function private.trg_assert_company_fks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  i integer := 0;
  fk_table text;
  fk_col text;
  label text;
  fk_val uuid;
  anchor uuid;
begin
  anchor := NEW.company_id;
  loop
    fk_table := TG_ARGV[i];
    exit when fk_table is null;
    fk_col := TG_ARGV[i + 1];
    label := TG_ARGV[i + 2];
    execute format('select ($1).%I', fk_col) into fk_val using NEW;
    perform private.assert_fk_same_as_anchor(anchor, fk_table, fk_val, label);
    i := i + 3;
  end loop;
  return NEW;
end;
$$;

revoke all on function private.trg_assert_company_fks() from public, anon, authenticated;
grant execute on function private.trg_assert_company_fks() to service_role, postgres;

-- ---------------------------------------------------------------------------
-- First wave — company_id anchor tables
-- ---------------------------------------------------------------------------

drop trigger if exists drivers_same_company on public.drivers;
create trigger drivers_same_company
  before insert or update on public.drivers
  for each row execute function private.trg_assert_company_fks(
    'staff_members', 'staff_id', 'drivers.staff_id',
    'depots', 'primary_depot_id', 'drivers.primary_depot_id'
  );

drop trigger if exists duties_same_company on public.duties;
create trigger duties_same_company
  before insert or update on public.duties
  for each row execute function private.trg_assert_company_fks(
    'drivers', 'driver_id', 'duties.driver_id',
    'depots', 'depot_id', 'duties.depot_id',
    'vehicles', 'vehicle_id', 'duties.vehicle_id',
    'runs', 'active_journey_id', 'duties.active_journey_id'
  );

drop trigger if exists defects_same_company on public.defects;
create trigger defects_same_company
  before insert or update on public.defects
  for each row execute function private.trg_assert_company_fks(
    'vehicles', 'vehicle_id', 'defects.vehicle_id',
    'depots', 'depot_id', 'defects.depot_id',
    'vehicle_damage_cases', 'damage_case_id', 'defects.damage_case_id'
  );

drop trigger if exists runs_same_company on public.runs;
create trigger runs_same_company
  before insert or update on public.runs
  for each row execute function private.trg_assert_company_fks(
    'drivers', 'driver_id', 'runs.driver_id',
    'vehicles', 'vehicle_id', 'runs.vehicle_id',
    'depots', 'depot_id', 'runs.depot_id'
  );

drop trigger if exists trip_assignments_same_company on public.trip_assignments;
create trigger trip_assignments_same_company
  before insert or update on public.trip_assignments
  for each row execute function private.trg_assert_company_fks(
    'trips', 'trip_id', 'trip_assignments.trip_id',
    'runs', 'run_id', 'trip_assignments.run_id',
    'drivers', 'driver_id', 'trip_assignments.driver_id',
    'vehicles', 'vehicle_id', 'trip_assignments.vehicle_id'
  );

drop trigger if exists duty_live_positions_same_company on public.duty_live_positions;
create trigger duty_live_positions_same_company
  before insert or update on public.duty_live_positions
  for each row execute function private.trg_assert_company_fks(
    'duties', 'duty_id', 'duty_live_positions.duty_id',
    'drivers', 'driver_id', 'duty_live_positions.driver_id',
    'vehicles', 'vehicle_id', 'duty_live_positions.vehicle_id'
  );

drop trigger if exists vehicle_swap_requests_same_company on public.vehicle_swap_requests;
create trigger vehicle_swap_requests_same_company
  before insert or update on public.vehicle_swap_requests
  for each row execute function private.trg_assert_company_fks(
    'duties', 'duty_id', 'vehicle_swap_requests.duty_id',
    'drivers', 'driver_id', 'vehicle_swap_requests.driver_id',
    'vehicles', 'current_vehicle_id', 'vehicle_swap_requests.current_vehicle_id',
    'vehicles', 'requested_vehicle_id', 'vehicle_swap_requests.requested_vehicle_id'
  );

drop trigger if exists fuel_records_same_company on public.fuel_records;
create trigger fuel_records_same_company
  before insert or update on public.fuel_records
  for each row execute function private.trg_assert_company_fks(
    'vehicles', 'vehicle_id', 'fuel_records.vehicle_id',
    'drivers', 'driver_id', 'fuel_records.driver_id',
    'depots', 'depot_id', 'fuel_records.depot_id'
  );

comment on function private.trg_assert_company_fks() is
  'Wave 3F FIX-P1-013: BEFORE INSERT/UPDATE trigger body — every non-null FK must share NEW.company_id.';

-- Command API / forge tests write via service_role; ensure INSERT reaches triggers.
grant all on table public.vehicle_swap_requests to service_role;
