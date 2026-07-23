-- Sprint 1 tenant hardening
-- 1) notifications: recipient AND company membership
-- 2) join tables: replace open authenticated SELECT with parent company helpers
-- 3) same-company proofs for multi-parent joins (triggers)
-- 4) storage driver-documents: ensure private.user_has_company (not dropped public RPC)

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
drop policy if exists notifications_recipient_select on public.notifications;
drop policy if exists notifications_company_recipient_select on public.notifications;

create policy notifications_company_recipient_select on public.notifications
  for select to authenticated
  using (
    recipient_user_id = auth.uid()
    and private.user_has_company(company_id)
  );

-- ---------------------------------------------------------------------------
-- Join tables — close "any authenticated can SELECT all rows" leak
-- ---------------------------------------------------------------------------
drop policy if exists driver_capabilities_authenticated_select on public.driver_capabilities;
drop policy if exists vehicle_capabilities_authenticated_select on public.vehicle_capabilities;
drop policy if exists run_trips_authenticated_select on public.run_trips;
drop policy if exists duty_runs_authenticated_select on public.duty_runs;

create policy driver_capabilities_company_select on public.driver_capabilities
  for select to authenticated
  using (
    exists (
      select 1
      from public.drivers d
      where d.id = driver_id
        and private.user_has_company(d.company_id)
    )
  );

create policy vehicle_capabilities_company_select on public.vehicle_capabilities
  for select to authenticated
  using (
    exists (
      select 1
      from public.vehicles v
      where v.id = vehicle_id
        and private.user_has_company(v.company_id)
    )
  );

create policy run_trips_company_select on public.run_trips
  for select to authenticated
  using (
    exists (
      select 1
      from public.runs r
      where r.id = run_id
        and private.user_has_company(r.company_id)
    )
  );

create policy duty_runs_company_select on public.duty_runs
  for select to authenticated
  using (
    exists (
      select 1
      from public.duties d
      where d.id = duty_id
        and private.user_has_company(d.company_id)
    )
  );

-- depot_access / role_permissions / invitation_events already parent-scoped;
-- tighten depot_access to require membership company matches depot company on write paths via trigger below.

-- ---------------------------------------------------------------------------
-- Same-company FK proofs (prevents service-role / bug linking Org A ↔ Org B)
-- ---------------------------------------------------------------------------
create or replace function private.assert_same_company_pair(
  left_company_id uuid,
  right_company_id uuid,
  context_label text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if left_company_id is null or right_company_id is null then
    raise exception '%: missing company on linked row', context_label
      using errcode = '23514';
  end if;
  if left_company_id <> right_company_id then
    raise exception '%: cross-tenant link refused', context_label
      using errcode = '23514';
  end if;
end;
$$;

revoke all on function private.assert_same_company_pair(uuid, uuid, text) from public, anon, authenticated;
grant execute on function private.assert_same_company_pair(uuid, uuid, text) to service_role, postgres;

create or replace function private.trg_depot_access_same_company()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  membership_company uuid;
  depot_company uuid;
begin
  select m.company_id into membership_company
  from public.company_memberships m where m.id = new.membership_id;
  select d.company_id into depot_company
  from public.depots d where d.id = new.depot_id;
  perform private.assert_same_company_pair(membership_company, depot_company, 'depot_access');
  return new;
end;
$$;

drop trigger if exists depot_access_same_company on public.depot_access;
create trigger depot_access_same_company
  before insert or update on public.depot_access
  for each row execute function private.trg_depot_access_same_company();

create or replace function private.trg_duty_runs_same_company()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  duty_company uuid;
  run_company uuid;
begin
  select d.company_id into duty_company from public.duties d where d.id = new.duty_id;
  select r.company_id into run_company from public.runs r where r.id = new.run_id;
  perform private.assert_same_company_pair(duty_company, run_company, 'duty_runs');
  return new;
end;
$$;

drop trigger if exists duty_runs_same_company on public.duty_runs;
create trigger duty_runs_same_company
  before insert or update on public.duty_runs
  for each row execute function private.trg_duty_runs_same_company();

create or replace function private.trg_run_trips_same_company()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  run_company uuid;
  trip_company uuid;
begin
  select r.company_id into run_company from public.runs r where r.id = new.run_id;
  select t.company_id into trip_company from public.trips t where t.id = new.trip_id;
  perform private.assert_same_company_pair(run_company, trip_company, 'run_trips');
  return new;
end;
$$;

drop trigger if exists run_trips_same_company on public.run_trips;
create trigger run_trips_same_company
  before insert or update on public.run_trips
  for each row execute function private.trg_run_trips_same_company();

-- invitation_events / role_permissions: already parent-scoped via EXISTS policies.

-- ---------------------------------------------------------------------------
-- Storage — rewrite company helper to private schema
-- ---------------------------------------------------------------------------
drop policy if exists driver_documents_authenticated_select on storage.objects;

create policy driver_documents_authenticated_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'driver-documents'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and private.user_has_company(((storage.foldername(name))[1])::uuid)
);
