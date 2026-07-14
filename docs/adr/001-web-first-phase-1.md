# ADR 001: Web-first for Phase 1

## Status
Accepted

## Context
Veyvio Yard needs standalone mobile identity long-term, but the current codebase is TanStack Start (React web).

## Decision
Phase 1 remains **web-first**. Capacitor native shell deferred to Phase 4.

## Consequences
- Faster iteration on auth shell and yard workflows
- Biometrics are stubbed (UI only) until Capacitor
- Local storage uses localStorage/IndexedDB patterns compatible with later SQLite migration
