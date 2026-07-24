-- Link laronelaing1@outlook.com to Brent Community Transport (BCT) with Yard access to BCT Main Depot.
-- Idempotent — safe to re-run.

do $$
declare
  v_user_id uuid;
  v_company_id uuid;
  v_depot_id uuid;
  v_membership_id uuid;
  v_role_id uuid;
begin
  select id into v_user_id
  from auth.users
  where lower(email) = lower('laronelaing1@outlook.com')
  limit 1;

  if v_user_id is null then
    raise notice 'User laronelaing1@outlook.com not found in auth.users — skip BCT membership link';
    return;
  end if;

  insert into public.users (id, email, first_name, last_name)
  values (v_user_id, 'laronelaing1@outlook.com', 'Kenny', 'Laing')
  on conflict (id) do update
    set email = excluded.email,
        updated_at = timezone('utc', now());

  select id into v_company_id
  from public.companies
  where external_reference = 'BCT'
     or trading_name ilike '%Brent Community Transport%'
  order by created_at asc
  limit 1;

  if v_company_id is null then
    raise notice 'BCT company not found — run BCT yard seed first';
    return;
  end if;

  select id into v_depot_id
  from public.depots
  where company_id = v_company_id and code = 'BCT-MAIN'
  limit 1;

  perform public.ensure_default_company_roles(v_company_id, v_user_id);

  select id into v_role_id
  from public.roles
  where company_id = v_company_id and name = 'yard_manager'
  limit 1;

  if v_role_id is null then
    raise notice 'yard_manager role missing for BCT';
    return;
  end if;

  insert into public.company_memberships (
    user_id, company_id, role_ids, status, accepted_at, source_app
  ) values (
    v_user_id, v_company_id, array[v_role_id], 'active', timezone('utc', now()), 'COMMAND'
  )
  on conflict (user_id, company_id) do update
    set role_ids = array[v_role_id],
        status = 'active',
        accepted_at = coalesce(public.company_memberships.accepted_at, timezone('utc', now())),
        updated_at = timezone('utc', now())
  returning id into v_membership_id;

  if v_membership_id is null then
    select id into v_membership_id
    from public.company_memberships
    where user_id = v_user_id and company_id = v_company_id;
  end if;

  if v_depot_id is not null and v_membership_id is not null then
    insert into public.depot_access (membership_id, depot_id, access_level)
    values (v_membership_id, v_depot_id, 'manage')
    on conflict (membership_id, depot_id) do update
      set access_level = 'manage';
  end if;

  raise notice 'Linked laronelaing1@outlook.com (%) to BCT company % depot %',
    v_user_id, v_company_id, coalesce(v_depot_id::text, 'n/a');
end $$;
