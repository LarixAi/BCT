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
| Driver release AAB fail-closed | assert-release-config + AAB workflow |
| **One release SHA on `main`** | **`b71c9f6`** (merge of PR #2); includes Gate A tip `a755b5d` (PR #21) |

## Open (true non-code)

| Item | Owner | Notes |
|------|-------|-------|
| PITR dashboard confirmation | Ops | Screenshot residual — see `docs/deploy/command-rollback-continuity.md` |
| Physical handset (airplane / native push) | Mobile | No adb device; API path closed — `docs/plan/gate1-pilot-exit-test.md` |

**Verdict:** Gate A engineering + release SHA on `main` are closed. Remaining are owner dashboard + physical device only.
