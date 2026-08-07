-- Cost Control: durable wage-cost batches (employer wage-cost inputs only).
-- Schema: cost_control

CREATE TABLE IF NOT EXISTS cost_control.driver_days (
  id                    text PRIMARY KEY,
  organisation_id       text NOT NULL REFERENCES cost_control.organisations(id),
  employee_cost_reference_id text NOT NULL,
  pay_period_id         text NOT NULL,
  work_date             date NOT NULL,
  disputed              boolean NOT NULL DEFAULT false,
  payload               jsonb NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS driver_days_org_period_idx
  ON cost_control.driver_days (organisation_id, pay_period_id);

CREATE TABLE IF NOT EXISTS cost_control.effective_pay_rates (
  id                    text PRIMARY KEY,
  organisation_id       text NOT NULL REFERENCES cost_control.organisations(id),
  employee_cost_reference_id text NOT NULL,
  effective_from        date NOT NULL,
  effective_to          date,
  payload               jsonb NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS effective_pay_rates_org_idx
  ON cost_control.effective_pay_rates (organisation_id, employee_cost_reference_id);

CREATE TABLE IF NOT EXISTS cost_control.wage_cost_batches (
  id                    text PRIMARY KEY,
  organisation_id       text NOT NULL REFERENCES cost_control.organisations(id),
  pay_period_id         text NOT NULL,
  status                text NOT NULL,
  total_provisional_gross_minor bigint NOT NULL DEFAULT 0,
  payload               jsonb NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wage_cost_batches_org_idx
  ON cost_control.wage_cost_batches (organisation_id, pay_period_id);

ALTER TABLE cost_control.driver_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_control.effective_pay_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_control.wage_cost_batches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'cost_control' AND tablename = 'driver_days'
      AND policyname = 'driver_days_tenant'
  ) THEN
    CREATE POLICY driver_days_tenant ON cost_control.driver_days
      FOR ALL USING (organisation_id = current_setting('app.active_organisation_id', true))
      WITH CHECK (organisation_id = current_setting('app.active_organisation_id', true));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'cost_control' AND tablename = 'effective_pay_rates'
      AND policyname = 'effective_pay_rates_tenant'
  ) THEN
    CREATE POLICY effective_pay_rates_tenant ON cost_control.effective_pay_rates
      FOR ALL USING (organisation_id = current_setting('app.active_organisation_id', true))
      WITH CHECK (organisation_id = current_setting('app.active_organisation_id', true));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'cost_control' AND tablename = 'wage_cost_batches'
      AND policyname = 'wage_cost_batches_tenant'
  ) THEN
    CREATE POLICY wage_cost_batches_tenant ON cost_control.wage_cost_batches
      FOR ALL USING (organisation_id = current_setting('app.active_organisation_id', true))
      WITH CHECK (organisation_id = current_setting('app.active_organisation_id', true));
  END IF;
END $$;
