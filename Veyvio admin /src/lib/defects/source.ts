import type { VehicleDefectEntry, VehicleProfile } from '@/lib/vehicles/types'
import type { DefectSourceRecord } from './types'

const SOURCE_LABELS: Record<string, { type: DefectSourceRecord['type']; label: string }> = {
  driver_walkaround: { type: 'vehicle_check', label: 'Driver walkaround check' },
  driver_pre_use: { type: 'vehicle_check', label: 'Driver pre-use check' },
  driver_journey: { type: 'vehicle_check', label: 'Driver journey report' },
  yard_inspection: { type: 'yard_inspection', label: 'Yard inspection' },
  scheduled_inspection: { type: 'yard_inspection', label: 'Scheduled inspection' },
  maintenance_job: { type: 'maintenance_job', label: 'Maintenance job' },
  incident: { type: 'incident', label: 'Incident report' },
  admin_report: { type: 'manual', label: 'Manual admin report' },
  telematics: { type: 'telematics', label: 'Telematics alert' },
}

export function buildDefectSourceRecord(
  defect: VehicleDefectEntry,
  profile: VehicleProfile,
  linkedCheckId: string | null,
  linkedWorkOrderId: string | null,
): DefectSourceRecord {
  const meta = SOURCE_LABELS[defect.source] ?? { type: 'manual' as const, label: defect.source.replace(/_/g, ' ') }

  if (linkedCheckId) {
    const check = profile.checks.find((c) => c.id === linkedCheckId)
    return {
      type: 'vehicle_check',
      reference: linkedCheckId,
      label: check ? `${check.checkType.replace(/_/g, ' ')} check` : 'Vehicle check',
      href: `/vehicle-checks?check=${linkedCheckId}`,
      reportedAt: defect.reportedAt,
      reporterName: defect.reportedBy,
    }
  }

  if (linkedWorkOrderId) {
    return {
      type: 'maintenance_job',
      reference: linkedWorkOrderId,
      label: 'Maintenance work order',
      href: `/maintenance?tab=work-orders&wo=${linkedWorkOrderId}`,
      reportedAt: defect.reportedAt,
      reporterName: defect.reportedBy,
    }
  }

  if (defect.source === 'incident') {
    return {
      type: 'incident',
      reference: `INC-${defect.id.slice(-4).toUpperCase()}`,
      label: 'Linked incident',
      href: '/incidents',
      reportedAt: defect.reportedAt,
      reporterName: defect.reportedBy,
    }
  }

  return {
    type: meta.type,
    reference: defect.id,
    label: meta.label,
    href: meta.type === 'vehicle_check' ? '/vehicle-checks' : null,
    reportedAt: defect.reportedAt,
    reporterName: defect.reportedBy,
  }
}
