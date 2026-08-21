# ADR-PR-006-entitlement-authority: Entitlement authority

## Status
Accepted — 21 August 2026

## Context
Recorded from Veyvio Production Readiness Blueprint §24 so production-stabilisation decisions do not drift.

## Decision
Commercial capabilities are enforced server-side.

## Evidence / lock
command-api entitlements + packages/entitlements; clients are untrusted (F-32).

## Consequences
- Agents and PRs must not re-litigate this decision without a superseding ADR.
- Violations are stop-ship for the related Gate A / PROD track.
