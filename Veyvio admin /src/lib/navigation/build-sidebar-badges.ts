import type { BookingListItem } from '@/lib/bookings/types'
import type { DriverDirectorySummary } from '@/lib/drivers/types'
import type { DutyRecord, MessageRecord } from '@/lib/api/types'
import type { MaintenanceHubData } from '@/lib/maintenance/types'
import { isOpenException } from '@/lib/exceptions/exception-filters'
import { runSummary } from '@/lib/ops/runs-trips-schedule'
import type { OperationalException } from '@/lib/types'
import type { OperationalTrip } from '@/lib/transfers/types'
import { flattenTripsToJobs } from '@/lib/operations/job-register'
import type { VehicleDirectorySummary } from '@/lib/vehicles/types'

export type SidebarBadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export type SidebarBadge = {
  count: number
  tone?: SidebarBadgeTone
}

/** Map keyed by nav href (including query), or item label for parent-only groups. */
export type SidebarBadgeMap = Record<string, SidebarBadge>

export type SidebarBadgeInput = {
  openExceptions?: OperationalException[] | null
  unreadNotifications?: number | null
  bookings?: BookingListItem[] | null
  duties?: DutyRecord[] | null
  trips?: OperationalTrip[] | null
  driversSummary?: DriverDirectorySummary | null
  vehiclesSummary?: VehicleDirectorySummary | null
  depotCount?: number | null
  maintenance?: MaintenanceHubData | null
  openDefects?: number | null
  openIncidents?: number | null
  unreadMessages?: number | null
  pendingLeaveRequests?: number | null
  attendanceAttention?: number | null
}

const BOOKING_ATTENTION = new Set([
  'draft',
  'quotation',
  'awaiting_approval',
  'awaiting_payment',
  'partially_scheduled',
])

function badge(count: number, tone?: SidebarBadgeTone): SidebarBadge | undefined {
  if (!Number.isFinite(count) || count <= 0) return undefined
  return tone ? { count, tone } : { count }
}

export function countUnreadMessages(messages: MessageRecord[] | null | undefined): number {
  if (!messages?.length) return 0
  return messages.filter((m) => !m.readAt).length
}

export function countBookingAttention(bookings: BookingListItem[] | null | undefined): number {
  if (!bookings?.length) return 0
  return bookings.filter(
    (b) => BOOKING_ATTENTION.has(b.status) || b.warningCount > 0 || b.schedulingStatus === 'unassigned',
  ).length
}

export function buildSidebarBadges(input: SidebarBadgeInput): SidebarBadgeMap {
  const map: SidebarBadgeMap = {}

  const openExceptions = (input.openExceptions ?? []).filter(isOpenException).length
  const put = (key: string, value: SidebarBadge | undefined) => {
    if (value) map[key] = value
  }

  put('/exceptions', badge(openExceptions, openExceptions > 0 ? 'danger' : undefined))
  put('/notifications', badge(input.unreadNotifications ?? 0, 'success'))

  put('/bookings', badge(countBookingAttention(input.bookings), 'warning'))

  const jobRows = flattenTripsToJobs(input.trips ?? [])
  put('/jobs', badge(jobRows.filter((j) => j.status === 'unstarted' || j.status === 'waiting').length, 'warning'))

  const runs = runSummary(input.duties ?? [])
  put('/dispatch', badge(runs.unassigned, 'warning'))

  const drivers = input.driversSummary
  if (drivers) {
    const driverAttention = drivers.notEligible + drivers.documentsExpiringSoon
    put('/drivers', badge(driverAttention > 0 ? driverAttention : drivers.totalActive, driverAttention > 0 ? 'warning' : 'neutral'))
  }

  const vehicles = input.vehiclesSummary
  if (vehicles) {
    const vehicleAttention = vehicles.attention + vehicles.vor
    put(
      '/vehicles',
      badge(vehicleAttention > 0 ? vehicleAttention : vehicles.totalActive, vehicleAttention > 0 ? 'warning' : 'neutral'),
    )
  }

  put('/depots', badge(input.depotCount ?? 0))

  const maint = input.maintenance?.summary.attention
  if (maint) {
    const maintAttention =
      maint.overdue + maint.vor + maint.safetyCriticalDefects + maint.awaitingParts
    put('/maintenance', badge(maintAttention, 'warning'))
  }

  put('/defects', badge(input.openDefects ?? 0, 'warning'))
  put('/incidents', badge(input.openIncidents ?? 0, 'danger'))
  put('/messages', badge(input.unreadMessages ?? 0, 'success'))

  put('/time-off', badge(input.pendingLeaveRequests ?? 0, 'warning'))
  put('/attendance', badge(input.attendanceAttention ?? 0, 'warning'))

  return map
}

export function applySidebarBadges<T extends { href?: string; label: string; badge?: number | string; badgeTone?: SidebarBadgeTone; children?: Array<{ href: string; label: string; badge?: number | string }> }>(
  items: T[],
  badges: SidebarBadgeMap,
): T[] {
  return items.map((item) => {
    const byHref = item.href ? badges[item.href] : undefined
    const byLabel = badges[item.label]
    const resolved = byHref ?? byLabel
    const children = item.children?.map((child) => {
      const childBadge = badges[child.href]
      return childBadge
        ? { ...child, badge: childBadge.count }
        : { ...child, badge: undefined }
    })
    return {
      ...item,
      badge: resolved?.count,
      badgeTone: resolved?.tone ?? item.badgeTone,
      children,
    }
  })
}
