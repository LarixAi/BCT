-- Veyvio Cost Control — Phase 1 foundation schema
-- Blueprint §12.2–12.4 / §13
-- Every tenant-owned row carries organisation_id. Monetary amounts use amount_minor (bigint).
-- Apply against a dedicated Cost Control Postgres database (not Command ops DB).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Organisation
-- ---------------------------------------------------------------------------
CREATE TABLE organisations (
  id              text PRIMARY KEY,
  name            text NOT NULL,
  trading_name    text NOT NULL,
  currency        char(3) NOT NULL DEFAULT 'GBP',
  timezone        text NOT NULL DEFAULT 'Europe/London',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cost_centres (
  id              text PRIMARY KEY,
  organisation_id text NOT NULL REFERENCES organisations(id),
  code            text NOT NULL,
  name            text NOT NULL,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, code)
);

CREATE TABLE suppliers (
  id              text PRIMARY KEY,
  organisation_id text NOT NULL REFERENCES organisations(id),
  name            text NOT NULL,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE vehicles_ref (
  id              text PRIMARY KEY,
  organisation_id text NOT NULL REFERENCES organisations(id),
  registration    text NOT NULL,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, registration)
);

-- ---------------------------------------------------------------------------
-- Budgets (hierarchy: org → financial year → programme → lines)
-- ---------------------------------------------------------------------------
CREATE TABLE budgets (
  id                text PRIMARY KEY,
  organisation_id   text NOT NULL REFERENCES organisations(id),
  name              text NOT NULL,
  code              text NOT NULL,
  financial_year    text NOT NULL,
  version           integer NOT NULL DEFAULT 1,
  currency          char(3) NOT NULL DEFAULT 'GBP',
  contingency_minor bigint NOT NULL DEFAULT 0 CHECK (contingency_minor >= 0),
  parent_budget_id  text REFERENCES budgets(id),
  status            text NOT NULL DEFAULT 'approved'
                      CHECK (status IN ('draft', 'approved', 'superseded')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, code, version)
);

CREATE TABLE budget_versions (
  id                text PRIMARY KEY,
  organisation_id   text NOT NULL REFERENCES organisations(id),
  budget_id         text NOT NULL REFERENCES budgets(id),
  version           integer NOT NULL,
  baseline_minor    bigint NOT NULL CHECK (baseline_minor >= 0),
  approved_at       timestamptz,
  approved_by       text,
  reason            text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (budget_id, version),
  CHECK (organisation_id IS NOT NULL)
);

CREATE TABLE budget_lines (
  id                text PRIMARY KEY,
  organisation_id   text NOT NULL REFERENCES organisations(id),
  budget_id         text NOT NULL REFERENCES budgets(id),
  category          text NOT NULL,
  label             text NOT NULL,
  approved_minor    bigint NOT NULL CHECK (approved_minor >= 0),
  parent_line_id    text REFERENCES budget_lines(id),
  cost_centre_id    text REFERENCES cost_centres(id),
  sort_order        integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX budget_lines_org_budget_idx ON budget_lines (organisation_id, budget_id);

-- ---------------------------------------------------------------------------
-- Cost ledger
-- ---------------------------------------------------------------------------
CREATE TABLE cost_records (
  id                    text PRIMARY KEY,
  organisation_id       text NOT NULL REFERENCES organisations(id),
  version               integer NOT NULL DEFAULT 1,
  supplier_name         text NOT NULL,
  description           text NOT NULL,
  reference             text NOT NULL,
  transaction_date      date NOT NULL,
  accounting_period     text NOT NULL,
  net_minor             bigint NOT NULL,
  vat_minor             bigint NOT NULL,
  gross_minor           bigint NOT NULL,
  currency              char(3) NOT NULL DEFAULT 'GBP',
  status                text NOT NULL
                          CHECK (status IN ('actual', 'committed', 'forecast', 'estimated')),
  category              text NOT NULL,
  validation_state      text NOT NULL
                          CHECK (validation_state IN ('pending', 'validated', 'quarantined', 'reconciled')),
  review_state          text NOT NULL DEFAULT 'none'
                          CHECK (review_state IN ('none', 'open', 'approved', 'rejected', 'snoozed')),
  source_key            text NOT NULL,
  linked_commitment_id  text REFERENCES cost_records(id),
  correction_reason     text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, source_key)
);

CREATE INDEX cost_records_org_status_idx ON cost_records (organisation_id, status);
CREATE INDEX cost_records_org_category_idx ON cost_records (organisation_id, category);

CREATE TABLE cost_versions (
  id                text PRIMARY KEY,
  organisation_id   text NOT NULL REFERENCES organisations(id),
  cost_id           text NOT NULL REFERENCES cost_records(id),
  version           integer NOT NULL,
  payload           jsonb NOT NULL,
  actor_id          text,
  reason            text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cost_id, version)
);

