# ADR-PR-002-privileged-capabilities: Privileged capabilities

## Status
Accepted — 21 August 2026

## Context
Recorded from Veyvio Production Readiness Blueprint §24 so production-stabilisation decisions do not drift.

## Decision
Generic privileged DB access is forbidden outside explicitly approved capability boundaries.

## Evidence / lock
Named capabilities in Veyvio admin /supabase/functions/_shared/db-authority.ts; ordinary paths must not import bare admin. Evidence: service-role-allowlist.unit.mjs.

## Consequences
- Agents and PRs must not re-litigate this decision without a superseding ADR.
- Violations are stop-ship for the related Gate A / PROD track.
