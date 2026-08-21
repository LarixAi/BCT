-- PR-03 / FIX-P1-013 — P0 second-wave same-company structural triggers.
-- Rejects cross-tenant parent links at the DB layer (including service-role forge).
-- Reuses private.trg_assert_company_fks from 202608170004.

-- ---------------------------------------------------------------------------
-- P0 wave 2 — dispatch / custody / disclosure / document / commercial links
-- ---------------------------------------------------------------------------

drop trigger if exists adblue_records_same_company on public.adblue_records;
create trigger adblue_records_same_company
  before insert or update on public.adblue_records
  for each row execute function private.trg_assert_company_fks(
    'vehicles', 'vehicle_id', 'adblue_records.vehicle_id',
    'depots', 'depot_id', 'adblue_records.depot_id'
  );

drop trigger if exists vehicle_reports_same_company on public.vehicle_reports;
create trigger vehicle_reports_same_company
  before insert or update on public.vehicle_reports
  for each row execute function private.trg_assert_company_fks(
    'vehicles', 'vehicle_id', 'vehicle_reports.vehicle_id',
    'depots', 'depot_id', 'vehicle_reports.depot_id'
  );

drop trigger if exists vehicle_checks_same_company on public.vehicle_checks;
create trigger vehicle_checks_same_company
  before insert or update on public.vehicle_checks
  for each row execute function private.trg_assert_company_fks(
    'vehicles', 'vehicle_id', 'vehicle_checks.vehicle_id',
    'drivers', 'driver_id', 'vehicle_checks.driver_id',
    'duties', 'duty_id', 'vehicle_checks.duty_id'
  );

drop trigger if exists vehicle_equipment_checks_same_company on public.vehicle_equipment_checks;
create trigger vehicle_equipment_checks_same_company
  before insert or update on public.vehicle_equipment_checks
  for each row execute function private.trg_assert_company_fks(
    'vehicles', 'vehicle_id', 'vehicle_equipment_checks.vehicle_id',
    'drivers', 'driver_id', 'vehicle_equipment_checks.driver_id'
  );

drop trigger if exists duty_acknowledgements_same_company on public.duty_acknowledgements;
create trigger duty_acknowledgements_same_company
  before insert or update on public.duty_acknowledgements
  for each row execute function private.trg_assert_company_fks(
    'duties', 'duty_id', 'duty_acknowledgements.duty_id',
    'drivers', 'driver_id', 'duty_acknowledgements.driver_id'
  );

drop trigger if exists duty_assignment_events_same_company on public.duty_assignment_events;
create trigger duty_assignment_events_same_company
  before insert or update on public.duty_assignment_events
  for each row execute function private.trg_assert_company_fks(
    'duties', 'duty_id', 'duty_assignment_events.duty_id',
    'drivers', 'actor_driver_id', 'duty_assignment_events.actor_driver_id'
  );

drop trigger if exists driver_documents_same_company on public.driver_documents;
create trigger driver_documents_same_company
  before insert or update on public.driver_documents
  for each row execute function private.trg_assert_company_fks(
    'drivers', 'driver_id', 'driver_documents.driver_id'
  );

drop trigger if exists equipment_assets_same_company on public.equipment_assets;
create trigger equipment_assets_same_company
  before insert or update on public.equipment_assets
  for each row execute function private.trg_assert_company_fks(
    'vehicles', 'vehicle_id', 'equipment_assets.vehicle_id',
    'depots', 'depot_id', 'equipment_assets.depot_id'
  );

drop trigger if exists purchase_requests_same_company on public.purchase_requests;
create trigger purchase_requests_same_company
  before insert or update on public.purchase_requests
  for each row execute function private.trg_assert_company_fks(
    'vehicles', 'vehicle_id', 'purchase_requests.vehicle_id',
    'depots', 'depot_id', 'purchase_requests.depot_id'
  );

drop trigger if exists incidents_same_company on public.incidents;
create trigger incidents_same_company
  before insert or update on public.incidents
  for each row execute function private.trg_assert_company_fks(
    'vehicles', 'vehicle_id', 'incidents.vehicle_id',
    'drivers', 'driver_id', 'incidents.driver_id',
    'trips', 'trip_id', 'incidents.trip_id',
    'runs', 'run_id', 'incidents.run_id'
  );

