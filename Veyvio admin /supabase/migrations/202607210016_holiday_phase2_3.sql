-- Phase 2/3 holiday extensions: working weekdays, unpaid leave, pay records, accrual posts.

alter table public.driver_holiday_profiles
  add column if not exists working_weekdays integer[] not null default '{1,2,3,4,5}',
  add column if not exists usual_weekly_pay_pence integer,
  add column if not exists average_52_week_pay_pence integer;

alter table public.company_holiday_defaults
  add column if not exists paid_leave_types text[] not null default '{annual_leave,bereavement}',
  add column if not exists blackout_ranges jsonb not null default '[]'::jsonb;

create table if not exists public.holiday_pay_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  driver_id uuid not null references public.drivers (id) on delete cascade,
  leave_request_id uuid references public.attendance_leave_requests (id) on delete set null,
  leave_year_start date not null,
  minutes_paid integer not null,
  basis text not null check (basis in ('usual_pay', 'average_52_weeks')),
  average_weekly_pay_pence integer,
  calculated_pay_pence integer,
  notes text not null default '',
  calculated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users (id)
);

create index if not exists holiday_pay_records_driver_idx
  on public.holiday_pay_records (company_id, driver_id, calculated_at desc);

alter table public.holiday_pay_records enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'holiday_pay_records' and policyname = 'holiday_pay_records_company_select'
  ) then
    create policy holiday_pay_records_company_select
      on public.holiday_pay_records for select
      using (public.user_has_company(company_id));
  end if;
end $$;

grant select on public.holiday_pay_records to authenticated;
grant all on public.holiday_pay_records to service_role;

comment on table public.holiday_pay_records is
  'Holiday pay calculation (separate from time entitlement) for payroll export.';
comment on column public.driver_holiday_profiles.working_weekdays is
  'ISO weekdays 1=Mon … 7=Sun the driver is contracted to work.';
