-- P0-01: Policies were created in 202607230005 but RLS was never enabled.
-- Without ENABLE ROW LEVEL SECURITY, PostgreSQL ignores those policies for
-- PostgREST / authenticated clients. Service role still bypasses RLS.
-- FORCE ensures even table-owner roles cannot skip tenant checks.

alter table public.attendance_leave_requests enable row level security;
alter table public.attendance_leave_requests force row level security;

alter table public.attendance_leave_audit enable row level security;
alter table public.attendance_leave_audit force row level security;

alter table public.attendance_day_overrides enable row level security;
alter table public.attendance_day_overrides force row level security;

alter table public.attendance_notes enable row level security;
alter table public.attendance_notes force row level security;

alter table public.attendance_return_to_work enable row level security;
alter table public.attendance_return_to_work force row level security;

alter table public.duty_live_positions enable row level security;
alter table public.duty_live_positions force row level security;
