# Vehicle reporting system

Shared operational record used by Yard, Driver, Command and Maintenance.

**Central principle:** a vehicle issue is recorded once, then followed through to resolution without re-entry.

## Delivery phases

1. AdBlue shared record + Yard wizard + Driver payload + Command history
2. Vehicle Reports MVP (damage/defect → review → VOR/restriction → work order → verify → return to road)
3. Command Vehicle Reports workspace (`/vehicle-reports`)
4. This architecture lock

## Report types (v1)

| Type | Use |
|------|-----|
| `damage` | Collision / bodywork damage with evidence |
| `defect` | Mechanical, legal or operational fault |
| `equipment` | Missing / damaged / expired equipment |
| `cleanliness` | Cleaning / biohazard / odour |
| `inspection_observation` | Structured inspection finding |
| `adblue` | Link from AdBlue top-up when warning does not clear |
| `other` | Catch-all with category text |

## Lifecycle stages

`reported` → `risk_assessed` → `under_review` → `action` → `verification` → `closed`

Severity: `critical` | `major` | `moderate` | `minor` | `observation`

Typical actions: critical → automatic VOR + alert; major → hold pending review; moderate → maintenance review; minor → schedule; observation → history only.

The reporter provides information and an initial safety answer. Authorised staff make the final roadworthiness decision.

## Authoritative vehicle status

One status service for Dispatch, Yard, Driver, Maintenance, Schedule, Vehicles and Reporting:

| Status | Meaning |
|--------|---------|
| `available` | Eligible for assignment |
| `allocated` | Assigned to a run, not yet in service |
| `in_service` | On the road |
| `awaiting_yard_check` | Needs yard / daily check |
| `awaiting_review` | Report under Command review |
| `restricted_use` | Operable with named restrictions |
| `held` | Operational hold |
| `vor` | Vehicle off road |
| `in_maintenance` / `in_workshop` | Workshop custody |
| `awaiting_parts` | Blocked on parts |
| `awaiting_inspection` | Inspection due before use |
| `awaiting_verification` | Repair done, RTS not verified |
| `cleaning_required` | Cleaning gate |
| `ready_for_return_to_road` | Cleared for RTS checklist |
| `decommissioned` | Left the fleet |

Legacy aliases map into this list in readiness projection (`quarantined` → `vor`, `maintenance` → `in_workshop`, etc.).

## Assignment blocking

Before assignment, check:

- Not VOR / no open VOR episode
- No unresolved critical defect
- No failed inspection preventing use
- Daily check valid (where company rules require)
- Required equipment present
- Accessibility equipment operational for the passenger need
- Active restrictions do not conflict with the journey
- MOT / tax / insurance / calibration valid where applicable

## VOR episode (required retention)

Every VOR episode permanently retains:

- Open reason, category, reporter, location, passengers onboard, safe-to-move
- Linked report / defect / work orders
- Diagnosis, work performed, repair type, technician
- Labour, parts, external and total cost
- Downtime hours (open → return)
- Verification result, method, verifier, timestamp
- Returned-to-road by / at / mileage
- Preventive action
- Audit timeline

Closing RTS without work / verification on an open VOR is blocked.

## AdBlue record

Canonical `adblue_records` fields:

- Vehicle, mileage, amount (litres), fill type, source
- Recorded by (name, role, timestamp) — system-set
- Physically added by (self / other / external)
- Warning before / cleared after
- Cost / receipt when external purchase
- Linked duty / defect when uncleared warning

Yard uses a three-step wizard. Driver journey fuel/AdBlue embeds `adblueRecord` on `resource.transaction.record`. Command shows history on the vehicle **Fuel & AdBlue** tab.

## Data model (tables)

| Table | Purpose |
|-------|---------|
| `vehicle_report` | Spine record |
| `vehicle_report_evidence` | Photos / video / docs |
| `vehicle_report_action` | Review / WO / VOR actions |
| `vehicle_report_status_history` | Stage transitions |
| `vehicle_report_comment` | Discussion |
| `vehicle_report_link` | Links to defect, WO, incident, check |
| `vehicle_restriction` | Restricted operation rules |
| `vehicle_vor_record` | Enriched VOR episode |
| `maintenance_work_order` | Repair action |
| `repair_verification` | RTS verification |
| `adblue_records` | Consumable top-ups |
| `notification_event` / `audit_event` | Alerts and audit |

Tenant isolation via `company_id` on every write.

## Permissions (v1)

| Action | Driver | Yard operative | Yard manager | Fleet / engineering | Compliance |
|--------|--------|----------------|--------------|---------------------|------------|
| Create report / AdBlue (assigned) | Yes | Yes | Yes | Yes | View |
| Create for any depot vehicle | No | Assigned | Yes | Yes | View |
| Apply / remove VOR | No | Request | Confirm request | Yes | Audit |
| Close technical defect / verify RTS | No | No | No | Yes | Reopen |
| Edit submitted AdBlue | No | No | With reason | With reason | Audit |
| Company-wide reporting | No | No | Depot | Yes | Yes |

## Offline (Yard)

- Save reports and AdBlue locally
- Show pending sync; preserve capture time vs upload time
- Prevent duplicate client ids
- Critical report: local hold on device before server sync
- Alert if critical record has not synced

## Notifications (v1 subset)

Immediate: critical report, VOR applied, passengers onboard, verification fail, missing evidence on critical path.

Escalate: major unreviewed > 15 min; VOR without WO > 30 min; open past SLA.

## Out of scope for v1

- Full fleet analytics suite and insurance claim UI
- AI damage matching beyond existing Yard similarity hints
- Complete `/ops/commands` bus for every mutation type (Driver AdBlue uses nested payload on resource transaction until command-api routes land)

## Command IA

```
Safety & Compliance
  Vehicle Checks
  Vehicle Reports     ← /vehicle-reports
  Defects
  Inspections
  Incidents
  Compliance Rules

Vehicles
  Vehicle profile
    Report history
    Fuel & AdBlue
    Costs (VOR + WO + AdBlue rollup)
    Maintenance (VOR episode cards)
```

## Key code

- Yard AdBlue wizard: `src/routes/_app.yard.$vehicleId.adblue.refill.tsx`
- Command AdBlue: `Veyvio admin /src/lib/adblue/`
- Vehicle reports: `Veyvio admin /src/lib/vehicle-reports/` + `features/vehicle-reports/`
- VOR episode: `VehicleVorRecord` in `lib/vehicles/types.ts`
- Assignment gate: `lib/vehicles/readiness-projection.ts`
