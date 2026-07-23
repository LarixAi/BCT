-- Tenant table register for Multi-Tenant Readiness Audit
with tables as (
  select c.oid, n.nspname as schema_name, c.relname as table_name,
         c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public','storage','private') and c.relkind = 'r'
),
cols as (
  select table_schema, table_name,
    bool_or(column_name = 'company_id') as has_company_id,
    bool_or(column_name = 'organisation_id') as has_organisation_id
  from information_schema.columns
  where table_schema in ('public','storage','private')
  group by table_schema, table_name
),
pols as (
  select schemaname, tablename,
    count(*) as policy_count,
    count(*) filter (where cmd in ('SELECT','ALL')) as select_policies,
    count(*) filter (where cmd in ('INSERT','ALL')) as insert_policies,
    count(*) filter (where cmd in ('UPDATE','ALL')) as update_policies,
    count(*) filter (where cmd in ('DELETE','ALL')) as delete_policies,
    bool_or(coalesce(qual,'') ilike '%user_has_company%'
         or coalesce(with_check,'') ilike '%user_has_company%') as uses_company_helper
  from pg_policies
  where schemaname in ('public','storage','private')
  group by schemaname, tablename
)
select t.schema_name, t.table_name, t.rls_enabled,
  coalesce(c.has_company_id,false) as has_company_id,
  coalesce(c.has_organisation_id,false) as has_organisation_id,
  coalesce(p.policy_count,0) as policy_count,
  coalesce(p.select_policies,0) as select_policies,
  coalesce(p.insert_policies,0) as insert_policies,
  coalesce(p.update_policies,0) as update_policies,
  coalesce(p.delete_policies,0) as delete_policies,
  coalesce(p.uses_company_helper,false) as uses_company_helper
from tables t
left join cols c on c.table_schema = t.schema_name and c.table_name = t.table_name
left join pols p on p.schemaname = t.schema_name and p.tablename = t.table_name
order by t.schema_name, t.table_name;
