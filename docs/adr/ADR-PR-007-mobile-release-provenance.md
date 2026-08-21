# ADR-PR-007-mobile-release-provenance: Mobile release provenance

## Status
Accepted — 21 August 2026

## Context
Recorded from Veyvio Production Readiness Blueprint §24 so production-stabilisation decisions do not drift.

## Decision
Every production mobile binary maps back to an immutable repository SHA.

## Evidence / lock
Driver Android AAB workflow records commit_sha + aab_sha256; iOS IPA workflow fail-closed until signing secrets exist. Provenance JSON artifact via record-release-provenance.mjs.

## Consequences
- Agents and PRs must not re-litigate this decision without a superseding ADR.
- Violations are stop-ship for the related Gate A / PROD track.
