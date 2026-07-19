import { isBrakeEvidenceGap, pmiChecklistEvidenceGaps } from './pmi-checklist'
import type { FleetWorkOrderRow, ServiceScheduleItem } from './types'
import type { VehicleProfile } from '@/lib/vehicles/types'

export type EvidenceQueueItem = {
  id: string
  kind:
    | 'missing_pmi_evidence'
    | 'missing_brake_evidence'
    | 'overdue_service'
    | 'mot_approaching'
    | 'tacho_approaching'
  vehicleId: string
  registrationNumber: string
  title: string
  detail: string
  href: string
}

/** Itemized compliance / evidence gaps for the Compliance tab. */
export function buildEvidenceQueue(
  profiles: VehicleProfile[],
  workOrders: FleetWorkOrderRow[],
  schedule: ServiceScheduleItem[],
): EvidenceQueueItem[] {
  const items: EvidenceQueueItem[] = []

  for (const p of profiles) {
    for (const w of p.workOrders) {
      if (w.type !== 'pmi' || ['completed', 'cancelled'].includes(w.status)) continue
      const gaps = pmiChecklistEvidenceGaps(w.pmiChecklist)
      if (gaps.length === 0) continue
      const brakeGaps = gaps.filter(isBrakeEvidenceGap)
      const kind = brakeGaps.length > 0 ? 'missing_brake_evidence' : 'missing_pmi_evidence'
      items.push({
        id: `ev-pmi-${w.id}`,
        kind,
        vehicleId: p.id,
        registrationNumber: p.registrationNumber,
        title: kind === 'missing_brake_evidence' ? 'Missing brake performance evidence' : 'PMI checklist incomplete',
        detail: `${w.title}: ${gaps[0]}${gaps.length > 1 ? ` (+${gaps.length - 1} more)` : ''}`,
        href: `/maintenance?tab=pmi&wo=${w.id}&vehicle=${p.id}`,
      })
    }
  }

  // Also surface hub rows that report incomplete progress (defensive if profile lag)
  for (const w of workOrders) {
    if (
      w.type === 'pmi' &&
      w.pmiChecklistProgress &&
      !w.pmiChecklistProgress.complete &&
      !items.some((i) => i.id === `ev-pmi-${w.workOrderId}`)
    ) {
      items.push({
        id: `ev-pmi-${w.workOrderId}`,
        kind: 'missing_pmi_evidence',
        vehicleId: w.vehicleId,
        registrationNumber: w.registrationNumber,
        title: 'PMI checklist incomplete',
        detail: `${w.title}: ${w.pmiChecklistProgress.answered}/${w.pmiChecklistProgress.total} items recorded`,
        href: `/maintenance?tab=pmi&wo=${w.workOrderId}&vehicle=${w.vehicleId}`,
      })
    }
  }

  for (const s of schedule) {
    if (s.status === 'overdue') {
      items.push({
        id: `ev-overdue-${s.id}`,
        kind: 'overdue_service',
        vehicleId: s.vehicleId,
        registrationNumber: s.registrationNumber,
        title: 'Overdue service / PMI',
        detail: `${s.serviceType} due ${s.dueDate?.slice(0, 10) ?? '—'}`,
        href: `/vehicles/${s.vehicleId}?tab=Maintenance`,
      })
    }
  }

  for (const p of profiles) {
    if (p.motExpiry) {
      const days = Math.ceil((new Date(p.motExpiry).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      if (days >= 0 && days <= 30) {
        items.push({
          id: `ev-mot-${p.id}`,
          kind: 'mot_approaching',
          vehicleId: p.id,
          registrationNumber: p.registrationNumber,
          title: 'MOT / annual test approaching',
          detail: `Expires ${p.motExpiry.slice(0, 10)} (${days}d)`,
          href: `/inspections?filter=due_7`,
        })
      }
    }
    if (p.tachographCalibrationExpiry) {
      const days = Math.ceil(
        (new Date(p.tachographCalibrationExpiry).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
      )
      if (days >= 0 && days <= 30) {
        items.push({
          id: `ev-tacho-${p.id}`,
          kind: 'tacho_approaching',
          vehicleId: p.id,
          registrationNumber: p.registrationNumber,
          title: 'Tachograph calibration approaching',
          detail: `Expires ${p.tachographCalibrationExpiry.slice(0, 10)} (${days}d)`,
          href: `/vehicles/${p.id}?tab=Maintenance`,
        })
      }
    }
  }

  const rank: Record<EvidenceQueueItem['kind'], number> = {
    missing_brake_evidence: 0,
    missing_pmi_evidence: 1,
    overdue_service: 2,
    mot_approaching: 3,
    tacho_approaching: 4,
  }
  return items.sort((a, b) => rank[a.kind] - rank[b.kind])
}
