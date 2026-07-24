export const DIAL_A_RIDE_STEPS = [
  { id: 1, key: 'member', label: 'Member' },
  { id: 2, key: 'journey', label: 'Journey' },
  { id: 3, key: 'schedule', label: 'Date & time' },
  { id: 4, key: 'requirements', label: 'Requirements' },
  { id: 5, key: 'checks', label: 'Service checks' },
  { id: 6, key: 'review', label: 'Review' },
] as const

export const DIAL_A_RIDE_TABS = [
  { id: 'requests', label: 'Requests' },
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'recurring', label: 'Recurring' },
  { id: 'members', label: 'Members' },
  { id: 'cancelled', label: 'Cancelled' },
] as const

export const SERVICE_ZONES = ['North Brent', 'South Brent', 'Wembley Central', 'Kingsbury'] as const

export const JOURNEY_PURPOSE_OPTIONS = [
  { id: 'medical', label: 'Medical appointment' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'social', label: 'Social visit' },
  { id: 'day_centre', label: 'Day centre' },
  { id: 'other', label: 'Other' },
] as const
