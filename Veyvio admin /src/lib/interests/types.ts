export type InterestStatus =
  | 'new'
  | 'under_review'
  | 'assigned'
  | 'contact_attempted'
  | 'contacted'
  | 'qualified'
  | 'converted'
  | 'waiting_list'
  | 'closed'
  | 'spam'

export const INTEREST_STATUS_LABELS: Record<InterestStatus, string> = {
  new: 'New',
  under_review: 'Under Review',
  assigned: 'Assigned',
  contact_attempted: 'Contact Attempted',
  contacted: 'Contacted',
  qualified: 'Qualified',
  converted: 'Converted',
  waiting_list: 'Waiting List',
  closed: 'Closed',
  spam: 'Suspected spam',
}

export type InterestSummary = {
  newToday: number
  awaitingReview: number
  assigned: number
  contacted: number
  qualified: number
  converted: number
  closed: number
  spam: number
}

export type InterestListItem = {
  id: string
  reference: string
  status: InterestStatus
  source: string
  sourceLabel: string | null
  contactName: string
  contactEmail: string | null
  contactPhone: string | null
  postcode: string | null
  borough: string | null
  service: string | null
  journeyTypes: string[]
  wheelchairAccessibleVehicleRequired: boolean
  passengerCount: number | null
  marketingAccepted: boolean
  assignedToUserId: string | null
  assignedToName: string | null
  possibleDuplicate: boolean
  lastActivityAt: string
  createdAt: string
  updatedAt: string
}

export type InterestStaffNote = {
  id: string
  body: string
  createdAt: string
  createdBy: string
  createdByName: string
}

export type InterestActivityItem = {
  id: string
  action: string
  actorType: string | null
  actorId: string | null
  occurredAt: string
  reason: string | null
  afterSnapshot: Record<string, unknown> | null
  beforeSnapshot: Record<string, unknown> | null
  correlationId: string | null
}

export type InterestDetail = InterestListItem & {
  externalSubmissionId: string | null
  idempotencyKey: string | null
  integrationApiKeyId: string | null
  integrationLabel: string | null
  requestId: string
  preferredContactMethod: string | null
  message: string | null
  privacyAccepted: boolean
  privacyNoticeVersion: string | null
  consentAcceptedAt: string | null
  duplicateOfId: string | null
  rawPayload: Record<string, unknown>
  staffNotes: InterestStaffNote[]
  closedAt: string | null
  closedReason: string | null
  convertedBookingId?: string | null
  convertedTripId?: string | null
  rejectionNotifiedAt?: string | null
  activity: InterestActivityItem[]
}

export type InterestAcceptResult = {
  accepted: true
  alreadyConverted: boolean
  interestId: string
  reference: string
  bookingId: string | null
  bookingReference?: string
  tripId: string | null
  tripReference?: string
  serviceDate: string | null
  jobId?: string
  jobsPath: string
  interest?: InterestDetail
}

export type InterestRejectResult = {
  rejected: true
  interest: InterestDetail
  customerNotified: boolean
  notifyError: string | null
}

export type InterestListResponse = {
  summary: InterestSummary
  items: InterestListItem[]
}

export type InterestListParams = {
  status?: string
  source?: string
  assignedTo?: string
  service?: string
  borough?: string
  postcode?: string
  accessibility?: string
  marketing?: string
  from?: string
  to?: string
  q?: string
}

export type InterestPatchInput = {
  status?: InterestStatus
  assignedToUserId?: string | null
  note?: string
  closedReason?: string
}

export function activityLabel(action: string): string {
  switch (action) {
    case 'interest.received':
      return 'Submission received'
    case 'interest.viewed':
      return 'Record viewed'
    case 'interest.assigned':
      return 'Assignment updated'
    case 'interest.note_added':
      return 'Note added'
    case 'interest.contact_attempted':
      return 'Contact attempted'
    case 'interest.status_changed':
      return 'Status changed'
    case 'interest.converted':
      return 'Marked converted'
    case 'interest.accepted_as_job':
      return 'Accepted as job'
    case 'interest.rejected':
      return 'Request rejected'
    default:
      return action
  }
}