CREATE TABLE cost_allocations (
  id                text PRIMARY KEY,
  organisation_id   text NOT NULL REFERENCES organisations(id),
  cost_id           text NOT NULL REFERENCES cost_records(id) ON DELETE CASCADE,
  budget_id         text NOT NULL REFERENCES budgets(id),
  category          text NOT NULL,
  cost_centre_id    text REFERENCES cost_centres(id),
  vehicle_id        text,
  supplier_id       text,
  amount_minor      bigint NOT NULL CHECK (amount_minor >= 0),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cost_allocations_org_cost_idx ON cost_allocations (organisation_id, cost_id);

CREATE TABLE cost_evidence (
  id                text PRIMARY KEY,
  organisation_id   text NOT NULL REFERENCES organisations(id),
  cost_id           text NOT NULL REFERENCES cost_records(id) ON DELETE CASCADE,
  label             text NOT NULL,
  source_type       text NOT NULL
                      CHECK (source_type IN ('csv', 'manual', 'xero', 'fuel_card', 'bank', 'payroll_summary')),
  checksum          text,
  storage_key       text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Imports / quarantine
-- ---------------------------------------------------------------------------
CREATE TABLE import_runs (
  id                text PRIMARY KEY,
  organisation_id   text NOT NULL REFERENCES organisations(id),
  file_name         text NOT NULL,
  started_at        timestamptz NOT NULL,
  finished_at       timestamptz NOT NULL,
  rows_read         integer NOT NULL DEFAULT 0,
  accepted          integer NOT NULL DEFAULT 0,
  quarantined       integer NOT NULL DEFAULT 0,
  duplicates_skipped integer NOT NULL DEFAULT 0
);

CREATE TABLE quarantine_items (
  id                text PRIMARY KEY,
  organisation_id   text NOT NULL REFERENCES organisations(id),
  source_key        text NOT NULL,
  reason            text NOT NULL,
  raw               jsonb NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Reviews / control
-- ---------------------------------------------------------------------------
CREATE TABLE review_items (
  id                text PRIMARY KEY,
  organisation_id   text NOT NULL REFERENCES organisations(id),
  cost_id           text NOT NULL REFERENCES cost_records(id),
  signal            text NOT NULL,
  title             text NOT NULL,
  detail            text NOT NULL,
  state             text NOT NULL
                      CHECK (state IN ('open', 'approved', 'rejected', 'snoozed')),
  resolution_note   text,
  version           integer NOT NULL DEFAULT 1,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX review_items_org_state_idx ON review_items (organisation_id, state);

-- ---------------------------------------------------------------------------
-- Snapshots / audit / outbox
-- ---------------------------------------------------------------------------
CREATE TABLE financial_snapshots (
  id                          text PRIMARY KEY,
  organisation_id             text NOT NULL REFERENCES organisations(id),
  calculation_id              text NOT NULL,
  formula_version             text NOT NULL,
  budget_id                   text NOT NULL REFERENCES budgets(id),
  budget_version              integer NOT NULL,
  approved_minor              bigint NOT NULL,
  actual_minor                bigint NOT NULL,
  committed_minor             bigint NOT NULL,
  forecast_minor              bigint NOT NULL,
  available_minor             bigint NOT NULL,
  projected_remaining_minor   bigint NOT NULL,
  projected_final_minor       bigint NOT NULL,
  variance_to_approved_minor  bigint NOT NULL,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_events (
  id                text PRIMARY KEY,
  organisation_id   text NOT NULL REFERENCES organisations(id),
  actor_id          text,
  action            text NOT NULL,
  entity_type       text NOT NULL,
  entity_id         text NOT NULL,
  reason            text,
  before_state      jsonb,
  after_state       jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_events_org_created_idx ON audit_events (organisation_id, created_at DESC);

CREATE TABLE outbox_events (
  id                text PRIMARY KEY,
  organisation_id   text NOT NULL REFERENCES organisations(id),
  event_type        text NOT NULL,
  payload           jsonb NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  published_at      timestamptz
);

-- ---------------------------------------------------------------------------
-- RLS skeleton (enable when auth roles exist)
-- ---------------------------------------------------------------------------
-- ALTER TABLE cost_records ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY cost_records_tenant ON cost_records
--   USING (organisation_id = current_setting('app.active_organisation_id', true));

COMMENT ON TABLE cost_records IS 'Canonical cost ledger — Blueprint §12.3. organisation_id required on every query.';
COMMENT ON COLUMN cost_records.source_key IS 'Idempotency key unique per organisation — Blueprint §13.';
