# Gate 1 — iOS Xcode device runbook

**Device:** Sheanda's iPhone (`00008110-001274A11EEB801E`)  
**Bundle:** `uk.veyvio.driver`  
**Team in project:** `G9XUS27Y8Q` (Apple Development identity on Mac)

**Status (28 Jul 2026):** Physical rows still **open**. Do not mark PASS until ⌘R deploy + checklist below are done on a connected iPhone.

---

## Device offline / not listed

If `xcrun xctrace list devices` shows the iPhone under **Devices Offline**, or Xcode has no run destination:

1. Unlock the iPhone; dismiss any “Trust This Computer?” prompt (tap Trust).
2. Use a data USB cable (not charge-only); try another port.
3. On Mac: **Finder** → iPhone → confirm it appears; or **Xcode → Window → Devices and Simulators**.
4. Re-run: `xcrun xctrace list devices` — phone must appear under **Devices** (not Offline).
5. Only then continue with **Run on device**.

Android-only BCT pilot may proceed without iOS ([bct-pilot-live-shift-runbook.md](./bct-pilot-live-shift-runbook.md)). **App Store / TestFlight** stay blocked until this sheet is signed.

---

## One-time prep (done in repo)

```bash
cd veyvio-driver-App
npm run build:ios
open ios/App/App.xcworkspace
```

Verify in Xcode **App** target → **Signing & Capabilities**:

- **Automatically manage signing** = on  
- **Team** = your Apple ID team  
- **Bundle Identifier** = `uk.veyvio.driver`

---

## Run on device (exact sequence)

1. Connect iPhone via USB; unlock and trust Mac (see offline checklist above).
2. In Xcode, select **Sheanda's iPhone** as run destination (not Simulator).
3. If Xcode asks for **iOS device support**, download via **Settings → Components** (or Platforms).
4. **Product → Run** (⌘R). Wait for install + launch.
5. On first launch: allow notifications, camera, location when prompted.
6. Sign in as `pilot-driver@veyvio.test` (password in `.gate1-secrets.local.env`).
7. Tick rows in [`.gate1-handset-ios.local.md`](./.gate1-handset-ios.local.md) using [gate1-operator-physical-runbook.md](./gate1-operator-physical-runbook.md) §2.

---

## Gate 1 physical checklist

Use [`gate1-operator-physical-runbook.md`](./gate1-operator-physical-runbook.md) §2 and tick rows in [`.gate1-handset-ios.local.md`](./.gate1-handset-ios.local.md).

Generate / refresh blank sheet:

```bash
npm run gate1:ios-checklist
```

Leave unchecked rows as open until verified on device — never copy Android PASS into iOS.

---

## Signing troubleshooting

| Symptom | Fix |
|---------|-----|
| No signing certificate | Xcode → Settings → Accounts → Manage Certificates → **+** Apple Development |
| Provisioning profile error | Toggle automatic signing off/on; clean build folder |
| Device not listed | Window → Devices and Simulators → pair iPhone; see **Device offline** above |
| Untrusted developer | iPhone Settings → General → VPN & Device Management → trust |

---

## After sign-off

1. Ops lead fills Result = Pass on the iOS local sheet.  
2. Update `veyvio-production-gates.md` §3.1 with iOS pass date.  
3. Only then open App Store / TestFlight work in [gate3-store-readiness.md](./gate3-store-readiness.md) and [gate3-testflight-archive.md](./gate3-testflight-archive.md).
