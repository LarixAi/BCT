export type SchoolRouteDirection = 'am' | 'pm' | 'both'

export type SchoolRouteStatus = 'draft' | 'published' | 'archived'

export interface SchoolRouteStop {
  id: string
  sequence: number
  pupilId: string
  pupilName: string
  type: 'pickup' | 'dropoff'
  address: string
  plannedTime: string
  serviceDurationMinutes: number
  handoverInstruction: string
  parentContact: string
  fixed: boolean
}

export interface SchoolRoutePupil {
  pupilId: string
  firstName: string
  lastName: string
  pickupAddress: string
  parentContact: string
  wheelchairRequired: boolean
  passengerAssistantRequired: boolean
  daysAttending: string[]
  directions: ('am' | 'pm')[]
  safeguardingNotes: string
}

export interface SchoolRouteTerm {
  academicYear: string
  termName: string
  startDate: string
  endDate: string
  operatingDays: string[]
  excludedDates: string[]
  insetDays: string[]
}

export interface SchoolRouteDirectionPattern {
  direction: 'am' | 'pm'
  depotDeparture: string
  requiredSchoolArrival: string
  schoolDeparture: string
  expectedDepotReturn: string
  maxRideTimeMinutes: number
  boardingAllowanceMinutes: number
  routeBufferMinutes: number
  stops: SchoolRouteStop[]
}

export interface SchoolRouteCrew {
  vehicleType: string
  seats: number
  wheelchairSpaces: number
  passengerAssistantRequired: boolean
  preferredDriverId: string | null
  preferredVehicleId: string | null
}

export interface SchoolRouteSafeguarding {
  collectWithoutAdult: boolean
  handoverRequired: boolean
  authorisedAdults: string
  collectionPassword: string
  noAdultPresentProcess: string
  restrictedContacts: string
  emergencyProcess: string
  confidentialDriverNotes: string
}

export interface SchoolRoute {
  id: string
  reference: string
  version: number
  versionId: string
  status: SchoolRouteStatus
  schoolId: string
  schoolName: string
  schoolAddress: string
  transportEntrance: string
  schoolContact: string
  schoolPhone: string
  openingTime: string
  startTime: string
  finishTime: string
  handoverProcedure: string
  closureContactProcess: string
  contractRef: string
  directionMode: SchoolRouteDirection
  term: SchoolRouteTerm
  pupils: SchoolRoutePupil[]
  patterns: SchoolRouteDirectionPattern[]
  crew: SchoolRouteCrew
  safeguarding: SchoolRouteSafeguarding
  currentStep: number
  warningCount: number
  nextServiceDate: string | null
  generatedJobCount: number
  jobIds: string[]
  createdAt: string
  updatedAt: string
}

export type SchoolRouteDraft = Omit<SchoolRoute, 'id' | 'reference' | 'version' | 'versionId' | 'createdAt' | 'updatedAt' | 'generatedJobCount' | 'jobIds' | 'nextServiceDate' | 'warningCount'> & {
  id?: string
  reference?: string
  version?: number
  versionId?: string
  generatedJobCount?: number
  jobIds?: string[]
  nextServiceDate?: string | null
  warningCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface SchoolRouteListItem {
  id: string
  reference: string
  schoolName: string
  directionLabel: string
  pupilCount: number
  daysLabel: string
  vehicleRequirement: string
  driverName: string | null
  assistantRequired: boolean
  nextService: string | null
  status: SchoolRouteStatus
  warningCount: number
}

export type GeneratedSchoolJob = {
  serviceDate: string
  direction: 'am' | 'pm'
  pupilId: string
  pupilName: string
  pickupAddress: string
  dropoffAddress: string
  plannedPickupTime: string
  wheelchairRequired: boolean
  escortRequired: boolean
  safeguardingFlag: boolean
}

export type SchoolRouteAttendanceRow = {
  id: string
  serviceDate: string
  direction: 'am' | 'pm'
  pupilName: string
  status: 'expected' | 'boarded' | 'absent' | 'no_show'
  note: string | null
}
