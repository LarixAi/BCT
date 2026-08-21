# Veyvio Cost Control — production integration plan

This checklist tracks the implementation of the approved cost-only boundary:

- **Veyvio owns:** cost purpose, budget, forecast, commitment, evidence and approval.
- **The selected accounting system/accountant owns:** accounting treatment, general ledger, VAT,
  accounts payable, statutory reporting and final accounting reconciliation.
- **Sage is optional:** it remains one supported adapter, not a workspace requirement.
- **A payroll provider owns:** PAYE, RTI, deductions and payslips.
- **Open Banking is read-only:** Veyvio may propose matches but never initiates payments or claims
  final accounting reconciliation.

## Decision gates

- [x] Cost-only product boundary documented and reflected in the current UI/domain types.
- [ ] Accountant confirms the primary Sage product (Accounting, 50 or Intacct).
- [ ] Accountant confirms the payroll product/provider.
- [ ] Accountant approves nominal, VAT, cost-centre, department and supplier mappings.
- [ ] Sandbox or trial credentials are available for the selected Sage product.

Live Sage connector work must not pass the first decision gate until the product is confirmed.

## Foundation

- [x] Minor-unit money and deterministic budget equations.
- [x] Product-neutral Sage outbound and inbound contracts.
- [x] Demonstration Sage Settings view and mapping/exception states.
- [x] Product-neutral integration export lifecycle with idempotent retry rules.
- [x] Database migration for memberships, permissions, Sage mappings, exports, attempts,
  exceptions, bank records and reconciliation links.
- [x] Row-level tenant policies for the new integration tables.
- [x] Product-neutral repository boundary with explicit demo/API selection.
- [x] Finance API workspace adapter sends authentication and organisation context and rejects
  cross-tenant responses.
- [x] Framework-neutral Finance API handler verifies bearer authentication and active membership.
- [x] Finance API contract requires transaction-local organisation and user context.
- [x] Row-level tenant policies cover both the original finance tables and integration tables.
- [x] Server-side role matrix covers cost, payroll-cost, integration, quarter-lock and audit actions.
- [x] Apply migrations to a dedicated Cost Control Postgres environment.
- [x] Supply the deployment-specific JWT verifier and Postgres adapter.
- [ ] Confirm deployment target: recommended dedicated Cost Control Supabase project, or another
  managed Postgres/JWT/worker stack.
- [x] Replace the in-memory store with repository/API adapters.
- [ ] Store evidence documents in private object storage with checksums.

## Authentication workflow

- [x] Provider-neutral authentication adapter boundary.
- [x] Sign-in page with safe credential errors.
- [x] Password-reset request and new-password pages.
- [x] Invitation acceptance page.
- [x] Active-company selection before finance records load.
- [x] Protected finance routes and fail-closed unconfigured production mode.
- [x] In-app sign-out action.
- [x] Demonstration credentials and tokens remain in memory only.
- [x] Page-access matrix for every finance role.
- [x] Direct-route guards and role-filtered navigation.
- [x] Access-denied page for manually entered restricted URLs.
- [ ] Connect the approved identity provider and validate signed JWTs.
- [ ] Add MFA / step-up authentication policy for finance administrators.
- [ ] Add invitation issuing, expiry, revocation and membership administration API.
- [ ] Return role-scoped workspace projections from the Finance API so restricted data is never
  downloaded to an unauthorised browser.

## Accounting integration

- [x] Provider-neutral accounting modes and adapter contract.
- [x] Accountant-export mode with deterministic cost batch and manifest.
- [x] Sage retained as an optional adapter.
- [ ] Persist provider choice and export batches through the Finance API.

### Optional Sage adapter

- [x] Browser-side Sage adapter requires a selected product and server token proxy.
- [x] Browser-side Sage adapter sends bearer, organisation, product and idempotency controls.
- [ ] Implement server-side OAuth/token vault for the selected Sage product.
- [ ] Read Sage organisation, permissions and accounting periods.
- [ ] Maintain nominal, VAT, supplier, department and cost-centre mappings.
- [ ] Export approved supplier costs through the durable outbox.
- [ ] Export locked, summarised wage journals.
- [ ] Ingest posting, payment, reversal and reconciliation confirmations.
- [ ] Operate visible retry and exception workflows without silent correction.

## Bank and reconciliation

- [x] Read-only Open Banking adapter boundary.
- [x] Proposed-match versus Sage-confirmed reconciliation rule.
- [x] Duplicate provider-transaction and cross-tenant matching guards.
- [x] Full-reconciliation state requires Veyvio approval, a posted Sage entry and a Sage
  reconciliation identifier.
- [x] Persist bank consents, accounts and transactions through the Finance API.
- [ ] Persist proposed matches independently from accounting confirmation.
- [ ] Ingest Sage reconciliation identifiers and confirmation state.
- [ ] Prevent duplicate costs when both Sage and Open Banking see one movement.

## User experience

- [x] Add one-click Settings navigation and connection/exception status summary.
- [ ] Split detailed mapping, sync history and exception editing into authenticated API-backed views.
- [x] Add Sage and bank lifecycle to cost detail.
- [x] Add integration exceptions to the Reviews workbench.
- [x] Block quarterly readiness on unresolved Sage integration exceptions.
- [x] Add accounting and bank traceability position to Audit & evidence.

## Verification and rollout

- [x] Pure lifecycle tests cover idempotency, illegal transitions and cross-tenant access.
- [ ] Database tenant-isolation tests.
- [ ] API permission and role tests.
- [ ] Connector contract and sandbox tests.
- [ ] Duplicate bank-import and reconciliation tests.
- [ ] Accountant mapping review.
- [ ] Closed-period parallel run.
- [ ] Restricted-user pilot and quarter-end rehearsal.
- [ ] Production security, recovery and audit readiness sign-off.
