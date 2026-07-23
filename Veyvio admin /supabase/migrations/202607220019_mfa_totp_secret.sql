-- Authenticator (TOTP) secret for Command MFA enrollment / verification.
-- Service-role only via the Command API; RLS already restricts row visibility.

alter table public.user_mfa_methods
  add column if not exists totp_secret text;

comment on column public.user_mfa_methods.totp_secret is
  'Base32 TOTP secret for authenticator apps. Readable only via service role in Command API.';

-- Old MFA enablement only created recovery codes / a stub method — no authenticator secret.
-- Clear that so people can sign in and enroll a real authenticator app with a QR code.
update public.user_mfa_methods
set disabled_at = coalesce(disabled_at, timezone('utc', now()))
where method_type = 'authenticator_app'
  and nullif(totp_secret, '') is null
  and disabled_at is null;

update public.users u
set mfa_enabled = false
where coalesce(u.mfa_enabled, false) = true
  and not exists (
    select 1
    from public.user_mfa_methods m
    where m.user_id = u.id
      and m.method_type = 'authenticator_app'
      and nullif(m.totp_secret, '') is not null
      and m.disabled_at is null
  );
