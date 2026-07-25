-- Link operational defects (driver/yard bodywork) to long-lived vehicle_damage_cases.

alter table public.defects
  add column if not exists damage_case_id uuid references public.vehicle_damage_cases (id) on delete set null;

alter table public.vehicle_damage_cases
  add column if not exists linked_defect_id uuid references public.defects (id) on delete set null;

create unique index if not exists vehicle_damage_cases_linked_defect_unique
  on public.vehicle_damage_cases (company_id, linked_defect_id)
  where linked_defect_id is not null;

create index if not exists defects_company_damage_case_idx
  on public.defects (company_id, damage_case_id)
  where damage_case_id is not null;

comment on column public.defects.damage_case_id is
  'Body condition damage case for this defect when category is bodywork/driver body damage.';
comment on column public.vehicle_damage_cases.linked_defect_id is
  'Operational defect that opened this damage case (driver walkaround or defect report).';
