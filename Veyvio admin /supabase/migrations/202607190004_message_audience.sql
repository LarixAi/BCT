-- Who should see a Driver ops message: dispatch (Command), yard, or both

alter table public.messages
  add column if not exists audience text not null default 'dispatch';

alter table public.messages
  drop constraint if exists messages_audience_check;

alter table public.messages
  add constraint messages_audience_check
  check (audience in ('dispatch', 'yard', 'both'));

create index if not exists messages_company_audience_sent_idx
  on public.messages (company_id, audience, sent_at desc);

comment on column public.messages.audience is
  'dispatch = Command ops; yard = Yard app/ops; both = visible to Command and Yard.';
