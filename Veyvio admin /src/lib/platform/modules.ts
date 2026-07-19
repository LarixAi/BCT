/**
 * Shared platform domain modules (canonical names from the Veyvio backend blueprint).
 * Command, Driver and Yard APIs project these domains under different authorisation.
 */
export const PLATFORM_MODULES = [
  'identity',
  'tenancy',
  'operations',
  'dispatch',
  'workforce',
  'fleet',
  'yard',
  'maintenance',
  'safety',
  'compliance',
  'customers',
  'passengers',
  'commercial',
  'communications',
  'reporting',
  'integrations',
  'audit',
] as const

export type PlatformModule = (typeof PLATFORM_MODULES)[number]

export type SourceApp = 'COMMAND' | 'DRIVER' | 'YARD' | 'MAINTENANCE' | 'SYSTEM'

/** Mandatory fields on almost every business record. */
export type PlatformRecordMeta = {
  id: string
  companyId: string
  createdAt: string
  createdBy: string | null
  updatedAt: string
  updatedBy: string | null
  version: number
  status: string
  sourceApp: SourceApp
  depotId?: string | null
  archivedAt?: string | null
  archivedBy?: string | null
  externalReference?: string | null
  clientGeneratedId?: string | null
  deviceId?: string | null
  occurredAt?: string | null
  receivedAt?: string | null
}

export const COMMAND_API_GROUPS = [
  '/auth',
  '/companies',
  '/users',
  '/roles',
  '/depots',
  '/customers',
  '/passengers',
  '/schools',
  '/contracts',
  '/pricing',
  '/bookings',
  '/recurring-plans',
  '/trips',
  '/runs',
  '/duties',
  '/dispatch',
  '/drivers',
  '/staff',
  '/vehicles',
  '/yard',
  '/equipment',
  '/vehicle-checks',
  '/defects',
  '/inspections',
  '/damage',
  '/maintenance',
  '/fleet-resources',
  '/incidents',
  '/safeguarding',
  '/compliance',
  '/messages',
  '/announcements',
  '/notifications',
  '/reports',
  '/reports/daily-operations',
  '/reports/exceptions',
  '/reports/on-time',
  '/reports/trip-completion',
  '/reports/driver-compliance',
  '/reports/working-time',
  '/reports/fleet-availability',
  '/reports/checks-defects',
  '/reports/vor-downtime',
  '/reports/maintenance-due',
  '/reports/incidents',
  '/reports/contract-performance',
  '/reports/yard-operations',
  '/reports/communications',
  '/reports/audit-activity',
  '/audit',
  '/integrations',
  '/files',
  '/sync',
] as const
