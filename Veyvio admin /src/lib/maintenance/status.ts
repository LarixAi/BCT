import type { VehicleProfile } from '@/lib/vehicles/types'
import type { VehicleMaintenanceStatus } from './types'

const OPEN_WO = ['requested', 'awaiting_review', 'approved', 'scheduled', 'vehicle_awaiting_workshop', 'in_progress', 'awaiting_parts', 'awaiting_authorisation', 'quality_check'] as const

export function deriveMaintenanceStatus(profile: VehicleProfile): VehicleMaintenanceStatus {
  const openOrders = profile.workOrders.filter((w) => OPEN_WO.includes(w.status as (typeof OPEN_WO)[number]))

  if (openOrders.some((w) => w.status === 'awaiting_parts')) return 'awaiting_parts'
  if (openOrders.some((w) => w.status === 'quality_check')) return 'awaiting_inspection'
  if (
    openOrders.some((w) => ['in_progress', 'vehicle_awaiting_workshop'].includes(w.status)) ||
    profile.operationalStatus === 'in_workshop'
  ) {
    return 'in_workshop'
  }
  if (
    profile.operationalStatus === 'vor' &&
    openOrders.length > 0 &&
    openOrders.every((w) => w.status === 'completed' || w.returnToServiceApproved)
  ) {
    return 'ready_for_release'
  }
  if (openOrders.some((w) => ['scheduled', 'approved', 'requested', 'awaiting_review'].includes(w.status))) {
    return 'scheduled'
  }
  if (profile.nextMaintenanceDate) {
    const due = new Date(profile.nextMaintenanceDate).getTime()
    if (due < Date.now() + 14 * 24 * 60 * 60 * 1000) return 'scheduled'
  }
  return 'no_action'
}

export function primaryOpenDefect(profile: VehicleProfile) {
  const open = profile.defects.filter((d) => d.status !== 'closed')
  const ranked = [...open].sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
  return ranked[0] ?? null
}

export function severityRank(severity: string): number {
  if (severity === 'dangerous') return 4
  if (severity === 'major') return 3
  if (severity === 'minor') return 2
  return 1
}

export function downtimeHours(profile: VehicleProfile): number | null {
  const activeVor = profile.vorRecords.find((v) => !v.resolvedAt)
  if (activeVor) {
    return Math.round((Date.now() - new Date(activeVor.reportedAt).getTime()) / 3_600_000)
  }
  if (profile.operationalStatus === 'vor') {
    return Math.round((Date.now() - new Date(profile.updatedAt).getTime()) / 3_600_000)
  }
  return null
}

export function compliancePosition(profile: VehicleProfile): string {
  const parts: string[] = []
  if (profile.motExpiry) {
    const mot = new Date(profile.motExpiry)
    parts.push(mot < new Date() ? 'MOT expired' : `MOT ${profile.motExpiry}`)
  }
  if (profile.tachographCalibrationExpiry) {
    parts.push(`Tacho ${profile.tachographCalibrationExpiry}`)
  }
  return parts.join(' · ') || '—'
}
