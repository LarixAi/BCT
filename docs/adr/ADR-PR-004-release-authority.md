# ADR-PR-004-release-authority: Release authority

## Status
Accepted — 21 August 2026

## Context
Recorded from Veyvio Production Readiness Blueprint §24 so production-stabilisation decisions do not drift.

## Decision
main + immutable release SHA define production.

## Evidence / lock
Gate A release SHA b71c9f6 on main (PR #2). Edge secret VEYVIO_DEPLOYMENT_SHA set on backend:deploy; /health reports deploymentSha.

## Consequences
- Agents and PRs must not re-litigate this decision without a superseding ADR.
- Violations are stop-ship for the related Gate A / PROD track.
