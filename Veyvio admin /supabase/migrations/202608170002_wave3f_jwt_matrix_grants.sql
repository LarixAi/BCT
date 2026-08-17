-- Wave 3F JWT matrix: fleet resource tables already have tenant ALL policies
-- (private.user_has_company) but PostgREST GRANTs omitted SELECT/DML.
-- Without GRANT SELECT, authenticated own-reads fail 42501 before RLS and the
-- JWT isolation proof cannot see tenant policy behaviour.
--
-- Authenticated: SELECT only — writes stay Command API / service-role.
-- service_role: ALL — Command Edge PostgREST writes and isolation SETUP.

comment on table public.equipment_assets is
  'Wave 3F JWT matrix: tenant SELECT via existing company policy; writes Command API / service-role.';
comment on table public.tyre_assets is
  'Wave 3F JWT matrix: tenant SELECT via existing company policy; writes Command API / service-role.';
comment on table public.depot_stock_items is
  'Wave 3F JWT matrix: tenant SELECT via existing company policy; writes Command API / service-role.';
comment on table public.purchase_requests is
  'Wave 3F JWT matrix: tenant SELECT via existing company policy; writes Command API / service-role.';

grant select on table
  public.equipment_assets,
  public.equipment_asset_events,
  public.tyre_assets,
  public.tyre_asset_events,
  public.depot_stock_items,
  public.depot_stock_movements,
  public.purchase_requests
  to authenticated;

grant all on table
  public.equipment_assets,
  public.equipment_asset_events,
  public.tyre_assets,
  public.tyre_asset_events,
  public.depot_stock_items,
  public.depot_stock_movements,
  public.purchase_requests
  to service_role;
