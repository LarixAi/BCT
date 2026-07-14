import type { BookingType, DispatchMode } from '@/lib/bookings/types'

export const BOOKING_STEPS = [
  { id: 1, key: 'customer', label: 'Customer' },
  { id: 2, key: 'passengers', label: 'Passengers' },
  { id: 3, key: 'journey', label: 'Journey' },
  { id: 4, key: 'requirements', label: 'Requirements' },
  { id: 5, key: 'schedule', label: 'Schedule' },
  { id: 6, key: 'pricing', label: 'Pricing' },
  { id: 7, key: 'dispatch', label: 'Dispatch' },
  { id: 8, key: 'review', label: 'Review' },
] as const

export const BOOKING_TYPE_OPTIONS: { id: BookingType; label: string; description: string }[] = [
  { id: 'one_way', label: 'One-way journey', description: 'Single pickup to destination' },
  { id: 'return', label: 'Return journey', description: 'Outbound and return trips' },
  { id: 'multi_stop', label: 'Multi-stop journey', description: 'Several pickups or drop-offs' },
  { id: 'recurring', label: 'Recurring transport', description: 'Repeating pattern over a period' },
  { id: 'school', label: 'School transport', description: 'Term-time AM/PM school runs' },
  { id: 'contract', label: 'Contract transport', description: 'Under an active customer contract' },
  { id: 'group', label: 'Group transport', description: 'Multiple passengers, shared vehicle' },
  { id: 'accessible', label: 'Accessible transport', description: 'Wheelchair or mobility needs' },
  { id: 'staff', label: 'Staff transport', description: 'Employee or crew movement' },
  { id: 'replacement', label: 'Replacement / emergency', description: 'Urgent cover or breakdown replacement' },
]

export const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  individual: 'Individual',
  parent_guardian: 'Parent or guardian',
  school: 'School',
  local_authority: 'Local authority',
  nhs_care: 'NHS or care organisation',
  business: 'Business',
  broker: 'Transport broker',
  contract_client: 'Contract client',
}

export const DISPATCH_MODE_OPTIONS: { id: DispatchMode; label: string; description: string }[] = [
  { id: 'send_to_dispatch', label: 'Send to Dispatch', description: 'Confirmed but unassigned — dispatch schedules it' },
  { id: 'assign_now', label: 'Assign now', description: 'Select depot, driver, vehicle and run immediately' },
  { id: 'auto_plan', label: 'Auto-plan', description: 'Engine proposes assignment for dispatcher review' },
]

export const BOOKING_LIST_VIEWS = [
  { id: 'all', label: 'All bookings' },
  { id: 'draft', label: 'Drafts' },
  { id: 'quotation', label: 'Quotes' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'unscheduled', label: 'Unscheduled' },
  { id: 'recurring', label: 'Recurring' },
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
] as const
