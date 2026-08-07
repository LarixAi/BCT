-- Incident workflow metadata (acknowledgement, escalation, driver receipt timeline).

alter table public.incidents
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists incidents_company_metadata_ack_idx
  on public.incidents (company_id, ((metadata ->> 'acknowledgedAt')))
  where (metadata ->> 'acknowledgedAt') is null;
