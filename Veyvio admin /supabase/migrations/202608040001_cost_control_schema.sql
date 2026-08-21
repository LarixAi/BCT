-- Cost Control schema on shared Command Supabase (qeckgqjrfbdyxchuncdt).
-- Tables live in schema cost_control to avoid colliding with Command ops tables.

CREATE SCHEMA IF NOT EXISTS cost_control;
GRANT USAGE ON SCHEMA cost_control TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA cost_control
  GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA cost_control
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

SET search_path TO cost_control, public;

-- Veyvio Cost Control — Phase 1 foundation schema
-- Blueprint §12.2–12.4 / §13
-- Every tenant-owned row carries organisation_id. Monetary amounts use amount_minor (bigint).
-- Apply against a dedicated Cost Control Postgres database (not Command ops DB).

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

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
  original_approved_minor bigint NOT NULL DEFAULT 0 CHECK (original_approved_minor >= 0),
  owner_name        text NOT NULL DEFAULT '',
  owner_role        text NOT NULL DEFAULT '',
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


-- Veyvio Cost Control — production integration foundation
-- Product-neutral persistence for authZ, Sage, Open Banking and reconciliation.
-- This migration does not select a Sage product or store provider secrets.

-- ---------------------------------------------------------------------------
-- Membership and server-side authorisation
-- ---------------------------------------------------------------------------
CREATE TABLE organisation_memberships (
  id                text PRIMARY KEY,
  organisation_id   text NOT NULL REFERENCES organisations(id),
  user_subject      text NOT NULL,
  role              text NOT NULL CHECK (
    role IN (
      'finance_director',
      'finance_admin',
      'finance_manager',
      'finance_officer',
      'cost_approver',
      'payroll_cost_reviewer',
      'auditor',
      'board_reader'
    )
  ),
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, user_subject)
);

CREATE INDEX organisation_memberships_subject_idx
  ON organisation_memberships (user_subject, organisation_id);

-- ---------------------------------------------------------------------------
-- Sage connections and mappings
-- ---------------------------------------------------------------------------
CREATE TABLE sage_connections (
  id                        text PRIMARY KEY,
  organisation_id           text NOT NULL REFERENCES organisations(id),
  product_id                text NOT NULL DEFAULT 'undecided' CHECK (
    product_id IN (
      'undecided',
      'sage_accounting',
      'sage_50',
      'sage_payroll',
      'sage_50_payroll',
      'sage_intacct'
    )
  ),
  status                    text NOT NULL DEFAULT 'disconnected' CHECK (
    status IN ('disconnected', 'awaiting_consent', 'connected', 'error', 'revoked')
  ),
  sage_business_id          text,
  sage_organisation_name    text,
  secret_reference          text,
  granted_permissions       jsonb NOT NULL DEFAULT '{}'::jsonb,
  accounting_year_label     text,
  open_periods_label        text,
  connected_at              timestamptz,
  last_successful_sync_at   timestamptz,
  last_failed_sync_at       timestamptz,
  last_failure_reason       text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id)
);

COMMENT ON COLUMN sage_connections.secret_reference IS
  'Reference to a server-side encrypted secret; never an OAuth token or password.';

CREATE TABLE sage_code_mappings (
  id                text PRIMARY KEY,
  organisation_id   text NOT NULL REFERENCES organisations(id),
  connection_id     text NOT NULL REFERENCES sage_connections(id) ON DELETE CASCADE,
  mapping_kind      text NOT NULL CHECK (
    mapping_kind IN ('nominal', 'vat', 'cost_centre', 'department', 'supplier', 'payroll_journal')
  ),
  veyvio_key        text NOT NULL,
  sage_code         text NOT NULL,
  sage_label        text NOT NULL,
  mapped            boolean NOT NULL DEFAULT false,
  approved_by       text,
  approved_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, mapping_kind, veyvio_key)
);

