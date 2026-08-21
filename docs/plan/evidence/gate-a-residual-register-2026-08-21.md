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
| Driver device-exit mobile web | Playwright Pixel 7 + iPhone 14 **2/2** |
| iOS Simulator tooling | `gate1:ios-simulator-probe` PASS |
| Hosted re-verify | TI PASS; continuity 4/4 |
| Driver release AAB fail-closed | assert-release-config + AAB workflow + provenance artifact |
| Admin + Yard release guards | deploy wiring + units (PR #24) |
| PR-06 / PROD-5 supply-chain | PR #24 — Action pins, Dependabot, audits |
| Basic observability | health + `VEYVIO_DEPLOYMENT_SHA` + platform probe + `docs/deploy/platform-observability.md` |
| Platform incident response | `docs/plan/veyvio-platform-incident-response.md` |
| ADR-PR-001…008 | `docs/adr/ADR-PR-*.md` Accepted |
| iOS release scaffolding | `assert-ios-release-ready` + `ExportOptions.plist` + fail-closed IPA workflow |
| Backup/PITR **status probe** | `test:backup-pitr-status` |
| **One release SHA on `main`** | **`b71c9f6`** (PR #2); tip includes PR #23–#24 |

## Open (true non-code / secrets)

| Item | Owner | Status |
|------|-------|--------|
| Supabase **Pro + PITR** | Ops / billing | API-proven OFF — Free plan |
| Physical Android / iOS handset | Mobile | No adb; API + mobile-web closed |
| Apple signing secrets + first TestFlight upload | Mobile | IPA workflow fail-closed until `VEYVIO_APPLE_*` secrets + xcodebuild keychain wire |
| Play upload API | Mobile | AAB artifact only |

**Verdict:** Gate A **engineering** closed. Gate A **GO** blocked on billing (backups/PITR) + physical device. PROD-6/8 scaffolding advanced; store upload remains operator secrets.
