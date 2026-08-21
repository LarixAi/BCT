# Veyvio accounting independence — implementation checklist

This is the source-of-truth checklist for making Sage optional while preserving reliable,
accountant-ready cost records. Items are checked only after implementation and verification.

## Phase 1 — remove the Sage dependency

- [x] Rename the primary product concept from Sage integration to accounting integration.
- [x] Add accounting modes: accountant export, Sage, other software and future Veyvio Ledger.
- [x] Make Sage optional in workspace readiness.
- [x] Create provider-neutral accounting adapter and export contracts.
- [x] Keep current Sage support as an optional adapter boundary.
- [x] Add accounting-provider selection to Settings.
- [ ] Persist provider selection through the production Finance API.
- [ ] Add an authenticated administrator approval event when provider selection changes.

## Accountant Export Centre

- [x] Create `/accounting-exports`.
- [x] Export approved actual supplier costs.
- [x] Include organisation ID, stable cost ID and integer minor-unit amounts.
- [x] Include evidence labels and source keys.
- [x] Include export schema version and deterministic batch checksum.
- [x] Record the export batch creation time in the generated manifest.
- [ ] Persist and lock completed export batches in the production repository.
- [ ] Record the authenticated creator and every download.
- [ ] Add payroll-journal export.
- [ ] Add VAT-analysis export.
- [ ] Add bank-match export.
- [ ] Add accountant adjustment-journal import.
- [ ] Prevent silent replacement of previously persisted export batches.

## Accounting mappings

- [ ] Create provider-neutral nominal-account mappings.
- [ ] Create VAT-code mappings.
- [ ] Create supplier mappings.
- [ ] Create cost-centre and department mappings.
- [ ] Create vehicle/programme mappings.
- [ ] Create payroll-journal mappings.
- [ ] Block production exports when mandatory mappings are missing.
- [ ] Show mapping exceptions in Reviews.

## Veyvio double-entry ledger

- [ ] Create chart of accounts and account types.
- [ ] Create accounting periods.
- [ ] Create journal headers and journal lines.
- [ ] Require total debits to equal total credits.
- [ ] Reject unbalanced journals.
- [ ] Add posting rules and idempotency.
- [ ] Make posted journals immutable.
- [ ] Add reversal and correction workflows.
- [ ] Add opening balances and period locks.
- [ ] Add general ledger and trial balance.

## Bank reconciliation

- [x] Import bank transactions through a read-only adapter.
- [x] Distinguish proposed bank matches from accounting-confirmed reconciliation.
- [ ] Support partial and one-to-many matches.
- [ ] Show statement balance, ledger balance and difference.
- [ ] Require zero difference before final reconciliation.
- [ ] Persist and lock completed reconciliations.

## Payroll boundary

- [x] Keep PAYE calculations and FPS/EPS submissions outside Veyvio.
- [x] Import employer payroll-cost summaries.
- [ ] Select an HMRC-recognised payroll product or bureau.
- [ ] Export provider-neutral payroll journals.
- [ ] Reconcile payroll summary, journal and bank payment.

## Compliance and release

- [ ] Accountant approves chart of accounts, mappings and posting rules.
- [ ] Complete database tenant-isolation and permission tests.
- [ ] Complete security and penetration testing.
- [ ] Test backup restoration and document retention rules.
- [ ] Run a closed-period parallel test with the accountant.
- [ ] Assess VAT MTD, CT600, iXBRL and Companies House filing separately.

## Definition of done

- [ ] Every posted journal balances.
- [x] Authoritative amounts use integer minor units.
- [ ] Posted records cannot be silently edited.
- [ ] Corrections use reversals.
- [ ] Closed periods reject postings.
- [ ] Every change records actor, reason and timestamp.
- [x] Generated accountant exports are versioned and reproducible.
- [ ] Cost, payroll and bank control totals reconcile.
- [ ] Trial-balance debits equal credits.
- [ ] Accountant approves the production accounting design.
- [ ] Backup restoration succeeds.
