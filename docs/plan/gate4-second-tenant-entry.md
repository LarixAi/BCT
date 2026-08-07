# Gate 4 — Second tenant / SaaS entry criteria

**Status:** Parked — no second-operator product work until BCT pilot acceptance.  
**Authority:** [veyvio-production-gates.md](./veyvio-production-gates.md) §6 · Combined Blueprint §19 Gates 4–6  

Self-serve SaaS and a second live operator are **out of scope** for the current Android-first BCT pilot.

---

## Prerequisites before opening a second company

| # | Criterion | Evidence |
|---|-----------|----------|
| 1 | BCT live shift accepted | Ops lead **PASS** on [`.gate1-handset-android.local.md`](./.gate1-handset-android.local.md) after [bct-pilot-live-shift-runbook.md](./bct-pilot-live-shift-runbook.md) |
| 2 | Tenant isolation green | `cd "Veyvio admin " && npm run test:tenant-isolation` PASS on production API |
| 3 | No production mock hubs | Attendance / body-condition remain fail-closed empty hubs — no fake data ([gate2-wip-triage.md](./gate2-wip-triage.md)) |
| 4 | Gate 2 fleet minimum for pilot | `npm run test:gate2-live` PASS |
| 5 | Support path | Named on-call for Command + Yard + Driver during second-tenant trials |

**Do not** seed a second commercial company or enable self-serve signup until the table above is closed and Gate 4 explicitly opens.

---

## Explicitly out of scope until Gate 4+

- Multi-operator self-serve onboarding  
- Commercial entitlements / billing (Gate 6)  
- Intelligence / digital twin (Blueprint Phase 8 — after Gate 2 data quality)  
- Public store as the primary distribution for a second tenant (use MDM / internal tracks first)

---

## When Gate 4 opens

1. Document the second operator (legal entity, depot, pilot drivers).  
2. Seed via Command platform routes only (never shared BCT fixtures).  
3. Re-run tenant-isolation with both companies.  
4. Run a supervised shift on the second tenant with the same stop-ship list as BCT.
