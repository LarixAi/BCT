/**
 * Pure Register Interest validation / mapping (no Supabase).
 * Unit-tested from scripts/interest-submissions.unit.mjs.
 */

export const INTEREST_STATUSES = [
  'new',
  'under_review',
  'assigned',
  'contact_attempted',
  'contacted',
  'qualified',
  'converted',
  'waiting_list',
  'closed',
  'spam',
] as const

export type InterestStatus = (typeof INTEREST_STATUSES)[number]

export const INTEREST_CREATE_SCOPE = 'interests:create' as const

/** Scopes an integration key may be granted. Staff Command access stays JWT-only. */
export const ALLOWED_INTEGRATION_SCOPES = new Set([
  'read',
  INTEREST_CREATE_SCOPE,
])

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

export type InterestContactInput = {
  name?: string
  email?: string
  phone?: string
  preferredContactMethod?: string
}

export type InterestLocationInput = {
  postcode?: string
  borough?: string
}

export type InterestDetailInput = {
  service?: string
  journeyTypes?: string[]
  wheelchairAccessibleVehicleRequired?: boolean
  passengerCount?: number
  message?: string
}

export type InterestConsentInput = {
  privacyAccepted?: boolean
  marketingAccepted?: boolean
  privacyNoticeVersion?: string
  acceptedAt?: string
}

export type InterestSubmissionInput = {
  source?: string
  sourceLabel?: string
  externalSubmissionId?: string
  contact?: InterestContactInput
  location?: InterestLocationInput
  interest?: InterestDetailInput
  consent?: InterestConsentInput
}

export type ParsedInterestSubmission = {
  source: string
  sourceLabel: string | null
  externalSubmissionId: string | null
  contactName: string
  contactEmail: string | null
  contactPhone: string | null
  preferredContactMethod: string | null
  postcode: string | null
  borough: string | null
  service: string | null
  journeyTypes: string[]
  wheelchairAccessibleVehicleRequired: boolean
  passengerCount: number | null
  message: string | null
  privacyAccepted: true
  marketingAccepted: boolean
  privacyNoticeVersion: string | null
  consentAcceptedAt: string | null
}

