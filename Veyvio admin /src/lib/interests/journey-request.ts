import type { InterestDetail } from '@/lib/interests/types'

export type JourneyRequestFields = {
  service?: string
  journeyType?: string
  pickup?: string
  destination?: string
  travelDate?: string
  preferredPickupTime?: string
  returnTime?: string
  timeFlexibility?: string
  passengers?: string
  membershipStatus?: string
  passengerNumber?: string
  accessibility?: string
  wheelchairTravel?: string
  emergencyContact?: string
  notes?: string
  pickupCoords?: string
  destinationCoords?: string
}

const MESSAGE_FIELD_MAP: Array<{ key: keyof JourneyRequestFields; patterns: RegExp[] }> = [
  { key: 'service', patterns: [/^Service:\s*(.+?)\.?$/i] },
  { key: 'journeyType', patterns: [/^Journey type:\s*(.+?)\.?$/i] },
  { key: 'pickup', patterns: [/^Pickup:\s*(.+?)\.?$/i] },
  { key: 'destination', patterns: [/^Destination:\s*(.+?)\.?$/i] },
  { key: 'travelDate', patterns: [/^Travel date:\s*(.+?)\.?$/i] },
  { key: 'preferredPickupTime', patterns: [/^Preferred pickup time:\s*(.+?)\.?$/i] },
  { key: 'returnTime', patterns: [/^Preferred return time:\s*(.+?)\.?$/i] },
  { key: 'timeFlexibility', patterns: [/^Time flexibility:\s*(.+?)\.?$/i] },
  { key: 'passengers', patterns: [/^Passengers:\s*(.+?)\.?$/i] },
  { key: 'membershipStatus', patterns: [/^Membership status:\s*(.+?)\.?$/i] },
  {
    key: 'passengerNumber',
    patterns: [/^Passenger\s*\/\s*membership number:\s*(.+?)\.?$/i],
  },
  { key: 'accessibility', patterns: [/^Accessibility:\s*(.+?)\.?$/i] },
  { key: 'wheelchairTravel', patterns: [/^Wheelchair travel:\s*(.+?)\.?$/i] },
  { key: 'emergencyContact', patterns: [/^Emergency contact:\s*(.+?)\.?$/i] },
  { key: 'notes', patterns: [/^Notes:\s*(.+)$/i] },
  { key: 'pickupCoords', patterns: [/^Pickup coordinates:\s*(.+?)\.?$/i] },
  { key: 'destinationCoords', patterns: [/^Destination coordinates:\s*(.+?)\.?$/i] },
]

function asTrimmedString(value: unknown): string | undefined {
  if (value == null) return undefined
  const text = String(value).trim()
  return text || undefined
}

function parseJourneyFromMessage(message: string | null | undefined): JourneyRequestFields {
  const out: JourneyRequestFields = {}
  if (!message) return out

  for (const line of message.split(/\n+/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    for (const { key, patterns } of MESSAGE_FIELD_MAP) {
      if (out[key]) continue
      for (const pattern of patterns) {
        const match = trimmed.match(pattern)
        if (match?.[1]) {
          out[key] = match[1].trim()
          break
        }
      }
    }
  }
  return out
}

function parseJourneyFromRaw(raw: Record<string, unknown> | null | undefined): JourneyRequestFields {
  if (!raw || typeof raw !== 'object') return {}
  const journey = raw.journey
  if (!journey || typeof journey !== 'object') return {}
  const j = journey as Record<string, unknown>
  return {
    service: asTrimmedString(j.service),
    journeyType: asTrimmedString(j.journeyType ?? j.journey_type),
    pickup: asTrimmedString(j.pickup ?? j.pickupLabel ?? j.pickup_label),
    destination: asTrimmedString(j.destination ?? j.destinationLabel ?? j.destination_label),
    travelDate: asTrimmedString(j.travelDate ?? j.travel_date),
    preferredPickupTime: asTrimmedString(j.preferredPickupTime ?? j.preferred_time),
    returnTime: asTrimmedString(j.returnTime ?? j.return_time),
    timeFlexibility: asTrimmedString(j.timeFlexibility ?? j.flexible_time_label),
    passengers: asTrimmedString(j.passengers),
    membershipStatus: asTrimmedString(j.membershipStatus ?? j.membership_status),
    passengerNumber: asTrimmedString(j.passengerNumber ?? j.passenger_number),
    accessibility: asTrimmedString(
      Array.isArray(j.accessibility) ? j.accessibility.join('; ') : j.accessibility,
    ),
    wheelchairTravel: asTrimmedString(j.wheelchairTravel ?? j.wheelchair_mode),
    emergencyContact: asTrimmedString(j.emergencyContact ?? j.emergency_contact),
    notes: asTrimmedString(j.notes),
    pickupCoords: asTrimmedString(j.pickupCoords ?? j.pickup_coords),
    destinationCoords: asTrimmedString(j.destinationCoords ?? j.destination_coords),
  }
}

function mergeJourneyFields(...parts: JourneyRequestFields[]): JourneyRequestFields {
  const out: JourneyRequestFields = {}
  for (const part of parts) {
    for (const [key, value] of Object.entries(part) as Array<
      [keyof JourneyRequestFields, string | undefined]
    >) {
      if (!out[key] && value) out[key] = value
    }
  }
  return out
}

export function isJourneyInterest(data: Pick<InterestDetail, 'source' | 'sourceLabel' | 'message'>): boolean {
  const source = `${data.source ?? ''} ${data.sourceLabel ?? ''}`.toLowerCase()
  if (source.includes('journey')) return true
  return Boolean(data.message?.toLowerCase().includes('journey request'))
}

export function resolveJourneyRequest(data: InterestDetail): JourneyRequestFields | null {
  if (!isJourneyInterest(data)) return null

  const fromRaw = parseJourneyFromRaw(data.rawPayload)
  const fromMessage = parseJourneyFromMessage(data.message)
  const merged = mergeJourneyFields(fromRaw, fromMessage, {
    service: data.service ?? undefined,
    journeyType: data.journeyTypes?.[0],
    passengers:
      data.passengerCount != null ? String(data.passengerCount) : undefined,
  })

  const hasTripDetail = Boolean(
    merged.pickup ||
      merged.destination ||
      merged.travelDate ||
      merged.preferredPickupTime ||
      merged.returnTime ||
      merged.notes ||
      data.message,
  )
  return hasTripDetail ? merged : merged
}

export function displayValue(value: string | number | null | undefined): string | null {
  if (value == null) return null
  const text = String(value).trim()
  return text || null
}
