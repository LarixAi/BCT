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
      'finance_admin',
      'finance_manager',
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

