-- Wave 3F UserScopedDb/RLS cutover 24: vehicle_report_status_history SELECT/INSERT for members.
-- Append-only. Parent vehicle_reports already cut over (008). UPDATE/DELETE stay revoked.

comment on table public.vehicle_report_status_history is
  'Wave 3F cutover 24: authenticated member SELECT/INSERT via private.user_has_company; UPDATE/DELETE not granted; service_role retained for support-grant.';

drop policy if exists vehicle_report_status_history_company on public.vehicle_report_status_history;
drop policy if exists vehicle_report_status_history_select_company on public.vehicle_report_status_history;
drop policy if exists vehicle_report_status_history_insert_company on public.vehicle_report_status_history;

create policy vehicle_report_status_history_select_company
  on public.vehicle_report_status_history
  for select to authenticated
  using (private.user_has_company(company_id));

create policy vehicle_report_status_history_insert_company
  on public.vehicle_report_status_history
  for insert to authenticated
  with check (private.user_has_company(company_id));

grant select, insert on table public.vehicle_report_status_history to authenticated;
revoke update, delete on table public.vehicle_report_status_history from authenticated;

grant all on table public.vehicle_report_status_history to service_role;
