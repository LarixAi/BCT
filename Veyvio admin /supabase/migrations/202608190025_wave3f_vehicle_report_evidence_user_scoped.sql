-- Wave 3F UserScopedDb/RLS cutover 25: vehicle_report_evidence SELECT/INSERT for members.
-- Append-oriented. Parent vehicle_reports already cut over (008). UPDATE/DELETE stay revoked.

comment on table public.vehicle_report_evidence is
  'Wave 3F cutover 25: authenticated member SELECT/INSERT via private.user_has_company; UPDATE/DELETE not granted; service_role retained for support-grant.';

drop policy if exists vehicle_report_evidence_company on public.vehicle_report_evidence;
drop policy if exists vehicle_report_evidence_select_company on public.vehicle_report_evidence;
drop policy if exists vehicle_report_evidence_insert_company on public.vehicle_report_evidence;

create policy vehicle_report_evidence_select_company
  on public.vehicle_report_evidence
  for select to authenticated
  using (private.user_has_company(company_id));

create policy vehicle_report_evidence_insert_company
  on public.vehicle_report_evidence
  for insert to authenticated
  with check (private.user_has_company(company_id));

grant select, insert on table public.vehicle_report_evidence to authenticated;
revoke update, delete on table public.vehicle_report_evidence from authenticated;

grant all on table public.vehicle_report_evidence to service_role;
