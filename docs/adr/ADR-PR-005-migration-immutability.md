# ADR-PR-005-migration-immutability: Migration immutability

## Status
Accepted — 21 August 2026

## Context
Recorded from Veyvio Production Readiness Blueprint §24 so production-stabilisation decisions do not drift.

## Decision
Released migrations are never edited; corrections are forward migrations.

## Evidence / lock
docs/deploy/command-rollback-continuity.md §B; hosted migrations under Veyvio admin /supabase/migrations/.

## Consequences
- Agents and PRs must not re-litigate this decision without a superseding ADR.
- Violations are stop-ship for the related Gate A / PROD track.
