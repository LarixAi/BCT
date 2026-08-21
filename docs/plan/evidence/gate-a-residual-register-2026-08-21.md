# Gate A residual register (21 Aug 2026)

## Closed with evidence

| Item | Evidence |
|------|----------|
| Wave 3F UserScopedDb / RLS | LOCKED; TI hosted ok |
| PR-03 P0 same-company | `202608210001` hosted; forge 23/23 |
| F-03 fail-closed | inventory PASS |
| Fresh DB / storage | fresh-DB PASS; storage 66/66 |
| Command e2e + Yard live | both PASS |
| Continuity + rollback docs | drill PASS; CI job `platform-health` |
| Driver production build | verify:production-build PASS |
| Driver pilot API / device-exit | API 10/10; Playwright 2/2; iOS sim probe |
| Hosted re-verify | TI PASS; continuity 4/4 |
| Driver AAB fail-closed + provenance | workflow + `record-release-provenance` |
| Admin + Yard release guards | deploy wiring + units (PR #24) |
| PR-06 / PROD-5 supply-chain | PR #24 |
| Basic observability + IR | health, platform probe, IR docs |
| ADR-PR-001…008 | Accepted |
| iOS release chain scaffolding | keychain import + xcodebuild archive path in IPA workflow |
| Platform health CI | `Platform health + continuity (PROD-8)` job |
| Backup/PITR **status probe** | `test:backup-pitr-status` |
| F-03 Yard mock graph quarantine | dynamic `mock-yard-api` + bootstrap stub; f03-gate0 + eslint |
| Admin CI release assert | `--forbid-only` on CI build artifact |
| CI-CANCEL-001 mitigation | TI skipped on non-main branch push (PR covers it) |
| **One release SHA on `main`** | **`b71c9f6`** (PR #2); tip includes PR #23–#58 |

## Open (true non-code / secrets)

| Item | Owner | Status |
|------|-------|--------|
| Supabase **Pro + PITR** | Ops / billing | API-proven OFF — Free plan |
| Physical Android / iOS handset | Mobile | No adb; API + mobile-web closed |
| Apple signing secrets in GitHub `production` | Mobile | IPA workflow ready; needs `VEYVIO_APPLE_*` |
| Play upload API | Mobile | AAB artifact only |
| TI-401 root cause | Platform | Monitored; do not loosen assertions |

**Verdict:** Gate A **engineering** closed. Gate A **GO** blocked on billing (backups/PITR) + physical device + store secrets. No further wrap batches required for pilot engineering.