-- ---------------------------------------------------------------------------
-- Durable integration export lifecycle
-- ---------------------------------------------------------------------------
CREATE TABLE integration_exports (
  id                        text PRIMARY KEY,
  organisation_id           text NOT NULL REFERENCES organisations(id),
  destination               text NOT NULL CHECK (destination IN ('sage', 'payroll_provider')),
  payload_kind              text NOT NULL CHECK (
    payload_kind IN ('supplier_cost', 'wage_journal', 'vehicle_purchase')
  ),
  entity_id                 text NOT NULL,
  idempotency_key           text NOT NULL,
  payload_version           text NOT NULL,
  payload                   jsonb NOT NULL,
  payload_checksum          text NOT NULL,
  status                    text NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'sending', 'accepted', 'failed', 'cancelled')
  ),
  retry_count               integer NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  last_failure_reason       text,
  external_transaction_id  text,
  created_by                text NOT NULL,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, destination, idempotency_key)
);

CREATE INDEX integration_exports_queue_idx
  ON integration_exports (organisation_id, destination, status, created_at);

CREATE TABLE integration_export_attempts (
  id                        text PRIMARY KEY,
  organisation_id           text NOT NULL REFERENCES organisations(id),
  export_id                 text NOT NULL REFERENCES integration_exports(id),
  attempt_number            integer NOT NULL CHECK (attempt_number > 0),
  provider_request_id       text,
  request_at                timestamptz NOT NULL,
  response_at               timestamptz,
  outcome                   text NOT NULL CHECK (outcome IN ('sending', 'accepted', 'failed')),
  response_status           integer,
  response_checksum         text,
  failure_reason            text,
  external_transaction_id  text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (export_id, attempt_number)
);

CREATE TABLE integration_exceptions (
  id                text PRIMARY KEY,
  organisation_id   text NOT NULL REFERENCES organisations(id),
  export_id         text REFERENCES integration_exports(id),
  entity_type       text NOT NULL,
  entity_id         text NOT NULL,
  exception_type    text NOT NULL CHECK (
    exception_type IN (
      'validation',
      'mapping',
      'provider_rejection',
      'transport',
      'permission',
      'closed_period',
      'reconciliation'
    )
  ),
  severity          text NOT NULL CHECK (severity IN ('warning', 'blocking')),
  state             text NOT NULL DEFAULT 'open' CHECK (
    state IN ('open', 'resolved', 'dismissed')
  ),
  reason            text NOT NULL,
  resolution_note   text,
  resolved_by       text,
  resolved_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX integration_exceptions_open_idx
  ON integration_exceptions (organisation_id, state, severity, created_at);

CREATE TABLE sage_posting_results (
  id                          text PRIMARY KEY,
  organisation_id             text NOT NULL REFERENCES organisations(id),
  export_id                   text NOT NULL REFERENCES integration_exports(id),
  veyvio_cost_id              text NOT NULL,
  sage_transaction_id         text NOT NULL,
  posting_date                date NOT NULL,
  accounting_period           text NOT NULL,
  nominal_code                text NOT NULL,
  tax_code                    text NOT NULL,
  posted_net_minor            bigint NOT NULL,
  posted_vat_minor            bigint NOT NULL,
  posted_gross_minor          bigint NOT NULL,
  posting_status              text NOT NULL CHECK (
    posting_status IN ('sent', 'accepted', 'rejected', 'posted', 'paid', 'bank_reconciled', 'reversed')
  ),
  payment_status              text NOT NULL CHECK (
    payment_status IN ('unpaid', 'part_paid', 'paid', 'unknown')
  ),
  credit_note_or_reversal_ref text,
  bank_reconciliation_status  text NOT NULL CHECK (
    bank_reconciliation_status IN ('unreconciled', 'proposed', 'sage_confirmed')
  ),
  sage_reconciliation_id      text,
  provider_updated_at         timestamptz NOT NULL,
  received_at                 timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, sage_transaction_id, provider_updated_at)
);

-- ---------------------------------------------------------------------------
-- Read-only Open Banking persistence and dual-reconciliation link
-- ---------------------------------------------------------------------------
CREATE TABLE bank_connections (
  id                      text PRIMARY KEY,
  organisation_id         text NOT NULL REFERENCES organisations(id),
  provider_id             text NOT NULL,
  status                  text NOT NULL CHECK (
    status IN ('disconnected', 'awaiting_consent', 'connected', 'error', 'revoked')
  ),
  external_connection_id  text,
  institution_name        text,
  scopes                  jsonb NOT NULL DEFAULT '[]'::jsonb,
  secret_reference        text,
  consent_expires_at      timestamptz,
  connected_at            timestamptz,
  last_synced_at          timestamptz,
  last_error              text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, provider_id, external_connection_id)
);

