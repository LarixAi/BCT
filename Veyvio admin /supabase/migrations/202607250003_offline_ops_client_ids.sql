-- Offline ops idempotency: driver defect/incident replays use client_generated_id (F-15).

create unique index if not exists defects_company_client_generated_id_uidx
  on public.defects (company_id, client_generated_id)
  where client_generated_id is not null;

alter table public.incidents
  add column if not exists client_generated_id text;

create unique index if not exists incidents_company_client_generated_id_uidx
  on public.incidents (company_id, client_generated_id)
  where client_generated_id is not null;
