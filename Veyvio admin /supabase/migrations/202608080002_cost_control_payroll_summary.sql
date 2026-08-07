-- Cost Control: durable payroll summary import (employer-cost recognition only).
-- Schema: cost_control

CREATE TABLE IF NOT EXISTS cost_control.employee_cost_references (
  id                              text PRIMARY KEY,
  organisation_id                 text NOT NULL REFERENCES cost_control.organisations(id),
  external_payroll_id             text NOT NULL,
  display_name                    text NOT NULL,
  org_node_id                     text NOT NULL DEFAULT '',
  role_title                      text NOT NULL DEFAULT '',
  cost_centre                     text NOT NULL DEFAULT '',
  employment_kind                 text NOT NULL DEFAULT 'employed',
  wage_cost_bearing               boolean NOT NULL DEFAULT true,
  expected_employer_cost_minor    bigint NOT NULL DEFAULT 0,
  overtime_minor                  bigint NOT NULL DEFAULT 0,
  employer_ni_minor               bigint NOT NULL DEFAULT 0,
  employer_pension_minor          bigint NOT NULL DEFAULT 0,
  allocation_complete             boolean NOT NULL DEFAULT true,
  active                          boolean NOT NULL DEFAULT true,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, external_payroll_id)
);

CREATE INDEX IF NOT EXISTS employee_cost_references_org_idx
  ON cost_control.employee_cost_references (organisation_id);

CREATE TABLE IF NOT EXISTS cost_control.pay_periods (
  id                              text PRIMARY KEY,
  organisation_id                 text NOT NULL REFERENCES cost_control.organisations(id),
  label                           text NOT NULL,
  tax_year                        text NOT NULL DEFAULT '',
  frequency                       text NOT NULL DEFAULT 'monthly',
  period_number                   integer NOT NULL DEFAULT 1,
  period_start                    date,
  period_end                      date,
  contractual_payday              date,
  status                          text NOT NULL DEFAULT 'forecast',
  provider_name                   text NOT NULL DEFAULT '',
  scheme_ref_token                text NOT NULL DEFAULT '',
  employee_count                  integer NOT NULL DEFAULT 0,
  budgeted_employer_cost_minor    bigint NOT NULL DEFAULT 0,
  forecast                        jsonb NOT NULL DEFAULT '{}'::jsonb,
  pre_payroll                     jsonb,
  final_payroll                   jsonb,
  exceptions                      jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_import_at                  timestamptz,
  formula_version                 text NOT NULL DEFAULT 'cost-control.payroll-employer.v1',
  sort_order                      integer NOT NULL DEFAULT 0,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pay_periods_org_idx
  ON cost_control.pay_periods (organisation_id, sort_order);

CREATE TABLE IF NOT EXISTS cost_control.payroll_summary_imports (
  id                    text PRIMARY KEY,
  organisation_id       text NOT NULL REFERENCES cost_control.organisations(id),
  file_name             text NOT NULL,
  stage                 text NOT NULL,
  wage_cost_id          text NOT NULL REFERENCES cost_control.cost_records(id),
  rows_read             integer NOT NULL DEFAULT 0,
  matched_count         integer NOT NULL DEFAULT 0,
  unmatched_count       integer NOT NULL DEFAULT 0,
  variance_count        integer NOT NULL DEFAULT 0,
  quarantined_count     integer NOT NULL DEFAULT 0,
  exception_count       integer NOT NULL DEFAULT 0,
  result_payload        jsonb NOT NULL,
  actor_id              text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payroll_summary_imports_org_created_idx
  ON cost_control.payroll_summary_imports (organisation_id, created_at DESC);

ALTER TABLE cost_control.employee_cost_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_control.pay_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_control.payroll_summary_imports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'cost_control' AND tablename = 'employee_cost_references'
      AND policyname = 'employee_cost_references_tenant'
  ) THEN
    CREATE POLICY employee_cost_references_tenant ON cost_control.employee_cost_references
      FOR ALL USING (organisation_id = current_setting('app.active_organisation_id', true))
      WITH CHECK (organisation_id = current_setting('app.active_organisation_id', true));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'cost_control' AND tablename = 'pay_periods'
      AND policyname = 'pay_periods_tenant'
  ) THEN
    CREATE POLICY pay_periods_tenant ON cost_control.pay_periods
      FOR ALL USING (organisation_id = current_setting('app.active_organisation_id', true))
      WITH CHECK (organisation_id = current_setting('app.active_organisation_id', true));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'cost_control' AND tablename = 'payroll_summary_imports'
      AND policyname = 'payroll_summary_imports_tenant'
  ) THEN
    CREATE POLICY payroll_summary_imports_tenant ON cost_control.payroll_summary_imports
      FOR ALL USING (organisation_id = current_setting('app.active_organisation_id', true))
      WITH CHECK (organisation_id = current_setting('app.active_organisation_id', true));
  END IF;
END $$;
