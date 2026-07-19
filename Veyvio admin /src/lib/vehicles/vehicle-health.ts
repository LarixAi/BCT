import type { VehicleProfile } from './types'

export interface VehicleHealthSnapshot {
  score: number
  roadworthy: boolean
  vorActive: boolean
  openDefects: number
  criticalDefects: number
  openWorkOrders: number
  availabilityLabel: string
  upcomingServiceLabel: string | null
  upcomingServiceDate: string | null
}

function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null
  const ms = new Date(date).getTime() - Date.now()
  if (Number.isNaN(ms)) return null
  return Math.ceil(ms / 86_400_000)
}

export function computeVehicleHealth(vehicle: VehicleProfile): VehicleHealthSnapshot {
  const vorActive =
    vehicle.operationalStatus === 'vor' || vehicle.vorRecords.some((v) => !v.resolvedAt)
  const openDefects = vehicle.defects.filter((d) => d.status !== 'closed').length
  const criticalDefects = vehicle.criticalDefectCount ?? 0
  const openWorkOrders = vehicle.workOrders.filter((w) => !['completed', 'cancelled'].includes(w.status)).length
  const checksOverdue = Boolean(vehicle.checksOverdue)
  const complianceBad =
    vehicle.complianceStatus === 'non_compliant' || vehicle.complianceStatus === 'expiring_soon'

  let score = 100
  if (vorActive) score -= 40
  score -= Math.min(30, openDefects * 8)
  score -= Math.min(20, criticalDefects * 12)
  score -= Math.min(15, openWorkOrders * 5)
  if (checksOverdue) score -= 10
  if (complianceBad) score -= 10
  if (vehicle.conditionStatus === 'safety_critical') score -= 15
  else if (vehicle.conditionStatus === 'repair_required') score -= 8
  score = Math.max(0, Math.min(100, score))

  const roadworthy =
    !vorActive &&
    criticalDefects === 0 &&
    vehicle.release?.canAllocate !== false &&
    vehicle.readiness?.assignmentEligible !== false

  const pmiDays = daysUntil(vehicle.nextMaintenanceDate ?? vehicle.pmiInterval?.reviewDueAt ?? null)
  const motDays = daysUntil(vehicle.motExpiry)
  let upcomingServiceLabel: string | null = null
  let upcomingServiceDate: string | null = null
  if (pmiDays != null && (motDays == null || pmiDays <= motDays)) {
    upcomingServiceLabel = pmiDays <= 0 ? 'PMI overdue' : `PMI in ${pmiDays} day${pmiDays === 1 ? '' : 's'}`
    upcomingServiceDate = vehicle.nextMaintenanceDate ?? vehicle.pmiInterval?.reviewDueAt ?? null
  } else if (motDays != null) {
    upcomingServiceLabel = motDays <= 0 ? 'MOT overdue' : `MOT in ${motDays} day${motDays === 1 ? '' : 's'}`
    upcomingServiceDate = vehicle.motExpiry
  }

  const availabilityLabel =
    vehicle.operationalStatus === 'vor'
      ? 'VOR'
      : vehicle.operationalStatus === 'in_workshop' || vehicle.operationalStatus === 'awaiting_parts'
        ? 'Workshop'
        : vehicle.operationalStatus === 'in_service'
          ? 'In service'
          : vehicle.operationalStatus === 'allocated' || vehicle.operationalStatus === 'reserved'
            ? 'Booked'
            : roadworthy
              ? 'Roadworthy'
              : 'Held'

  return {
    score,
    roadworthy,
    vorActive,
    openDefects,
    criticalDefects,
    openWorkOrders,
    availabilityLabel,
    upcomingServiceLabel,
    upcomingServiceDate,
  }
}

export interface ScheduleCard {
  id: string
  title: string
  cadence: string
  nextLabel: string
  status: 'ok' | 'due_soon' | 'overdue' | 'missing'
  detail: string | null
}

export function buildMaintenanceScheduleCards(vehicle: VehicleProfile): ScheduleCard[] {
  const cards: ScheduleCard[] = []
  const pmiWeeks = vehicle.pmiInterval?.intervalWeeks ?? 6
  const pmiDate = vehicle.nextMaintenanceDate ?? vehicle.pmiInterval?.reviewDueAt ?? null
  const pmiDays = daysUntil(pmiDate)
  cards.push({
    id: 'pmi',
    title: 'PMI',
    cadence: `Every ${pmiWeeks} weeks`,
    nextLabel: pmiDate
      ? new Date(pmiDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Not scheduled',
    status:
      pmiDays == null ? 'missing' : pmiDays < 0 ? 'overdue' : pmiDays <= 14 ? 'due_soon' : 'ok',
    detail:
      pmiDays == null
        ? null
        : pmiDays < 0
          ? `${Math.abs(pmiDays)} days overdue`
          : pmiDays === 0
            ? 'Due today'
            : `In ${pmiDays} days`,
  })

  const motDays = daysUntil(vehicle.motExpiry)
  cards.push({
    id: 'mot',
    title: 'MOT',
    cadence: 'Annual',
    nextLabel: vehicle.motExpiry
      ? new Date(vehicle.motExpiry).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Not on file',
    status:
      motDays == null ? 'missing' : motDays < 0 ? 'overdue' : motDays <= 28 ? 'due_soon' : 'ok',
    detail: motDays == null ? null : motDays < 0 ? 'Expired' : `Reminder ${motDays} days`,
  })

  const tachoDays = daysUntil(vehicle.tachographCalibrationExpiry)
  cards.push({
    id: 'tacho',
    title: 'Tachograph calibration',
    cadence: '2-yearly',
    nextLabel: vehicle.tachographCalibrationExpiry
      ? new Date(vehicle.tachographCalibrationExpiry).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'Not on file',
    status:
      tachoDays == null ? 'missing' : tachoDays < 0 ? 'overdue' : tachoDays <= 28 ? 'due_soon' : 'ok',
    detail: null,
  })

  if (vehicle.nextMaintenanceMileage != null && vehicle.mileage != null) {
    const remaining = vehicle.nextMaintenanceMileage - vehicle.mileage
    cards.push({
      id: 'service-miles',
      title: 'Service (mileage)',
      cadence: 'Mileage interval',
      nextLabel: `${vehicle.nextMaintenanceMileage.toLocaleString('en-GB')} mi`,
      status: remaining <= 0 ? 'overdue' : remaining <= 500 ? 'due_soon' : 'ok',
      detail: remaining <= 0 ? 'Mileage service due' : `${remaining.toLocaleString('en-GB')} mi remaining`,
    })
  }

  const retorqueDue = vehicle.wheelRetorqueDueAt
  const retorqueDays = daysUntil(retorqueDue)
  if (retorqueDue) {
    cards.push({
      id: 'retorque',
      title: 'Wheel re-torque',
      cadence: 'After wheel work',
      nextLabel: new Date(retorqueDue).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      status: retorqueDays != null && retorqueDays < 0 ? 'overdue' : retorqueDays != null && retorqueDays <= 3 ? 'due_soon' : 'ok',
      detail: null,
    })
  }

  return cards
}
