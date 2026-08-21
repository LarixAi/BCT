# ADR-PR-008-wave-3g-sequencing: Wave 3G sequencing

## Status
Accepted — 21 August 2026

## Context
Recorded from Veyvio Production Readiness Blueprint §24 so production-stabilisation decisions do not drift.

## Decision
organisation_id migration cannot be mixed into Wave 3F closure.

## Evidence / lock
Wave 3F LOCKED first; Wave 3G deferred per production-readiness blueprint §17 until after controlled pilot sequence.

## Consequences
- Agents and PRs must not re-litigate this decision without a superseding ADR.
- Violations are stop-ship for the related Gate A / PROD track.