drop trigger if exists vor_cases_same_company on public.vor_cases;
create trigger vor_cases_same_company
  before insert or update on public.vor_cases
  for each row execute function private.trg_assert_company_fks(
    'vehicles', 'vehicle_id', 'vor_cases.vehicle_id',
    'defects', 'source_defect_id', 'vor_cases.source_defect_id'
  );

drop trigger if exists yard_movements_same_company on public.yard_movements;
create trigger yard_movements_same_company
  before insert or update on public.yard_movements
  for each row execute function private.trg_assert_company_fks(
    'vehicles', 'vehicle_id', 'yard_movements.vehicle_id',
    'depots', 'depot_id', 'yard_movements.depot_id'
  );

drop trigger if exists journey_stops_same_company on public.journey_stops;
create trigger journey_stops_same_company
  before insert or update on public.journey_stops
  for each row execute function private.trg_assert_company_fks(
    'runs', 'run_id', 'journey_stops.run_id'
  );

drop trigger if exists trips_same_company on public.trips;
create trigger trips_same_company
  before insert or update on public.trips
  for each row execute function private.trg_assert_company_fks(
    'bookings', 'booking_id', 'trips.booking_id',
    'booking_legs', 'booking_leg_id', 'trips.booking_leg_id',
    'depots', 'depot_id', 'trips.depot_id'
  );

drop trigger if exists bookings_same_company on public.bookings;
create trigger bookings_same_company
  before insert or update on public.bookings
  for each row execute function private.trg_assert_company_fks(
    'customers', 'customer_id', 'bookings.customer_id',
    'depots', 'depot_id', 'bookings.depot_id',
    'contracts', 'contract_id', 'bookings.contract_id',
    'customer_contacts', 'requested_by_contact_id', 'bookings.requested_by_contact_id'
  );

drop trigger if exists booking_legs_same_company on public.booking_legs;
create trigger booking_legs_same_company
  before insert or update on public.booking_legs
  for each row execute function private.trg_assert_company_fks(
    'bookings', 'booking_id', 'booking_legs.booking_id'
  );

drop trigger if exists passengers_same_company on public.passengers;
create trigger passengers_same_company
  before insert or update on public.passengers
  for each row execute function private.trg_assert_company_fks(
    'customers', 'customer_id', 'passengers.customer_id'
  );

drop trigger if exists operational_exceptions_same_company on public.operational_exceptions;
create trigger operational_exceptions_same_company
  before insert or update on public.operational_exceptions
  for each row execute function private.trg_assert_company_fks(
    'depots', 'depot_id', 'operational_exceptions.depot_id'
  );

drop trigger if exists interest_submissions_same_company on public.interest_submissions;
create trigger interest_submissions_same_company
  before insert or update on public.interest_submissions
  for each row execute function private.trg_assert_company_fks(
    'bookings', 'converted_booking_id', 'interest_submissions.converted_booking_id',
    'trips', 'converted_trip_id', 'interest_submissions.converted_trip_id'
  );

comment on trigger incidents_same_company on public.incidents is
  'PR-03 P0 wave 2: structural same-company FKs for incident disclosure/mutation paths.';

-- Forge / Command service_role writes must reach BEFORE triggers.
grant all on table public.yard_movements to service_role;
grant all on table public.journey_stops to service_role;
grant all on table public.vehicle_checks to service_role;
grant all on table public.vehicle_equipment_checks to service_role;
grant all on table public.adblue_records to service_role;
grant all on table public.vehicle_reports to service_role;
grant all on table public.duty_acknowledgements to service_role;
grant all on table public.duty_assignment_events to service_role;
grant all on table public.driver_documents to service_role;
grant all on table public.equipment_assets to service_role;
grant all on table public.purchase_requests to service_role;
grant all on table public.incidents to service_role;
grant all on table public.vor_cases to service_role;
grant all on table public.operational_exceptions to service_role;
grant all on table public.interest_submissions to service_role;
grant all on table public.bookings to service_role;
grant all on table public.booking_legs to service_role;
grant all on table public.passengers to service_role;
grant all on table public.trips to service_role;
