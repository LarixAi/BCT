-- Holiday entitlement: company defaults, per-driver profiles, minutes ledger.

create table if not exists public.company_holiday_defaults (
  company_id uuid primary key references public.companies (id) on delete cascade,
  leave_year_mode text not null default 'calendar'
    check (leave_year_mode in ('calendar', 'financial', 'anniversary', 'custom')),
  custom_leave_year_start_month integer check (custom_leave_year_start_month between 1 and 12),
  custom_leave_year_start_day integer check (custom_leave_year_start_day between 1 and 31),
  entitlement_weeks numeric(4, 2) not null default 5.6,
  bank_holidays_included boolean not null default true,
  carry_over_limit_days numeric(6, 2) not null default 5,
  carry_over_expiry_months integer not null default 3,
  requests_require_approval boolean not null default true,
  standard_day_minutes integer not null default 480,
  rounding_policy text not null default 'nearest_quarter_hour'
    check (rounding_policy in ('none', 'nearest_half_day', 'nearest_quarter_hour', 'nearest_hour')),
  allow_negative_balance boolean not null default false,
  maximum_negative_minutes integer,
  default_calculation_method text not null default 'fixed_days'
    check (default_calculation_method in ('fixed_days', 'fixed_hours', 'irregular_hours', 'manual')),
  default_contracted_days_per_week numeric(4, 2) not null default 5,
  default_contracted_hours_per_week numeric(6, 2) not null default 40,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id)
);

create table if not exists public.driver_holiday_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  driver_id uuid not null references public.drivers (id) on delete cascade,
  leave_year_mode text not null default 'calendar'
    check (leave_year_mode in ('calendar', 'financial', 'anniversary', 'custom')),
  leave_year_start date not null,
  leave_year_end date not null,
  calculation_method text not null default 'fixed_days'
    check (calculation_method in ('fixed_days', 'fixed_hours', 'irregular_hours', 'manual')),
  entitlement_weeks numeric(4, 2) not null default 5.6,
  contracted_days_per_week numeric(4, 2) not null default 5,
  contracted_hours_per_week numeric(6, 2) not null default 40,
  standard_day_minutes integer not null default 480,
  annual_entitlement_minutes integer not null default 0,
  carried_forward_minutes integer not null default 0,
  carry_forward_expires_at date,
  bank_holidays_included boolean not null default true,
  allow_negative_balance boolean not null default false,
  maximum_negative_minutes integer,
  rounding_policy text not null default 'nearest_quarter_hour',
  approval_manager_user_id uuid references public.users (id),
  employment_start_date date,
  employment_end_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id),
  unique (driver_id)
);

create index if not exists driver_holiday_profiles_company_idx
  on public.driver_holiday_profiles (company_id);

create table if not exists public.holiday_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  driver_id uuid not null references public.drivers (id) on delete cascade,
  leave_year_start date not null,
  leave_year_end date not null,
  entry_type text not null check (entry_type in (
    'opening_entitlement',
    'accrual',
    'carry_forward',
    'approved_leave',
    'leave_reversal',
    'manual_adjustment',
    'expiry',
    'termination_payment'
  )),
  minutes integer not null,
  effective_at date not null,
  reference_id uuid,
  reference_type text,
  reason text,
  created_by uuid references public.users (id),
  created_by_name text not null default 'System',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists holiday_ledger_driver_year_idx
  on public.holiday_ledger_entries (company_id, driver_id, leave_year_start, effective_at);

create index if not exists holiday_ledger_reference_idx
  on public.holiday_ledger_entries (reference_type, reference_id);

do $$
declare
  t text;
begin
  foreach t in array array[
    'company_holiday_defaults',
    'driver_holiday_profiles',
    'holiday_ledger_entries'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I_company_select on public.%I for select using (public.user_has_company(company_id))',
      t, t
    );
  end loop;
end $$;

grant select on public.company_holiday_defaults to authenticated;
grant select on public.driver_holiday_profiles to authenticated;
grant select on public.holiday_ledger_entries to authenticated;
grant all on public.company_holiday_defaults to service_role;
grant all on public.driver_holiday_profiles to service_role;
grant all on public.holiday_ledger_entries to service_role;

comment on table public.company_holiday_defaults is
  'Company-wide holiday defaults (UK 5.6 weeks, calendar leave year).';
comment on table public.driver_holiday_profiles is
  'Per-driver holiday configuration and contractual entitlement.';
comment on table public.holiday_ledger_entries is
  'Auditable minutes ledger for holiday balance (never store a lone editable balance).';
