-- Clear Security Advisor "RLS Enabled No Policy" suggestions.
-- Command API uses service_role (bypasses RLS). These policies define the
-- PostgREST/authenticated surface intentionally.

-- ---------------------------------------------------------------------------
-- Company-scoped operational tables
-- ---------------------------------------------------------------------------
create policy adblue_records_company on public.adblue_records
  for all to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

create policy attendance_day_overrides_company on public.attendance_day_overrides
  for all to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

create policy attendance_leave_audit_company on public.attendance_leave_audit
  for all to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

create policy attendance_leave_requests_company on public.attendance_leave_requests
  for all to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

create policy attendance_notes_company on public.attendance_notes
  for all to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

create policy attendance_return_to_work_company on public.attendance_return_to_work
  for all to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

create policy duty_acknowledgements_company on public.duty_acknowledgements
  for all to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

create policy duty_assignment_events_company on public.duty_assignment_events
  for all to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

create policy duty_live_positions_company on public.duty_live_positions
  for all to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

create policy vehicle_reports_company on public.vehicle_reports
  for all to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

create policy vehicle_report_evidence_company on public.vehicle_report_evidence
  for all to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

create policy vehicle_report_status_history_company on public.vehicle_report_status_history
  for all to authenticated
  using (private.user_has_company(company_id))
  with check (private.user_has_company(company_id));

-- Invitation audit — company via parent invitation
create policy invitation_events_company on public.invitation_events
  for select to authenticated
  using (
    exists (
      select 1
      from public.invitations i
      where i.id = invitation_id
        and private.user_has_company(i.company_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Auth / challenge tables — own rows only (no company_id)
-- ---------------------------------------------------------------------------
create policy mfa_login_challenges_own on public.mfa_login_challenges
  for select to authenticated
  using (user_id = auth.uid());

create policy password_reset_challenges_own on public.password_reset_challenges
  for select to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Signup pipeline — Edge/service_role only (explicit authenticated deny)
-- ---------------------------------------------------------------------------
create policy email_verification_challenges_no_client on public.email_verification_challenges
  for all to authenticated
  using (false)
  with check (false);

create policy pending_organisations_no_client on public.pending_organisations
  for all to authenticated
  using (false)
  with check (false);

create policy pending_users_no_client on public.pending_users
  for all to authenticated
  using (false)
  with check (false);

create policy signup_risk_assessments_no_client on public.signup_risk_assessments
  for all to authenticated
  using (false)
  with check (false);