export type InterestValidationResult =
  | { ok: true; value: ParsedInterestSubmission }
  | { ok: false; message: string; code: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SOURCE_RE = /^[a-z0-9][a-z0-9._-]{1,63}$/

function trimOrNull(value: unknown, max = 500): string | null {
  if (value == null) return null
  const text = String(value).trim()
  if (!text) return null
  return text.slice(0, max)
}

function normalizeSource(value: unknown): string | null {
  const raw = trimOrNull(value, 64)
  if (!raw) return null
  const normalized = raw.toLowerCase()
  if (!SOURCE_RE.test(normalized)) return null
  return normalized
}

function sourceLabelFromSource(source: string): string {
  return source
    .split(/[-_.]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function isInterestStatus(value: unknown): value is InterestStatus {
  return typeof value === 'string' && (INTEREST_STATUSES as readonly string[]).includes(value)
}

export function validateInterestSubmission(input: InterestSubmissionInput): InterestValidationResult {
  const source = normalizeSource(input.source)
  if (!source) {
    return { ok: false, message: 'source is required (e.g. coloop-website)', code: 'invalid_source' }
  }

  const contact = input.contact ?? {}
  const contactName = trimOrNull(contact.name, 200)
  if (!contactName) {
    return { ok: false, message: 'contact.name is required', code: 'invalid_contact' }
  }

  const contactEmail = trimOrNull(contact.email, 320)
  const contactPhone = trimOrNull(contact.phone, 40)
  if (!contactEmail && !contactPhone) {
    return {
      ok: false,
      message: 'Provide contact.email or contact.phone',
      code: 'invalid_contact',
    }
  }
  if (contactEmail && !EMAIL_RE.test(contactEmail)) {
    return { ok: false, message: 'contact.email is not valid', code: 'invalid_email' }
  }

  const consent = input.consent ?? {}
  if (consent.privacyAccepted !== true) {
    return {
      ok: false,
      message: 'consent.privacyAccepted must be true',
      code: 'privacy_required',
    }
  }

  const location = input.location ?? {}
  const interest = input.interest ?? {}
  const journeyTypes = Array.isArray(interest.journeyTypes)
    ? interest.journeyTypes.map((item) => String(item).trim()).filter(Boolean).slice(0, 20)
    : []

  let passengerCount: number | null = null
  if (interest.passengerCount != null && interest.passengerCount !== undefined) {
    const n = Number(interest.passengerCount)
    if (!Number.isInteger(n) || n < 1 || n > 50) {
      return {
        ok: false,
        message: 'interest.passengerCount must be an integer from 1 to 50',
        code: 'invalid_passenger_count',
      }
    }
    passengerCount = n
  }

  const consentAcceptedAt = trimOrNull(consent.acceptedAt, 40)
  if (consentAcceptedAt && Number.isNaN(Date.parse(consentAcceptedAt))) {
    return {
      ok: false,
      message: 'consent.acceptedAt must be an ISO-8601 timestamp',
      code: 'invalid_consent_time',
    }
  }

  return {
    ok: true,
    value: {
      source,
      sourceLabel: trimOrNull(input.sourceLabel, 120) ?? sourceLabelFromSource(source),
      externalSubmissionId: trimOrNull(input.externalSubmissionId, 120),
      contactName,
      contactEmail: contactEmail ? contactEmail.toLowerCase() : null,
      contactPhone,
      preferredContactMethod: trimOrNull(contact.preferredContactMethod, 40),
      postcode: trimOrNull(location.postcode, 16),
      borough: trimOrNull(location.borough, 80),
      service: trimOrNull(interest.service, 80),
      journeyTypes,
      wheelchairAccessibleVehicleRequired: interest.wheelchairAccessibleVehicleRequired === true,
      passengerCount,
      message: trimOrNull(interest.message, 4000),
      privacyAccepted: true,
      marketingAccepted: consent.marketingAccepted === true,
      privacyNoticeVersion: trimOrNull(consent.privacyNoticeVersion, 40),
      consentAcceptedAt,
    },
  }
}

export function makeRequestId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(3))
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
  return `REQ-${hex}`
}

/** Status dashboard buckets for the Incoming Interests page. */
export function summariseInterestStatuses(
  rows: Array<{ status: string; createdAt: string }>,
  now = new Date(),
): Record<string, number> {
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const summary: Record<string, number> = {
    newToday: 0,
    awaitingReview: 0,
    assigned: 0,
    contacted: 0,
    qualified: 0,
    converted: 0,
    closed: 0,
    spam: 0,
  }

  for (const row of rows) {
    const created = Date.parse(row.createdAt)
    if (!Number.isNaN(created) && created >= startOfDay.getTime() && row.status === 'new') {
      summary.newToday += 1
    }
    switch (row.status) {
      case 'new':
      case 'under_review':
        summary.awaitingReview += 1
        break
      case 'assigned':
      case 'contact_attempted':
        summary.assigned += 1
        break
      case 'contacted':
        summary.contacted += 1
        break
      case 'qualified':
      case 'waiting_list':
        summary.qualified += 1
        break
      case 'converted':
        summary.converted += 1
        break
      case 'closed':
        summary.closed += 1
        break
      case 'spam':
        summary.spam += 1
        break
      default:
        break
    }
  }

  return summary
}

export function normalizeInterestPath(path: string): string {
  const p = path.replace(/^\/+|\/+$/g, '')
  if (p.startsWith('v1/')) return p.slice(3)
  return p
}

/** Integration intake (API-key auth). Staff JWT routes are not public. */
export function isInterestIntakePath(path: string, method: string): boolean {
  if (method !== 'POST') return false
  const p = normalizeInterestPath(path)
  return p === 'interests'
}

export type InterestJourneyPlan = {
  pickup: string
  destination: string
  travelDate: string
  preferredPickupTime: string | null
  returnTime: string | null
  service: string | null
  journeyType: string | null
  passengers: number
  wheelchairRequired: boolean
  notes: string | null
  pickupPostcode: string | null
}

function asText(value: unknown): string | null {
  if (value == null) return null
  const text = String(value).trim()
  return text || null
}

function parseMessageField(message: string | null | undefined, label: string): string | null {
  if (!message) return null
  const re = new RegExp(`^${label}:\\s*(.+?)\\.?$`, 'im')
  const match = message.match(re)
  return match?.[1]?.trim() || null
}

function normalizeTravelDate(value: string | null): string | null {
  if (!value) return null
  const iso = value.match(/^(\d{4}-\d{2}-\d{2})/)
  if (iso) return iso[1]
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return null
  return new Date(parsed).toISOString().slice(0, 10)
}

function normalizeClock(value: string | null): string | null {
  if (!value) return null
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/)
  if (!match) return null
  const hh = String(Math.min(23, Number(match[1]))).padStart(2, '0')
  const mm = String(Math.min(59, Number(match[2]))).padStart(2, '0')
  return `${hh}:${mm}`
}

