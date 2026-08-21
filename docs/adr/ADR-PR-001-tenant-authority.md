# ADR-PR-001-tenant-authority: Tenant authority

## Status
Accepted — 21 August 2026

## Context
Recorded from Veyvio Production Readiness Blueprint §24 so production-stabilisation decisions do not drift.

## Decision
Postgres RLS is authoritative for ordinary tenant data access.

## Evidence / lock
Wave 3F LOCKED: authenticated Command/Driver CRUD uses UserScopedDb / resolveTenantDb + RLS. Evidence: docs/plan/prod-1-service-role-classification.md, tenant-isolation smoke.

## Consequences
- Agents and PRs must not re-litigate this decision without a superseding ADR.
- Violations are stop-ship for the related Gate A / PROD track.
