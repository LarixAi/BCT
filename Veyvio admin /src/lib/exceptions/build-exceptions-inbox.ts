import type { DashboardAlert, DefectRecord, IncidentRecord } from '@/lib/api/types'
import {
  mapAlertToException,
  mapDefectToException,
  mapIncidentToException,
} from '@/lib/api/mappers'
import type { ExceptionCategory, ExceptionSeverity, OperationalException } from '@/lib/types'
import type { YardException } from '@/lib/yard/types'
import { EXCEPTION_CATALOG } from './mock-catalog'
import { enrichExceptionSuggestions } from './suggested-actions'

export type ExceptionsInboxInput = {
  alerts?: DashboardAlert[] | null
  defects?: DefectRecord[] | null
  incidents?: IncidentRecord[] | null
  driverExceptions?: OperationalException[] | null
  vehicleExceptions?: OperationalException[] | null
  yardExceptions?: YardException[] | null
  /** Include seeded multi-module catalog (default true for control-room demo density). */
  includeCatalog?: boolean
  apiExceptions?: OperationalException[] | null
}

const SEVERITY_RANK: Record<ExceptionSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export function normalizeCategory(
  category: string | null | undefined,
): ExceptionCategory {
  switch (category) {
    case 'trip':
      return 'journey'
    case 'passenger':
      return 'customer'
    case 'driver':
    case 'vehicle':
    case 'journey':
    case 'customer':
    case 'dispatch':
    case 'compliance':
    case 'yard':
      return category
    default:
      return 'journey'
  }
}

export function normalizeException(ex: OperationalException): OperationalException {
  return enrichExceptionSuggestions({
    ...ex,
    category: normalizeCategory(ex.category),
    description: ex.description ?? ex.recommendedAction ?? ex.title,
    escalated: ex.escalated ?? false,
  })
}

export function mapYardExceptionToOperational(ex: YardException): OperationalException {
  const severity: ExceptionSeverity =
    ex.severity === 'critical' ? 'critical' : ex.severity === 'warning' ? 'high' : 'low'

  return normalizeException({
    id: ex.id,
    severity,
    title: ex.title,
    typeCode: 'yard_exception',
    category: 'yard',
    description: ex.detail,
    relatedRecord: ex.registrationNumber,
    relatedHref: `/yard?vehicle=${encodeURIComponent(ex.vehicleId)}`,
    depot: ex.depotId,
    raisedAt: new Date(ex.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ageMinutes: Math.max(0, Math.round((Date.now() - new Date(ex.detectedAt).getTime()) / 60_000)),
    slaMinutesRemaining: severity === 'critical' ? 15 : 45,
    owner: ex.ownerName,
    status: ex.escalationStatus === 'resolved' ? 'resolved' : ex.escalationStatus === 'acknowledged' ? 'acknowledged' : 'new',
    lastUpdate: new Date(ex.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    recommendedAction: ex.recommendedAction,
    source: 'Yard',
    vehicleRegistration: ex.registrationNumber,
  })
}

function sortInbox(rows: OperationalException[]): OperationalException[] {
  return [...rows].sort((a, b) => {
    const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
    if (sev !== 0) return sev
    const aBreach = a.slaMinutesRemaining != null && a.slaMinutesRemaining < 0 ? 0 : 1
    const bBreach = b.slaMinutesRemaining != null && b.slaMinutesRemaining < 0 ? 0 : 1
    if (aBreach !== bBreach) return aBreach - bBreach
    return a.ageMinutes - b.ageMinutes
  })
}

/** Compose Command exceptions inbox from every module signal. */
export function buildExceptionsInbox(input: ExceptionsInboxInput): OperationalException[] {
  const fromAlerts = (input.alerts ?? []).map((a, i) => normalizeException(mapAlertToException(a, i)))
  const fromDefects = (input.defects ?? []).map((d) => normalizeException(mapDefectToException(d)))
  const fromIncidents = (input.incidents ?? []).map((i) => normalizeException(mapIncidentToException(i)))
  const fromDrivers = (input.driverExceptions ?? []).map(normalizeException)
  const fromVehicles = (input.vehicleExceptions ?? []).map(normalizeException)
  const fromYard = (input.yardExceptions ?? []).map(mapYardExceptionToOperational)
  const fromApi = (input.apiExceptions ?? []).map(normalizeException)
  const fromCatalog = input.includeCatalog === false ? [] : EXCEPTION_CATALOG.map(normalizeException)

  const byId = new Map<string, OperationalException>()
  for (const row of [
    ...fromCatalog,
    ...fromAlerts,
    ...fromDefects,
    ...fromIncidents,
    ...fromDrivers,
    ...fromVehicles,
    ...fromYard,
    ...fromApi,
  ]) {
    byId.set(row.id, row)
  }

  return sortInbox([...byId.values()])
}

export type ExceptionOverlay = {
  status?: OperationalException['status']
  owner?: string | null
  escalated?: boolean
  notes?: OperationalException['notes']
}

/** Apply soft local workflow overlays (mock-first mutations). */
export function applyExceptionOverlays(
  rows: OperationalException[],
  overlays: Record<string, ExceptionOverlay>,
): OperationalException[] {
  return rows.map((row) => {
    const overlay = overlays[row.id]
    if (!overlay) return row
    return {
      ...row,
      status: overlay.status ?? row.status,
      owner: overlay.owner !== undefined ? overlay.owner : row.owner,
      escalated: overlay.escalated ?? row.escalated,
      notes: overlay.notes ?? row.notes,
      lastUpdate: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  })
}
