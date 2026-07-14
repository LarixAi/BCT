# Yard vehicle check (DVSA-aligned)

Veyvio Yard vehicle checks are based on the **DVSA PSV daily walkaround**, expanded with yard readiness, equipment, cleanliness, job suitability and defect management.

## Design principles

1. **Physical inspection first** — the app records the check; it does not replace walking around the vehicle.
2. **Two-level checklist** — section-level pass / defect / N/A, with defect drill-down only when needed.
3. **Multiple check types** — not one checklist for every situation.
4. **Controlled outcomes** — defects drive vehicle status, tasks and (where appropriate) VOR.

## Modules

| Module | Purpose |
|--------|---------|
| Roadworthiness | 29 DVSA PSV walkaround groups (`src/domain/yard/check-templates.ts` → `DVSA_SECTIONS`) |
| Yard readiness | Identity, bay, keys, fuel/charge, cleanliness, compliance, assignment |
| Equipment | Permanent safety, assigned, consumables, documents |
| Job suitability | Wheelchair capacity, seats, child seats, contract equipment, route fit |

## Check types

| Type | When | Sections |
|------|------|----------|
| Start of day | Before first use | Full template (all modules) |
| First use | New / hired / long-term VOR | Full template |
| Driver changeover | New driver | Cab + key exterior + yard items |
| Between runs | After damage or equipment change | Targeted safety + equipment |
| Return to yard | Vehicle returns | Exterior, passenger, yard readiness |
| Yard spot check | Supervisor audit | Full DVSA + spot-bust audit modules (managers only) |
| VOR assessment | Serious defect | Safety-critical DVSA groups |
| Return to service | After repair | Safety-critical + compliance |
| Scheduled inspection | Maintenance interval | DVSA groups (technician use) |

## Section outcomes

Each section records:

- `passed` — all observations in the group satisfactory
- `defect` — drill-down: failed item IDs, safe-to-move flag, notes
- `na` — not applicable for this vehicle / check

## Safety outcomes

Computed in `src/domain/yard/check-outcome.ts`:

| Outcome | Meaning | Typical vehicle effect |
|---------|---------|------------------------|
| `ready` | Green — no defects | Release if otherwise ready |
| `attention` | Amber — non-safety issues | May still dispatch |
| `hold` | Red — safety concern | `Awaiting Check` |
| `vor` | Safety-critical + unsafe to move | `VOR` |

Defects are auto-raised from defect sections with severity from section metadata. Safety-critical defects marked **unsafe to move** automatically open a VOR case and urgent inspection task.

Submission metadata (duration, device, offline flag) is captured on complete.

## Yard manager spot-bust audit (`yard-spot`)

Managers with `check.spot_audit` can run a **full vehicle audit** to find defects missed on driver walkarounds:

- All 29 DVSA roadworthiness groups (physical re-inspection)
- **Spot-bust audit** module: bald tyres, unreported body damage, lights passed but faulty, defect register cross-check, etc.
- Yard readiness subset (defects, cleanliness, compliance)
- Equipment verification

Defects raised from this check are tagged `auditFinding` and prefixed `[Manager audit]` for reporting.

Access: vehicle detail **Audit** button, or check wizard → **Yard manager audit** (highlighted for managers).

## UI

- Route: `/yard/$vehicleId/check` — wizard
- Route: `/checks/$checkId` — check record detail
- Wizard: `src/components/yard/YardCheckWizard.tsx`
- Photos: `src/components/yard/DefectPhotoCapture.tsx`
- Store: `completeCheck(vehicleId, CompleteYardCheckInput)` in `src/store/yard.ts`

## Record retention (product target)

- Defect reports + repairs: **15 months** minimum (DVSA)
- Nil-defect checks: **3 months** minimum (DVSA recommendation)
- Also capture: start/end time, device, offline flag, amendments (future)

## Related

- Types: `src/types/yard-check.ts`
- Templates: `src/domain/yard/check-templates.ts`
- Tests: `src/domain/yard/check-templates.test.ts`
