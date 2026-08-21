# ADR-PR-003-production-truth: Production truth

## Status
Accepted — 21 August 2026

## Context
Recorded from Veyvio Production Readiness Blueprint §24 so production-stabilisation decisions do not drift.

## Decision
Production runtime may never substitute believable mock operational information.

## Evidence / lock
F-03 scanners, verify-production-build, assert-release-config on Admin/Yard/Driver release paths.

## Consequences
- Agents and PRs must not re-litigate this decision without a superseding ADR.
- Violations are stop-ship for the related Gate A / PROD track.
