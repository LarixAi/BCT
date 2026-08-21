# Gate A residual register (21 Aug 2026)

## Closed with evidence (this programme)

| Item | Evidence |
|------|----------|
| Wave 3F UserScopedDb / RLS | Classification LOCKED; hosted TI ok (`command-api` redeployed after BCT seed fix) |
| PR-03 P0 same-company | Migration `202608210001` hosted; forge **23/23** |
| F-03 production mock leakage | `production-fallback-inventory.mjs` PASS; Jobs/Schedule demo banners removed |
| Fresh DB | `test:fresh-db-gate` PASS; JWT **286/286** |
| Storage isolation | **66/66** |
| Hosted tenant isolation | `test:tenant-isolation` ok |
| Command continuity drill | `test:command-continuity-drill` PASS — `evidence/gate-a-command-continuity-drill.json` |
| Command rollback procedure | `docs/deploy/command-rollback-continuity.md` |
| Production Command E2E | `e2e-command-smoke.mjs` **PASS** (core path + signup isolation) |
| Yard live smoke | `test:yard-live` **PASS** |
| Driver production build guard | `verify:production-build` **PASS** |
| Driver Gate 1 pilot live smoke | `gate1:pilot-smoke` **PASS** (13/13) after BCT tenant reactivation + auth-id seed fix |

## Still Gate A (human / release authority)

| Item | Owner | Notes |
|------|-------|-------|
| One release SHA on `main` | Release owner | Engineering ready on branch; needs merge to `main` + pin |
| Supabase PITR dashboard confirmation | Ops | Procedure documented; screenshot residual |
| Physical device Driver walkthrough | Mobile + ops | API smoke green; handset steps in `docs/plan/gate1-pilot-exit-test.md` |

Code-completable Gate A engineering is closed. Remaining items are merge authority + owner dashboard + physical device.
