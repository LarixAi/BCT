# Vehicle condition & damage evidence

Inspections are **moments in time**. Damage records **persist over time**. Condition snapshots describe the **approved state** at a point.

## Product structure

| Area | Route | Purpose |
|------|-------|---------|
| Inspections hub | `/inspections` | Dashboard: review queue, baselines, checks |
| Vehicle Condition tab | `/yard/$vehicleId/condition` | Long-term record per vehicle |
| Guided inspection | `/yard/$vehicleId/condition/inspect` | Onboarding baseline & bodywork capture |
| Damage detail | `/yard/$vehicleId/condition/damage/$damageId` | Persistent damage record + observations |
| Compare evidence | `/yard/$vehicleId/condition/compare` | Side-by-side zone comparison |
| Damage review | `/inspections/damage-review` | Yard manager review queue |
| Driver report (prototype) | `/simulate/driver-report` | Simulate inbound driver damage report |
| Repair verification | `/inspections/repair-verification` | Post-repair inspection queue |
| Condition analytics | `/inspections/analytics` | Depot condition trends and risk alerts |

## Core concepts

- **Inspection** — activity at a point in time (`VehicleInspection`)
- **Observation** — something noticed during an inspection (`DamageObservation`)
- **Damage record** — physical condition persisting across inspections (`DamageRecord`)
- **Defect** — operational/safety issue (existing `Defect` type, linkable via `defectId`)

Media always belongs to an inspection (`InspectionMedia`), never a loose gallery.

## Yard check integration

`completeCheck()` creates a linked `VehicleInspection` with `checkId` / `inspectionId` cross-reference on `YardCheckResult`.

## Phase 1 (implemented)

- Condition tab with body zone diagram
- Onboarding baseline guided capture (vehicle-type templates)
- Damage records + observations + review queue
- Custody timeline (fixture seed)
- Inspection history
- Compare evidence (basic side-by-side)
- Bootstrap schema v3

## Phase 2 (implemented)

- **Yard check ↔ condition** — `CheckBodyworkPanel` on bodywork-linked DVSA sections during yard checks
- **Evidence compare slider** — drag-to-compare on `/yard/$vehicleId/condition/compare`
- **Damage review → operations** — `reviewDamageObservation()` applies `operationalDecisionForDamage()`, raises defects and auto-VOR when warranted
- **Repair work orders** — `requestRepair()` on damage detail; fixture seed `repairWorkOrders`
- **Home attention** — damage review count on home board via `getAttentionItems()`
- **Custody timeline** — events on inspection complete and damage review
- **Driver report prototype** — `/simulate/driver-report` for testing the review queue flow
- Bootstrap schema v4 (`repairWorkOrders`)

## Phase 3 (implemented)

- **Repair lifecycle** — `startRepairWorkOrder()`, `completeRepairWorkOrder()`, `verifyRepairWorkOrder()`
- **Post-repair verification** — guided inspection with pass/fail outcome; queue at `/inspections/repair-verification`
- **Return-to-service gate** — `ReturnToServiceGate` blocks RTS yard check until repairs verified and safety defects cleared
- **RTS check release** — passing `return-to-service` yard check clears VOR cases and sets vehicle `Available`
- **VOR detail** — shows gate status and RTS check link when ready
- Home attention includes repair verification count

## Phase 4 (implemented)

- **AI similarity hints** — metadata-based advisory scoring (`computeEvidenceSimilarityHint`) on compare and damage review
- **Duplicate detection** — `findDuplicateDamageCandidates()` flags overlapping driver reports vs existing records
- **`SimilarityHintPanel`** — shows score, suggested classification, and matched damage link (manager must confirm)
- Fixture zone evidence images for v3 nearside rear quarter comparison demo

## Phase 5 (implemented)

- **Condition analytics** — `/inspections/analytics` depot dashboard
- Open damage by severity, pending review, unreported new, repair backlog, missing baselines
- Top damage zones and vehicles with recurring damage (2+ areas)
- Risk alerts for safety-critical damage, verification backlog, baseline gaps

## Key files

- Types: `src/types/condition.ts`
- Body zones: `src/domain/condition/body-zones.ts`
- Store: `src/store/yard.ts` (inspection + damage actions)
- Domain: `src/domain/condition/damage-operational.ts`, `check-bodywork-link.ts`, `repair-workflow.ts`, `return-to-service-gate.ts`, `evidence-similarity.ts`, `condition-analytics.ts`
- Components: `CheckBodyworkPanel`, `EvidenceCompareSlider`, `ReturnToServiceGate`, `SimilarityHintPanel`
