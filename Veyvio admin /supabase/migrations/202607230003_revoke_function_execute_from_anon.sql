-- Supabase roles can retain EXECUTE after REVOKE FROM PUBLIC.
-- Explicitly strip anon (and over-broad authenticated) then re-grant intentionally.

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.current_user_id() from public, anon, authenticated;
revoke all on function public.jwt_company_ids() from public, anon, authenticated;
revoke all on function public.jwt_active_company_id() from public, anon, authenticated;
revoke all on function public.ensure_default_company_roles(uuid, uuid) from public, anon, authenticated;
revoke all on function public.user_has_company(uuid) from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

grant execute on function public.set_updated_at() to postgres, service_role;
grant execute on function public.current_user_id() to authenticated, service_role;
grant execute on function public.jwt_company_ids() to authenticated, service_role;
grant execute on function public.jwt_active_company_id() to authenticated, service_role;
grant execute on function public.user_has_company(uuid) to authenticated, service_role;
grant execute on function public.ensure_default_company_roles(uuid, uuid) to service_role;
grant execute on function public.rls_auto_enable() to postgres;
