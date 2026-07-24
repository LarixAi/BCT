import type { SchoolRouteDraft, SchoolRouteDirectionPattern, SchoolRoutePupil } from './types'

const uid = () => `tmp-${Math.random().toString(36).slice(2, 9)}`

export function defaultTerm() {
  const start = new Date()
  const end = new Date()
  end.setMonth(end.getMonth() + 4)
  return {
    academicYear: `${start.getFullYear()}/${end.getFullYear()}`,
    termName: 'Summer term',
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    operatingDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    excludedDates: [] as string[],
    insetDays: [] as string[],
  }
}

export function defaultPattern(direction: 'am' | 'pm'): SchoolRouteDirectionPattern {
  return {
    direction,
    depotDeparture: direction === 'am' ? '07:15' : '15:00',
    requiredSchoolArrival: direction === 'am' ? '08:30' : '16:00',
    schoolDeparture: direction === 'am' ? '08:35' : '15:20',
    expectedDepotReturn: direction === 'am' ? '09:15' : '16:45',
    maxRideTimeMinutes: 45,
    boardingAllowanceMinutes: 5,
    routeBufferMinutes: 10,
    stops: [],
  }
}

export function createDefaultSchoolRoute(): SchoolRouteDraft {
  return {
    status: 'draft',
    schoolId: '',
    schoolName: '',
    schoolAddress: '',
    transportEntrance: 'Main pupil entrance',
    schoolContact: '',
    schoolPhone: '',
    openingTime: '08:00',
    startTime: '08:45',
    finishTime: '15:15',
    handoverProcedure: '',
    closureContactProcess: '',
    contractRef: '',
    directionMode: 'am',
    term: defaultTerm(),
    pupils: [],
    patterns: [defaultPattern('am')],
    crew: {
      vehicleType: 'minibus',
      seats: 16,
      wheelchairSpaces: 1,
      passengerAssistantRequired: false,
      preferredDriverId: null,
      preferredVehicleId: null,
    },
    safeguarding: {
      collectWithoutAdult: false,
      handoverRequired: true,
      authorisedAdults: '',
      collectionPassword: '',
      noAdultPresentProcess: 'Contact school transport desk and follow safeguarding escalation.',
      restrictedContacts: '',
      emergencyProcess: 'Call school emergency line and duty manager.',
      confidentialDriverNotes: '',
    },
    currentStep: 1,
  }
}

export function schoolRouteReference(seq: number) {
  return `SCH-RT-${String(seq).padStart(4, '0')}`
}

export function pupilFromPassenger(p: {
  id: string
  firstName: string
  lastName: string
  needsWheelchair?: boolean
  safeguardingFlag?: boolean
}): SchoolRoutePupil {
  return {
    pupilId: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    pickupAddress: '',
    parentContact: '',
    wheelchairRequired: !!p.needsWheelchair,
    passengerAssistantRequired: false,
    daysAttending: ['mon', 'tue', 'wed', 'thu', 'fri'],
    directions: ['am'],
    safeguardingNotes: p.safeguardingFlag ? 'Safeguarding plan on file' : '',
  }
}

export function syncPatternsForDirectionMode(
  directionMode: SchoolRouteDraft['directionMode'],
  patterns: SchoolRouteDirectionPattern[],
): SchoolRouteDirectionPattern[] {
  const am = patterns.find((p) => p.direction === 'am') ?? defaultPattern('am')
  const pm = patterns.find((p) => p.direction === 'pm') ?? defaultPattern('pm')
  if (directionMode === 'both') return [am, pm]
  if (directionMode === 'pm') return [pm]
  return [am]
}

export function buildStopsFromPupils(
  pupils: SchoolRoutePupil[],
  pattern: SchoolRouteDirectionPattern,
  schoolAddress: string,
): SchoolRouteDirectionPattern['stops'] {
  const active = pupils.filter((p) => p.directions.includes(pattern.direction))
  const pickups = active.map((p, index) => ({
    id: uid(),
    sequence: index + 1,
    pupilId: p.pupilId,
    pupilName: `${p.firstName} ${p.lastName}`,
    type: 'pickup' as const,
    address: p.pickupAddress || 'Home address TBC',
    plannedTime: pattern.depotDeparture,
    serviceDurationMinutes: 3,
    handoverInstruction: '',
    parentContact: p.parentContact,
    fixed: false,
  }))
  const dropoff = {
    id: uid(),
    sequence: pickups.length + 1,
    pupilId: '',
    pupilName: 'School',
    type: 'dropoff' as const,
    address: schoolAddress || 'School',
    plannedTime: pattern.requiredSchoolArrival,
    serviceDurationMinutes: 5,
    handoverInstruction: 'School handover',
    parentContact: '',
    fixed: true,
  }
  if (pattern.direction === 'pm') {
    return [
      {
        ...dropoff,
        type: 'pickup',
        pupilName: 'School',
        plannedTime: pattern.schoolDeparture,
        sequence: 1,
      },
      ...pickups.map((s, i) => ({
        ...s,
        type: 'dropoff' as const,
        sequence: i + 2,
        plannedTime: pattern.expectedDepotReturn,
      })),
    ]
  }
  return [...pickups, dropoff]
}
