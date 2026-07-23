-- MFA login was returning a real access/refresh token (and, in dev, the plaintext
-- code) before the challenge was verified — a full MFA bypass. The pending refresh
-- token now lives server-side on the challenge row instead of being handed to the
-- client; it's only exchanged for a real session after the code is verified.
alter table public.mfa_login_challenges
  add column if not exists refresh_token text;
