-- Enable interactive spatial yard map for all depots (default template until per-depot layout is published).

update public.depots
set
  yard_map_enabled = true,
  updated_at = timezone('utc', now())
where coalesce(yard_map_enabled, false) = false;

alter table public.depots
  alter column yard_map_enabled set default true;
