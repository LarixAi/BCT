# Body Condition Inspection System

Authoritative architecture for Veyvio Yard, Driver, Command and Maintenance.

**Central principle:** every inspection adds to vehicle history — it never replaces the previous inspection.

## Three connected records

| Record | Purpose | Mutable after submit? |
|--------|---------|----------------------|
| **Inspection** (`body_inspections`) | What was checked at a specific time | No — append-only; superseded by later inspection |
| **Damage case** (`vehicle_damage_cases`) | Continuing lifecycle of one area of damage | Status evolves; observations append |
| **Responsibility review** (`damage_responsibility_reviews`) | Restricted investigation into when/how | Confidential; separate from factual damage |

Finding damage is not the same as proving responsibility.

## Inspection types

| Type | Code | When used |
|------|------|-----------|
| Initial baseline | `initial_baseline` | Vehicle joins fleet, lease received, depot transfer, system rollout |
| Routine | `routine` | Weekly/monthly/mileage/policy scheduled |
| Start-of-shift handover | `start_shift_handover` | Driver assignment |
| End-of-shift return | `end_shift_return` | Vehicle returns to yard |
| Depot transfer | `depot_transfer` | Between depots |
| Reported damage | `reported_damage` | Driver/customer/CCTV trigger |
| After incident | `after_incident` | Collision or incident |
| Post-repair | `post_repair` | Bodywork completed — verification required |
| Lease return | `lease_return` | Returning leased vehicle |
| Disposal | `disposal` | Sale or decommission |
| Other | `other` | Catch-all with notes |

## Status models

### Inspection (`body_inspections.status`)

`draft` → `in_progress` → `submitted` → `awaiting_review` → `approved` | `returned_for_clarification` | `escalated`

Terminal: `superseded`, `cancelled`

### Damage case (`vehicle_damage_cases.status`)

`provisional` → `confirmed_existing` | `confirmed_new` → `under_review` → `approved_for_repair` → `repair_in_progress` → `repaired_awaiting_inspection` → `closed`

Also: `disputed`, `awaiting_estimate`, `repair_scheduled`, `monitoring`, `insurer_case`, `no_action_required`

### Vehicle body status (`approved_vehicle_status`)

`good` | `cosmetic_damage` | `repair_required` | `restricted` | `vor` | `awaiting_assessment` | `undergoing_repair`

## Data tables

See migration `202607250001_body_condition_inspection.sql`:

- `body_inspections` — core inspection record
- `body_inspection_media` — photos/video metadata (files in object storage)
- `vehicle_damage_cases` — long-term damage record
- `damage_observations` — each sighting linked to inspection
- `vehicle_condition_markers` — diagram coordinates (normalised 0–1)
- `inspection_reviews` — manager decisions
- `condition_acknowledgements` — driver handover chain of custody
- `damage_responsibility_reviews` — confidential responsibility findings
- `body_condition_audit_events` — immutable audit trail

## Multi-tenant isolation

Every row carries `company_id`. Backend validates:

1. Authenticated user active membership
2. Vehicle belongs to `company_id`
3. Depot access where `depot_id` is set
4. Role permissions for confidential fields

Never trust `company_id` from the client body alone.

## Offline (Yard)

1. Local temporary inspection ID
2. Encrypted local photo queue
3. Per-step autosave
4. Idempotency via `client_inspection_id`
5. `awaiting_sync` until media uploaded
6. UI states: saved locally → synchronising → partially uploaded → fully submitted → sync failed

## API surface

### Yard hub (`GET /yard/hub`)

Includes `bodyCondition` projection: inspections, damage cases, observations, media summaries, acknowledgements.

### Yard mutations (`POST /yard/mutations`)

| Type | Action |
|------|--------|
| `inspection.start` | Create draft inspection |
| `inspection.media` | Attach evidence |
| `inspection.complete` | Submit inspection |
| `inspection.approve` | Manager approval |
| `damage.report` | Create/update damage case + observation |
| `damage.review` | Manager classification |
| `repair.request` | Link repair work order |
| `vehicle.mark_vor` | VOR from critical damage |

### Command hub (`GET /body-condition/hub`)

Admin Body Condition Management workspace.

### Driver (`POST /driver/condition-acknowledgements`)

Pre-duty acknowledgement; creates `condition_acknowledgements` row.

## App integration

| App | Primary surfaces |
|-----|------------------|
| **Yard** | `/yard/$id/condition`, guided inspect wizard, damage review, repair verification |
| **Driver** | Condition acknowledgement before walkaround; report different condition |
| **Command** | `/body-condition` management, vehicle profile damage tab |
| **Maintenance** | Damage-assigned repair queue; post-repair triggers yard verification |

## Automation rules

- Critical damage → recommend VOR
- Doors/glass/steps/wheelchair/lights/wheels/sharp edges → manager review required
- VOR vehicle cannot dispatch
- Post-repair inspection mandatory before closing major/critical damage
- Unreviewed major report escalates after configurable period
- Repeated zone damage → trend warning
- Severity change after approval → audit event with reason
- Closed damage can reopen, never erase

## Related docs

- `08-vehicle-condition-damage.md` — Yard UI phases 1–5
- `09-vehicle-reporting-system.md` — broader vehicle reports spine
- `07-yard-vehicle-check.md` — DVSA yard checks (separate from body condition)

## Key files

- Types: `shared/veyvio-body-condition/types.ts`, `src/types/condition.ts`
- Backend: `supabase/functions/_shared/body-condition.ts`
- Yard store: `src/store/yard.ts`
- Hub mapping: `src/platform/api/map-yard-hub.ts`
- Admin: `src/features/body-condition/BodyConditionPage.tsx`
- Driver: `veyvio-driver-App/src/components/driver/condition/VehicleConditionAcknowledgement.jsx`
