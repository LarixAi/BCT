-- Tenant isolation hardening: remove stale JWT company list from RLS helper.

create or replace function private.user_has_company(target_company_id uuid)
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
  );
$function$;

comment on function private.user_has_company(uuid) is
  'RLS helper — active membership only (no stale jwt_company_ids fallback).';
