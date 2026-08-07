-- Document body for Executive policies and company records (read/edit surfaces).

alter table public.executive_policies
  add column if not exists body_text text;

alter table public.executive_company_records
  add column if not exists body_text text;

comment on column public.executive_policies.body_text is
  'Full policy text for Executive read/edit. Approved versions are treated as read-only in the app.';

comment on column public.executive_company_records.body_text is
  'Full record/document text for Executive read/edit.';
