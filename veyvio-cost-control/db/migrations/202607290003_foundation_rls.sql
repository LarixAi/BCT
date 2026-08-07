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

