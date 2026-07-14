# Offline sync (Phase 1 Sprint 2)

## Local storage
- **IndexedDB** database `veyvio-yard`
- Stores: `bootstrap` (depot cache), `outbox` (pending mutations)

## Bootstrap sync
`runBootstrapSync(companyId, depotId)` loads mock depot data from fixtures into IndexedDB on initial sync.

## Outbox
Mutations are queued with:
- `localOperationId`, `deviceId`, `companyId`, `depotId`, `userId`
- Status: pending → syncing → synced | failed | conflict

`processOutbox()` stub marks pending items as synced when online.

## UI
`SyncStatusBadge` in AppShell reflects: Offline · Syncing · Synced · Sync failed
