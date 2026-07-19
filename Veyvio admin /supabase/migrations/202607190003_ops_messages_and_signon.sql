-- Ops notices / driver messages + indexes for duty sign-on visibility

alter table public.messages
  add column if not exists driver_id uuid references public.drivers (id) on delete set null,
  add column if not exists subject text,
  add column if not exists recipient_user_id uuid references public.users (id) on delete set null,
  add column if not exists read_at timestamptz,
  add column if not exists requires_ack boolean not null default false,
  add column if not exists acknowledged_at timestamptz;

create index if not exists messages_company_driver_sent_idx
  on public.messages (company_id, driver_id, sent_at desc);

create index if not exists messages_company_conversation_sent_idx
  on public.messages (company_id, conversation_id, sent_at);

create index if not exists messages_recipient_unread_idx
  on public.messages (company_id, recipient_user_id, read_at)
  where read_at is null;

create index if not exists duties_company_actual_sign_on_idx
  on public.duties (company_id, actual_sign_on_at desc);

comment on column public.messages.driver_id is
  'Driver this ops notice/thread is addressed to (Command ↔ Driver shared inbox).';
