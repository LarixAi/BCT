-- Photo / zone evidence on defects (Driver walkaround bodywork → Admin + Yard)

alter table public.defects
  add column if not exists evidence jsonb not null default '{}'::jsonb;

create index if not exists defects_company_category_reported_idx
  on public.defects (company_id, category, reported_at desc);

comment on column public.defects.evidence is
  'Driver/Yard evidence: photoDataUrl, photoPath, zone, damageType, vehicleCheckId.';