CREATE TABLE bank_accounts (
  id                    text PRIMARY KEY,
  organisation_id       text NOT NULL REFERENCES organisations(id),
  connection_id         text NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
  external_account_id   text NOT NULL,
  account_name          text NOT NULL,
  account_number_masked text NOT NULL,
  currency              char(3) NOT NULL DEFAULT 'GBP',
  ledger_balance_minor  bigint NOT NULL,
  available_balance_minor bigint NOT NULL,
  provider_updated_at   timestamptz NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, connection_id, external_account_id)
);

CREATE TABLE bank_transactions (
  id                            text PRIMARY KEY,
  organisation_id               text NOT NULL REFERENCES organisations(id),
  account_id                    text NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  open_banking_transaction_id   text NOT NULL,
  booked_at                     timestamptz NOT NULL,
  amount_minor                  bigint NOT NULL,
  currency                      char(3) NOT NULL DEFAULT 'GBP',
  direction                     text NOT NULL CHECK (direction IN ('credit', 'debit')),
  description                   text NOT NULL,
  counterparty_name             text,
  provider_payload_checksum     text NOT NULL,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, account_id, open_banking_transaction_id)
);

CREATE TABLE bank_cost_matches (
  id                            text PRIMARY KEY,
  organisation_id               text NOT NULL REFERENCES organisations(id),
  bank_transaction_id           text NOT NULL REFERENCES bank_transactions(id),
  veyvio_cost_id                text NOT NULL REFERENCES cost_records(id),
  match_state                   text NOT NULL DEFAULT 'proposed' CHECK (
    match_state IN ('proposed', 'rejected', 'sage_confirmed')
  ),
  confidence_basis              jsonb NOT NULL DEFAULT '{}'::jsonb,
  proposed_by                   text NOT NULL,
  proposed_at                   timestamptz NOT NULL DEFAULT now(),
  sage_transaction_id           text,
  sage_reconciliation_id        text,
  sage_confirmed_at             timestamptz,
  updated_at                    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, bank_transaction_id, veyvio_cost_id)
);

COMMENT ON TABLE bank_cost_matches IS
  'Veyvio matches are proposed until Sage supplies sage_reconciliation_id and confirmation.';

-- ---------------------------------------------------------------------------
-- Tenant isolation. The Finance API must set both values per transaction.
-- ---------------------------------------------------------------------------
ALTER TABLE organisation_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE sage_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE sage_code_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_export_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sage_posting_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_cost_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY organisation_memberships_tenant ON organisation_memberships
  USING (
    organisation_id = current_setting('app.active_organisation_id', true)
    AND user_subject = current_setting('app.user_subject', true)
  );
CREATE POLICY sage_connections_tenant ON sage_connections
  USING (organisation_id = current_setting('app.active_organisation_id', true));
CREATE POLICY sage_code_mappings_tenant ON sage_code_mappings
  USING (organisation_id = current_setting('app.active_organisation_id', true));
CREATE POLICY integration_exports_tenant ON integration_exports
  USING (organisation_id = current_setting('app.active_organisation_id', true));
CREATE POLICY integration_export_attempts_tenant ON integration_export_attempts
  USING (organisation_id = current_setting('app.active_organisation_id', true));
CREATE POLICY integration_exceptions_tenant ON integration_exceptions
  USING (organisation_id = current_setting('app.active_organisation_id', true));
CREATE POLICY sage_posting_results_tenant ON sage_posting_results
  USING (organisation_id = current_setting('app.active_organisation_id', true));
CREATE POLICY bank_connections_tenant ON bank_connections
  USING (organisation_id = current_setting('app.active_organisation_id', true));
CREATE POLICY bank_accounts_tenant ON bank_accounts
  USING (organisation_id = current_setting('app.active_organisation_id', true));
CREATE POLICY bank_transactions_tenant ON bank_transactions
  USING (organisation_id = current_setting('app.active_organisation_id', true));
CREATE POLICY bank_cost_matches_tenant ON bank_cost_matches
  USING (organisation_id = current_setting('app.active_organisation_id', true));


