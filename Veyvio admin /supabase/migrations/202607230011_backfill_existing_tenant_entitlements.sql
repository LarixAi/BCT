-- Backfill existing operators (BCT, Veyvio demo, etc.) with Yard-capable entitlements
-- after multi-tenant SaaS rollout. Safe to re-run.

-- Professional-equivalent plan for legacy rows (includes Yard module via plan_features).
update public.company_subscriptions
set
  plan_code = 'command_standard',
  status = case
    when lower(coalesce(status, '')) in ('canceled', 'cancelled', 'unpaid', 'incomplete_expired') then status
    else 'active'
  end,
  updated_at = timezone('utc', now())
where plan_code is null
   or trim(plan_code) = ''
   or plan_code = 'starter';

-- Activate companies that already have active staff but are stuck in setup states.
update public.companies c
set
  tenant_status = 'ACTIVE',
  activated_at = coalesce(c.activated_at, timezone('utc', now())),
  updated_at = timezone('utc', now())
where c.tenant_status in ('SETUP_REQUIRED', 'PENDING_CONTRACT', 'PENDING_PAYMENT')
  and exists (
    select 1
    from public.company_memberships m
    where m.company_id = c.id
      and m.status = 'active'
  );

-- Explicit Yard entitlement for every existing company (safety net during rollout).
insert into public.company_entitlement_overrides (company_id, module_key, enabled, reason)
select c.id, 'yard', true, 'Backfill: retain Yard access for existing operators'
from public.companies c
on conflict (company_id, module_key) do update set
  enabled = excluded.enabled,
  reason = excluded.reason;

-- Tenant-scoped read policies before any future direct Supabase client access.
drop policy if exists yard_tasks_company_select on public.yard_tasks;
create policy yard_tasks_company_select on public.yard_tasks
  for select to authenticated
  using (private.user_has_company(company_id));

drop policy if exists yard_movements_company_select on public.yard_movements;
create policy yard_movements_company_select on public.yard_movements
  for select to authenticated
  using (private.user_has_company(company_id));
