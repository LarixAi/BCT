# API layer (mock-first)

The yard app talks to data through `src/platform/api/` — not directly to fetch or fixtures from UI code.

## Default: mock mode (no backend)

Unless you explicitly opt in to a live API, **everything uses mocks**:

- Bootstrap → `buildBootstrapPayload()` + simulated latency
- Outbox upload → local ack with fake `serverId`
- IndexedDB cache + Zustand store unchanged

No `VITE_API_BASE_URL` required. This is the intended mode for frontend-only development.

## Live API (later)

When a backend exists — or the **dev stub** routes in `src/routes/api/v1/yard/`:

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_USE_MOCK_API=false
```

Endpoints:

- `GET /api/v1/yard/health`
- `GET /api/v1/yard/bootstrap?companyId=&depotId=&role=`
- `POST /api/v1/yard/mutations`

The dev stub serves fixture bootstrap data and acks mutations — useful for testing the live client path without an external backend.

## Bootstrap cache migration

Older IndexedDB bootstrap payloads may lack newer fields (e.g. `tasks`). `normalizeBootstrapPayload()` back-fills defaults on hydrate so screens do not crash after schema changes.