function splitContactName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: 'Passenger', lastName: 'Unknown' }
  if (parts.length === 1) return { firstName: parts[0]!, lastName: 'Customer' }
  return { firstName: parts[0]!, lastName: parts.slice(1).join(' ') }
}

export function splitInterestContactName(fullName: string): { firstName: string; lastName: string } {
  return splitContactName(fullName)
}

/**
 * Build an operational trip plan from an interest row (raw_payload.journey + message + columns).
 */
export function planInterestJourney(row: {
  source?: string | null
  source_label?: string | null
  service?: string | null
  journey_types?: string[] | null
  passenger_count?: number | null
  wheelchair_accessible_vehicle_required?: boolean | null
  postcode?: string | null
  message?: string | null
  raw_payload?: Record<string, unknown> | null
}): InterestJourneyPlan | null {
  const source = `${row.source ?? ''} ${row.source_label ?? ''}`.toLowerCase()
  const message = asText(row.message)
  const isJourney =
    source.includes('journey') || Boolean(message?.toLowerCase().includes('journey request'))
  if (!isJourney) return null

  const rawJourney =
    row.raw_payload && typeof row.raw_payload === 'object' && row.raw_payload.journey
      ? (row.raw_payload.journey as Record<string, unknown>)
      : {}

  const pickup =
    asText(rawJourney.pickup) ||
    asText(rawJourney.pickupLabel) ||
    parseMessageField(message, 'Pickup')
  const destination =
    asText(rawJourney.destination) ||
    asText(rawJourney.destinationLabel) ||
    parseMessageField(message, 'Destination')
  if (!pickup || !destination) return null

  const travelDate =
    normalizeTravelDate(asText(rawJourney.travelDate) || asText(rawJourney.travel_date)) ||
    normalizeTravelDate(parseMessageField(message, 'Travel date')) ||
    new Date().toISOString().slice(0, 10)

  const preferredPickupTime =
    normalizeClock(
      asText(rawJourney.preferredPickupTime) || asText(rawJourney.preferred_time),
    ) || normalizeClock(parseMessageField(message, 'Preferred pickup time'))

  const returnTime =
    normalizeClock(asText(rawJourney.returnTime) || asText(rawJourney.return_time)) ||
    normalizeClock(parseMessageField(message, 'Preferred return time'))

  const passengersRaw =
    asText(rawJourney.passengers) ||
    parseMessageField(message, 'Passengers') ||
    (row.passenger_count != null ? String(row.passenger_count) : null)
  let passengers = 1
  if (passengersRaw) {
    if (passengersRaw.includes('+')) passengers = 5
    else {
      const n = Number(passengersRaw)
      if (Number.isInteger(n) && n >= 1 && n <= 50) passengers = n
    }
  }

  const postcodeMatch = pickup.match(/\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i)

  return {
    pickup,
    destination,
    travelDate,
    preferredPickupTime,
    returnTime,
    service:
      asText(rawJourney.service) ||
      asText(row.service) ||
      parseMessageField(message, 'Service'),
    journeyType:
      asText(rawJourney.journeyType) ||
      asText(rawJourney.journey_type) ||
      (Array.isArray(row.journey_types) && row.journey_types[0]
        ? String(row.journey_types[0])
        : null) ||
      parseMessageField(message, 'Journey type'),
    passengers,
    wheelchairRequired: row.wheelchair_accessible_vehicle_required === true,
    notes:
      asText(rawJourney.notes) ||
      parseMessageField(message, 'Notes') ||
      message,
    pickupPostcode: asText(row.postcode) || (postcodeMatch?.[1]?.toUpperCase() ?? null),
  }
}

export function plannedPickupIso(serviceDate: string, clock: string | null): string {
  const time = clock ?? '09:00'
  return `${serviceDate}T${time}:00.000Z`
}

