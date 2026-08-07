# Gate 1 pilot exit test (BCT)

**Purpose:** Prove a pilot operator can run a full driver shift on patchy 4G without touching another system.  
**Pilot company:** BCT (or chosen operator)  
**Apps:** Driver (Android + iOS physical devices), Yard, Command Admin  

**Operator walkthrough (phones):** [gate1-operator-physical-runbook.md](./gate1-operator-physical-runbook.md)  
**After both platforms pass:** [gate3-store-readiness.md](./gate3-store-readiness.md)

---

## Automated pre-flight (CI / local)

Run before the physical pilot:

```bash
# Rotate isolation + pilot passwords first (writes .gate1-secrets.local.env)
cd "Veyvio admin "
npm run gate1:rotate-credentials

# Repo root — static guards (fast)
npm run gate1:preflight -- --skip-build

# Full preflight with hosted Command API (loads Admin .env + .gate1-secrets.local.env)
npm run gate1:preflight -- --live --skip-build

# Android + iOS shared backend device exit (API path)
npm run gate1:device-exit -- --skip-build
```

Or seed + smoke in one step:

```bash
cd "Veyvio admin "
export VEYVIO_ANON_KEY="<anon-key>"
npm run gate1:bct-pilot-setup
```

Per-app checks (optional):

```bash
cd veyvio-driver-App
npm test
npm run test:gate1-exit
npm run verify:production-build
```

Optional live Command smoke (requires pilot credentials in env):

```bash
export VEYVIO_API_URL="https://<project>.supabase.co/functions/v1/command-api"
export VEYVIO_SUPABASE_URL="https://<project>.supabase.co"
export VEYVIO_ANON_KEY="<anon-key>"
export VEYVIO_PILOT_EMAIL="pilot-driver@bct.example"
export VEYVIO_PILOT_PASSWORD="<password>"
node scripts/gate1-pilot-exit-smoke.mjs
```

Dispatch + lifecycle hard gates (hosted API, includes tenant isolation + F-06 checks):

```bash
cd "../Veyvio admin "
export VEYVIO_ANON_KEY="<anon-key>"
export VEYVIO_ISOLATION_PASSWORD="<password>"
npm run test:dispatch-gates-live
```

Verifies: VOR vehicle assignment blocked (`assignment_blocked`), sign-on without duty acknowledgement blocked (`acknowledgement_required`), plus existing cross-tenant isolation checks.

Deploy backend first:

```bash
cd "Veyvio admin "
npx supabase functions deploy command-api
```

---

## Physical device checklist

Use one Android and one iOS device. Record date, device model, OS version, and app build.

Automated coverage (both platforms share Command): `npm run gate1:device-exit` proves rows 1, 4–5, 8–11 against live API. Rows marked **manual** still need a handset.

| # | Step | Pass criteria | Android | iOS | Auto |
|---|------|---------------|---------|-----|------|
| 1 | Login + company select | Lands on home with correct BCT company; no other tenant data visible | ☑ APK launch | ☐ | ☑ API |
| 2 | Sync centre honest queue | Pending count is **0** when synced; increases when offline actions queued | ☐ UI | ☐ | ☐ manual |
| 3 | Airplane mode mid-walkaround | Queue grows; reconnect uploads check; server receives evidence | ☑ adb on/off | ☐ | ☑ adb cycle; walkaround UI still operator |
| 4 | Acknowledge published duty | My duty shows published duty; acknowledge succeeds | ☐ | ☐ | ☑ API |
| 5 | Sign-on gate | Without ack or check, sign-on disabled with **server** reason (not local-only) | ☐ | ☐ | ☑ API |
| 6 | Bodywork defect → Yard | Damage appears in Yard hub within 60s without manual re-entry | ☐ | ☐ | ☐ manual |
| 7 | Handback + parking | Bay recorded; handback reference in Command; Yard map updates | ☐ | ☐ | ☐ **manual** |
| 8 | AdBlue (diesel vehicle) | Litres + mileage in Command; appears on vehicle timeline | ☐ | ☐ | ☑ readiness/timeline API |
| 9 | Duty published notification | In-app alert after Command publishes duty; opens My duty / jobs | ☐ | ☐ | ☑ endpoint; push tap **manual** |
| 10 | Sequential company login | Second company login shows zero cache/queue bleed from first | ☐ | ☐ | ☑ company-scoped session |
| 11 | Production build profile | No Base44/PHV/mock paths; `verify:production-build` green | ☐ | ☐ | ☑ |

---

## Failure handling

- **Sync shows 0 but queue has items:** stop-ship — P0-04 regression  
- **Sign-on succeeds when server blocks:** stop-ship — P0-06 regression  
- **Sign-on succeeds before duty acknowledged:** stop-ship — duty lifecycle regression (TD-005)  
- **Yard does not see driver damage:** verify `command-api` deploy + `ensureYardFollowUpForDriverDefect`  
- **Cross-tenant data after company switch:** stop-ship — tenancy regression  

---

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Operations lead | | | |
| Engineering lead | | | |
| Pilot driver | | | |

When all rows pass on both platforms, update `veyvio-production-gates.md` §3.1 with pilot date and company.
