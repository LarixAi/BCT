import type { JobSourceType } from '@/lib/operations/job-register'

export type PlanningJob = {
  jobId: string
  tripId: string
  tripReference: string
  reference: string
  passengerName: string
  pickupAddress: string
  dropoffAddress: string
  journey: string
  requiredTime: string
  sourceType: JobSourceType
  sourceLabel: string
  requirements: string[]
  priority: 'normal' | 'urgent'
  estimatedDurationMinutes: number
  status: string
  dutyId: string | null
  runReference: string | null
}

export type PlanningValidationLevel = 'compatible' | 'warning' | 'blocked'

export type PlanningValidationItem = {
  id: string
  level: PlanningValidationLevel
  title: string
  detail: string
}

export type PlanningAssignmentValidation = {
  level: PlanningValidationLevel
  items: PlanningValidationItem[]
  canAssign: boolean
  canPublish: boolean
}

export type PlanningTripSummary = {
  id: string
  reference: string
  dutyId: string | null
  runReference: string | null
  routeName: string | null
  driverName: string | null
  vehicleRegistration: string | null
  assignmentStatus: string
  status: string
  jobCount: number
  firstPickupTime: string | null
}
