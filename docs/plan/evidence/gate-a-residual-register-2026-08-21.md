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
| Driver release AAB fail-closed | assert-release-config + AAB workflow production env |

## Open (true non-code)

| Item | Owner | Notes |
|------|-------|-------|
| Release SHA on production authority branch | Release | PR from `prod1/gate-a-engineering-close` → `phase0/reproducibility` then promote to `main` |
| PITR dashboard confirmation | Ops | Screenshot residual |
| Physical handset (airplane / native push) | Mobile | No adb device in this environment; API path closed |

