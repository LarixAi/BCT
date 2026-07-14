# Veyvio Driver

Standalone mobile-first driver app for UK passenger transport. Built with the same stack and patterns as [Veyvio Yard](../frontend-first-view-main).

## Stack

- TanStack Start + React 19 + TypeScript
- Tailwind CSS v4 (Veyvio brand tokens)
- Zustand + IndexedDB offline outbox
- Capacitor 8 (Android/iOS)
- Mock API first — no backend required for local dev

## Architecture

```
src/
├── routes/       # TanStack file routes (_public auth, _app shell)
├── domain/       # Pure business rules (state machines, outcomes)
├── platform/     # Auth, sync, storage, API adapters
├── store/        # Zustand app state
├── components/   # UI + driver shells
├── copy/         # User-facing strings
└── data/mocks/   # Fixtures for offline dev
```

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:8080/splash](http://localhost:8080/splash) to start the auth flow.

Demo sign-in: any email with `@` and any password. MFA: any 6-digit code.

## Mobile build

```bash
npm run build:mobile
npm run cap:sync
npm run cap:open:android
```

## First vertical slice

Sign in → company → depot → sync → home → duty → acknowledge → verify vehicle → walkaround check → start → mark arrival → complete

All mutations go through the offline outbox and sync when online.