-- Veyvio Cost Control — enforce tenant isolation on the original foundation tables.
-- The Finance API must set these transaction-local values after privileged membership validation:
--   SET LOCAL app.active_organisation_id = '<organisation id>';
--   SET LOCAL app.user_subject = '<authenticated subject>';

ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centres ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles_ref ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarantine_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY organisations_tenant ON organisations
  USING (id = current_setting('app.active_organisation_id', true))
  WITH CHECK (id = current_setting('app.active_organisation_id', true));

CREATE POLICY cost_centres_tenant ON cost_centres
  USING (organisation_id = current_setting('app.active_organisation_id', true))
  WITH CHECK (organisation_id = current_setting('app.active_organisation_id', true));
CREATE POLICY suppliers_tenant ON suppliers
  USING (organisation_id = current_setting('app.active_organisation_id', true))
  WITH CHECK (organisation_id = current_setting('app.active_organisation_id', true));
CREATE POLICY vehicles_ref_tenant ON vehicles_ref
  USING (organisation_id = current_setting('app.active_organisation_id', true))
  WITH CHECK (organisation_id = current_setting('app.active_organisation_id', true));
CREATE POLICY budgets_tenant ON budgets
  USING (organisation_id = current_setting('app.active_organisation_id', true))
  WITH CHECK (organisation_id = current_setting('app.active_organisation_id', true));
CREATE POLICY budget_versions_tenant ON budget_versions
  USING (organisation_id = current_setting('app.active_organisation_id', true))
  WITH CHECK (organisation_id = current_setting('app.active_organisation_id', true));
CREATE POLICY budget_lines_tenant ON budget_lines
  USING (organisation_id = current_setting('app.active_organisation_id', true))
  WITH CHECK (organisation_id = current_setting('app.active_organisation_id', true));
CREATE POLICY cost_records_tenant ON cost_records
  USING (organisation_id = current_setting('app.active_organisation_id', true))
  WITH CHECK (organisation_id = current_setting('app.active_organisation_id', true));
CREATE POLICY cost_versions_tenant ON cost_versions
  USING (organisation_id = current_setting('app.active_organisation_id', true))
  WITH CHECK (organisation_id = current_setting('app.active_organisation_id', true));
CREATE POLICY cost_allocations_tenant ON cost_allocations
  USING (organisation_id = current_setting('app.active_organisation_id', true))
  WITH CHECK (organisation_id = current_setting('app.active_organisation_id', true));
CREATE POLICY cost_evidence_tenant ON cost_evidence
  USING (organisation_id = current_setting('app.active_organisation_id', true))
  WITH CHECK (organisation_id = current_setting('app.active_organisation_id', true));
CREATE POLICY import_runs_tenant ON import_runs
  USING (organisation_id = current_setting('app.active_organisation_id', true))
  WITH CHECK (organisation_id = current_setting('app.active_organisation_id', true));
CREATE POLICY quarantine_items_tenant ON quarantine_items
  USING (organisation_id = current_setting('app.active_organisation_id', true))
  WITH CHECK (organisation_id = current_setting('app.active_organisation_id', true));
CREATE POLICY review_items_tenant ON review_items
  USING (organisation_id = current_setting('app.active_organisation_id', true))
  WITH CHECK (organisation_id = current_setting('app.active_organisation_id', true));
CREATE POLICY financial_snapshots_tenant ON financial_snapshots
  USING (organisation_id = current_setting('app.active_organisation_id', true))
  WITH CHECK (organisation_id = current_setting('app.active_organisation_id', true));
CREATE POLICY audit_events_tenant ON audit_events
  USING (organisation_id = current_setting('app.active_organisation_id', true))
  WITH CHECK (organisation_id = current_setting('app.active_organisation_id', true));
CREATE POLICY outbox_events_tenant ON outbox_events
  USING (organisation_id = current_setting('app.active_organisation_id', true))
  WITH CHECK (organisation_id = current_setting('app.active_organisation_id', true));



-- Service role bypasses RLS; grant table privileges for PostgREST schema access.
GRANT ALL ON ALL TABLES IN SCHEMA cost_control TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA cost_control TO authenticated;

RESET search_path;
