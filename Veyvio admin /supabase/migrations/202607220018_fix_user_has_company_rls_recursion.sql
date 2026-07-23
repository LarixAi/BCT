-- user_has_company() is called from 71 tables' RLS policies, including
-- company_memberships' own policy. As a plain LANGUAGE sql STABLE function
-- (not SECURITY DEFINER), Postgres inlines it into the calling query plan —
-- so evaluating it against company_memberships re-triggers that table's own
-- RLS policy, which calls user_has_company() again, recursing until Postgres
-- hits max_stack_depth (error 54001 "stack depth limit exceeded"). This was
-- firing intermittently on almost any authenticated query across the whole
-- platform (drivers, bookings, vehicles, trips, ...), not just one feature.
--
-- Fix: mark it SECURITY DEFINER with an explicit search_path so its internal
-- query against company_memberships runs with elevated privilege and bypasses
-- RLS instead of re-triggering it. This changes only how the function
-- executes, not what it returns.
create or replace function public.user_has_company(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.company_memberships m
    where m.user_id = auth.uid()
      and m.company_id = target_company_id
      and m.status = 'active'
  )
  or target_company_id = any (public.jwt_company_ids());
$function$;
