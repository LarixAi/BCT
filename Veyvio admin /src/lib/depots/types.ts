/** Depot domain — operational headquarters for each location. */

export type DepotStatus = 'operational' | 'planned' | 'closed' | 'maintenance_warning'

export type DepotReadinessLevel = 'ready' | 'attention' | 'blocked'

export interface DepotCapacity {
  vehicleCapacity: number
  parkingBays: number
  workshopBays: number
  washBays: number
  chargingPoints: number
  fuelPumps: number
}

export interface DepotFacilities {
  fuelDiesel: boolean
  fuelPetrol: boolean
  fuelAdBlue: boolean
  evCharging: boolean
  vehicleWash: boolean
  cleaningArea: boolean
  inspectionLane: boolean
  secureParking: boolean
  cctv: boolean
  accessControl: boolean
}

export interface DepotContacts {
  managerName: string | null
  assistantManagerName: string | null
  dispatchContact: string | null
  yardSupervisor: string | null
  emergencyContact: string | null
  emergencyPhone: string | null
}

export interface DepotOpeningHours {
  weekday: string
  saturday: string
  sunday: string
}

export interface DepotEquipmentItem {
  id: string
  name: string
  available: number
  assigned: number
  broken: number
}

export interface DepotFuelLevels {
  dieselPercent: number | null
  adBluePercent: number | null
  petrolPercent: number | null
  lastDeliveryAt: string | null
  usageTodayLitres: number | null
  averageDailyLitres: number | null
}

export interface DepotSecurityInfo {
  gateAccess: string
  cctv: string
  alarm: string
  keyHolders: string[]
  emergencyContacts: string[]
  visitorLogNote: string
}

export interface DepotDocumentStub {
  id: string
  label: string
  status: 'on_file' | 'missing' | 'expiring_soon'
  expiryDate: string | null
}

export interface DepotReadiness {
  level: DepotReadinessLevel
  reasons: string[]
  calculatedAt: string
}

export interface DepotOpsSnapshot {
  depotId: string
  vehiclesAssigned: number
  vehiclesAvailable: number
  vehiclesOut: number
  vehiclesWorkshop: number
  vehiclesVor: number
  vehiclesOnSite: number
  driversTotal: number
  driversActive: number
  driversSick: number
  driversLeave: number
  yardStaffOnDuty: number
  runsToday: number
  runsCompleted: number
  runsRunning: number
  runsPending: number
  defectsToday: number
  checksOutstanding: number
  calculatedAt: string
}

export interface DepotProfile {
  id: string
  name: string
  code: string
  status: DepotStatus
  address: string
  phone: string | null
  email: string | null
  timezone: string
  openingHours: DepotOpeningHours
  capacity: DepotCapacity
  facilities: DepotFacilities
  contacts: DepotContacts
  latitude: number | null
  longitude: number | null
  equipment: DepotEquipmentItem[]
  fuel: DepotFuelLevels
  security: DepotSecurityInfo
  documents: DepotDocumentStub[]
  complianceChecklist: { id: string; label: string; complete: boolean }[]
  readiness: DepotReadiness
  createdAt: string
  updatedAt: string
}

export interface CreateDepotInput {
  name: string
  code: string
  address?: string
  phone?: string | null
  email?: string | null
  timezone?: string
  status?: DepotStatus
  capacity?: Partial<DepotCapacity>
  facilities?: Partial<DepotFacilities>
  contacts?: Partial<DepotContacts>
  openingHours?: Partial<DepotOpeningHours>
  latitude?: number | null
  longitude?: number | null
}

export interface UpdateDepotInput {
  name?: string
  code?: string
  address?: string
  phone?: string | null
  email?: string | null
  timezone?: string
  status?: DepotStatus
  capacity?: Partial<DepotCapacity>
  facilities?: Partial<DepotFacilities>
  contacts?: Partial<DepotContacts>
  openingHours?: Partial<DepotOpeningHours>
  latitude?: number | null
  longitude?: number | null
  equipment?: DepotEquipmentItem[]
  fuel?: Partial<DepotFuelLevels>
  security?: Partial<DepotSecurityInfo>
  documents?: DepotDocumentStub[]
  complianceChecklist?: DepotProfile['complianceChecklist']
}

export type DepotWizardStepId =
  | 'basic'
  | 'operations'
  | 'management'
  | 'assignment'
  | 'facilities'
  | 'compliance'
  | 'review'

export interface DepotCardSummary {
  profile: DepotProfile
  snapshot: DepotOpsSnapshot
}
