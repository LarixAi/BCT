# Gate A residual register (21 Aug 2026)

## Closed with evidence

| Item | Evidence |
|------|----------|
| Wave 3F UserScopedDb / RLS | LOCKED; TI hosted ok |
| PR-03 P0 same-company | `202608210001` hosted; forge 23/23 |
| F-03 fail-closed | inventory PASS |
| Fresh DB / storage | fresh-DB PASS; storage 66/66 |
| Command e2e + Yard live | both PASS |
| Continuity + rollback docs | drill PASS; `docs/deploy/command-rollback-continuity.md` |
| Driver production build | verify:production-build PASS |
| Driver pilot API smoke | gate1:pilot-smoke 13/13 |
| Driver device-exit API | gate1-device-exit-api **10/10** |
| Driver device-exit mobile web | Playwright Pixel 7 + iPhone 14 **2/2** (`gate1:device-exit --ui`) |
| iOS Simulator tooling | `gate1:ios-simulator-probe` PASS — physical still required |
| Hosted re-verify 21 Aug | TI PASS (retry after TI-401); continuity 4/4; device-exit API 10/10 |
| Driver release AAB fail-closed | assert-release-config + AAB workflow |
| Admin + Yard release artifact guards | `assert-release-config.mjs` (Admin + Yard) |
| Backup/PITR **status probe** | `npm run test:backup-pitr-status` → evidence JSON |
| **One release SHA on `main`** | **`b71c9f6`** (merge of PR #2); Gate A tip `a755b5d` (PR #21); docs tip `9bab71b` |

## Open (true non-code / billing)

| Item | Owner | Status |
|------|-------|--------|
| Supabase **Pro + PITR** | Ops / billing | **API-proven OFF** — org plan=`free`, `pitr_enabled=false`, scheduled backups `[]`. See `docs/plan/evidence/gate-a-backup-pitr-status.json`. Cannot enable without paid plan (~Pro + PITR 7d ~$100/mo + Small compute). |
| Physical Android handset | Mobile | No `adb` device; handset script exits cleanly. API + mobile-web closed. |
| Physical iOS handset | Mobile | Simulators present; airplane / native push / Cap install still need a phone. |

**Verdict:** Gate A **engineering** remains closed. Gate A **backup/restore** acceptance is **blocked on billing upgrade + PITR enablement** (not a missing screenshot — PITR is objectively off on Free). Device physical rows remain owner walkthrough.
