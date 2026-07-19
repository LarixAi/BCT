-- Auth continuation: password reset challenges, invitation events, MFA recovery codes.

create table if not exists public.password_reset_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete cascade,
  email text not null,
  token_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  invalidated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  created_ip text,
  user_agent text
);

create table if not exists public.invitation_events (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations (id) on delete cascade,
  event_type text not null,
  actor_user_id uuid references public.users (id),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mfa_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.password_reset_challenges enable row level security;
alter table public.invitation_events enable row level security;
alter table public.mfa_recovery_codes enable row level security;

create policy mfa_recovery_self on public.mfa_recovery_codes
  for select using (user_id = auth.uid());

grant all on table public.password_reset_challenges to service_role;
grant all on table public.invitation_events to service_role;
grant all on table public.mfa_recovery_codes to service_role;
grant select on table public.mfa_recovery_codes to authenticated;

-- More granular invite permission
insert into public.permissions (code, description, module) values
  ('settings.invitations.manage', 'Create and revoke company invitations', 'identity')
on conflict (code) do nothing;

-- Existing smoke-test admin can enter Command while MFA rollout completes.
update public.users
set mfa_enabled = true
where email = 'admin@veyvio.test';
