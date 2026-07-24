-- Enable Realtime on yard map tables (idempotent)

do $$
begin
  alter publication supabase_realtime add table public.vehicle_locations;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.yard_movements;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.parking_bays;
exception when duplicate_object then null;
end $$;
