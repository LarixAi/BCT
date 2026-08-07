# Veyvio Cost Control

Standalone **cost-only** application implementing [Veyvio Cost Control Master Blueprint v1.2](../docs/blueprint/Veyvio_Cost_Control_Master_Blueprint_v1.2.docx).

> Know exactly what has been spent, what is committed, what is expected and whether the CEC budget will hold.

This app is **not** Command, Yard, or Driver. Booking, dispatch, routes, income and payroll processing are out of scope (Blueprint §2).

## Phase shipped (MVP foundation)

| Capability | Status |
|------------|--------|
| Canonical cost model + minor-unit money | Done |
| Budget equations (§5) | Done + unit tests |
| Allocation balance rules | Done + unit tests |
| Cost lifecycle / commitment conversion | Done + unit tests |
| CSV import → validate → quarantine → ledger | Done + unit tests |
| Demo CEC seed + financial snapshot | Done |
| Spend flow chart (actual vs committed) | Done |
| **Payroll Cost Control Phase 1 scaffold** | Done — pay periods, employer-cost formula, overview hub (`/wages`) |
| Org structure + wage members + person finance profile | Done — `/wages/organisation`, `/wages/people/:id` |
| Payroll provider summary CSV reconcile | Done — match `EmployeeCostReference`, variance → Reviews |
| Cost review depth (approve / reallocate / evidence / audit) | Done — `/reviews` workbench |
| CEC budget hierarchy + line variance drill | Done — `/budgets`, `/budgets/lines/:lineId` |
| Vehicle ownership subtypes + cost profile | Done — insurance / lease / VED / fuel / maintenance on `/vehicles` |
| Business bank balance + feed (demo live) | Done — `/bank` reconciliation view; no payment initiation |
| Postgres foundation schema (`organisation_id` on every table) | Done — three migrations under `db/migrations/` (apply when DB provisioned) |
| Production integration schema + tenant policies | Done — memberships, Sage mappings/exports, bank persistence and reconciliation links |
| Integration lifecycle controls | Done + unit tests — idempotent exports, attributable attempts, retries and cross-tenant guards |
| Finance repository boundary | Done + unit tests — explicit demo/API selection and authenticated organisation context |
| Authenticated Finance API contract | Done + unit tests — bearer auth, membership, role permissions and transaction-local tenant context |
| Authentication pages + protected-route workflow | Done + unit/visual tests — sign-in, reset, invitation, company selection and sign-out |
| Sage server-proxy adapter contract | Done + unit tests — live connection remains gated by Sage product selection |
| CEC budget + quarterly review + board pack + management accounts + cash flow | Done — four ledger-derived views; income summary import only |
| Design tokens from §16 | Done |
| Live Postgres / auth / Xero / full PAYE engine | Deferred — schema ready; app still in-memory |

**Payroll boundary:** import/forecast/reconcile **employer** payroll cost only. Recognised payroll software remains responsible for PAYE, employee NI, payslips and HMRC RTI. See `docs/product-boundary.md`.

## Run

```bash
cd veyvio-cost-control
npm install
npm run dev      # http://localhost:5176
npm test
npm run build
```

## Architecture notes

- **Domain layer** under `src/domain` is the source of truth for money, equations, status transitions and import validation. UI only displays stored snapshot outputs.
- **In-memory store** (`src/data`) stands in for the modular-monolith API + Postgres until Phase 1 persistence is added.
- **Admission rule:** every screen maps to Blueprint §7; vehicle page is cost-profile only.

## Next engineering increments

1. Confirm the accountant-approved Sage and payroll products.
2. Provision Cost Control Postgres and apply all migrations under `db/migrations/`.
3. Implement the authenticated Finance API and set organisation context on every database transaction.
4. Wire the repository adapter to replace the in-memory `CostStore` (keep domain pure).
5. Implement the selected Sage server connector behind the existing proxy contract.
6. Complete Open Banking persistence and Sage-confirmed reconciliation ingestion.
7. Add an explanation layer that calls deterministic tools only (§14).

Implementation progress is tracked in `docs/production-integration-plan.md`.
