-- Wave 3F UserScopedDb/RLS cutover 96: users SELECT for same-company peers.
-- Keeps existing self SELECT/UPDATE. No authenticated INSERT/DELETE on users
-- (identity is Auth Admin / platform). Enables JWT projection directory reads.

comment on table public.users is
  'Wave 3F cutover 96: authenticated members may SELECT peer users who share an active company membership; self UPDATE retained; INSERT/DELETE not granted to authenticated.';

drop policy if exists users_company_peer_select on public.users;
drop policy if exists users_select_company on public.users;
drop policy if exists users_company_select on public.users;

create policy users_company_peer_select
  on public.users
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.company_memberships peer
      where peer.user_id = users.id
        and private.user_has_company(peer.company_id)
    )
  );

grant select on table public.users to authenticated;
revoke insert, delete on table public.users from authenticated;

-- Self-update remains via existing users_self_update policy + prior UPDATE grant.

grant all on table public.users to service_role;
