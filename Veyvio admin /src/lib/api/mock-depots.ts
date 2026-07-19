import { DEFAULT_DEPOT_CAPACITY, DEFAULT_DEPOT_FACILITIES } from '@/lib/depots/constants'
import { buildDepotOpsSnapshot } from '@/lib/depots/ops-snapshot'
import { deriveDepotReadiness } from '@/lib/depots/readiness'
import type {
  CreateDepotInput,
  DepotOpsSnapshot,
  DepotProfile,
  UpdateDepotInput,
} from '@/lib/depots/types'
import type { DutyRecord } from '@/lib/api/types'
import type { DriverProfile } from '@/lib/drivers/types'
import type { StaffProfile } from '@/lib/staff/types'
import type { VehicleProfile } from '@/lib/vehicles/types'

function now() {
  return new Date().toISOString()
}

function defaultEquipment(): DepotProfile['equipment'] {
  return [
    { id: 'eq-wheelchair', name: 'Wheelchairs', available: 8, assigned: 4, broken: 1 },
    { id: 'eq-steps', name: 'Passenger steps', available: 6, assigned: 2, broken: 0 },
    { id: 'eq-chargers', name: 'Battery chargers', available: 4, assigned: 1, broken: 0 },
    { id: 'eq-jump', name: 'Jump packs', available: 3, assigned: 0, broken: 0 },
    { id: 'eq-tyres', name: 'Spare tyres', available: 12, assigned: 0, broken: 2 },
    { id: 'eq-fuel-cards', name: 'Fuel cards', available: 20, assigned: 14, broken: 0 },
    { id: 'eq-radios', name: 'Radios', available: 15, assigned: 10, broken: 1 },
    { id: 'eq-keys', name: 'Spare keys', available: 30, assigned: 0, broken: 0 },
  ]
}

function defaultDocs(): DepotProfile['documents'] {
  return [
    { id: 'doc-site', label: 'Site plan', status: 'on_file', expiryDate: null },
    { id: 'doc-fire', label: 'Fire certificate', status: 'on_file', expiryDate: '2027-03-01' },
    { id: 'doc-insurance', label: 'Site insurance', status: 'on_file', expiryDate: '2026-12-01' },
    { id: 'doc-risk', label: 'Fire risk assessment', status: 'expiring_soon', expiryDate: '2026-08-15' },
    { id: 'doc-emergency', label: 'Emergency procedures', status: 'on_file', expiryDate: null },
  ]
}

type DepotProfileDraft = Omit<DepotProfile, 'readiness'>

function syncProfile(profile: DepotProfileDraft, snapshot?: DepotOpsSnapshot): DepotProfile {
  const readiness = deriveDepotReadiness(profile, snapshot)
  return { ...profile, readiness, updatedAt: now() }
}

let depotSeq = 3

let profiles: DepotProfile[] = [
  syncProfile({
    id: 'depot-wembley',
    name: 'Wembley Depot',
    code: 'WEM01',
    status: 'operational',
    address: 'Engineers Way, Wembley Park, London HA9 0AD',
    phone: '020 7946 0101',
    email: 'wembley@metrotransport.example',
    timezone: 'Europe/London',
    openingHours: { weekday: '05:00–23:00', saturday: '06:00–22:00', sunday: '07:00–21:00' },
    capacity: { ...DEFAULT_DEPOT_CAPACITY, vehicleCapacity: 140, parkingBays: 120, workshopBays: 6 },
    facilities: { ...DEFAULT_DEPOT_FACILITIES },
    contacts: {
      managerName: 'Priya Shah',
      assistantManagerName: 'Tom Reed',
      dispatchContact: 'Dispatch desk — ext 210',
      yardSupervisor: 'Marcus Cole',
      emergencyContact: 'Site security',
      emergencyPhone: '020 7946 0199',
    },
    latitude: 51.5636,
    longitude: -0.2796,
    equipment: defaultEquipment(),
    fuel: {
      dieselPercent: 62,
      adBluePercent: 48,
      petrolPercent: null,
      lastDeliveryAt: '2026-07-10T08:00:00.000Z',
      usageTodayLitres: 840,
      averageDailyLitres: 920,
    },
    security: {
      gateAccess: 'ANPR + fob — main gate 05:00–23:00',
      cctv: '24 cameras — retained 30 days',
      alarm: 'Monitored — Zone Control',
      keyHolders: ['Priya Shah', 'Marcus Cole', 'Night supervisor'],
      emergencyContacts: ['020 7946 0199', 'Met Police — 999'],
      visitorLogNote: 'All visitors sign in at gatehouse',
    },
    documents: defaultDocs(),
    complianceChecklist: [
      { id: 'c-insurance', label: 'Insurance on file', complete: true },
      { id: 'c-fire', label: 'Fire risk assessment', complete: true },
      { id: 'c-site', label: 'Site plan', complete: true },
      { id: 'c-emergency', label: 'Emergency procedures', complete: true },
      { id: 'c-env', label: 'Environmental permits', complete: false },
    ],
    createdAt: '2022-01-15T09:00:00.000Z',
    updatedAt: now(),
  }),
  syncProfile({
    id: 'depot-croydon',
    name: 'Croydon Depot',
    code: 'CRO01',
    status: 'maintenance_warning',
    address: 'Factory Lane, Croydon CR0 3RL',
    phone: '020 7946 0202',
    email: 'croydon@metrotransport.example',
    timezone: 'Europe/London',
    openingHours: { weekday: '05:30–22:30', saturday: '06:00–21:00', sunday: 'Closed' },
    capacity: { ...DEFAULT_DEPOT_CAPACITY, vehicleCapacity: 90, parkingBays: 70, workshopBays: 3, chargingPoints: 2 },
    facilities: {
      ...DEFAULT_DEPOT_FACILITIES,
      fuelPetrol: false,
      evCharging: false,
      accessControl: true,
    },
    contacts: {
      managerName: 'Helen Park',
      assistantManagerName: null,
      dispatchContact: 'Dispatch — Croydon',
      yardSupervisor: 'Dave Nguyen',
      emergencyContact: 'Helen Park',
      emergencyPhone: '020 7946 0299',
    },
    latitude: 51.3811,
    longitude: -0.1235,
    equipment: defaultEquipment().map((e) => ({ ...e, available: Math.max(1, e.available - 2) })),
    fuel: {
      dieselPercent: 18,
      adBluePercent: 35,
      petrolPercent: null,
      lastDeliveryAt: '2026-07-01T10:00:00.000Z',
      usageTodayLitres: 510,
      averageDailyLitres: 600,
    },
    security: {
      gateAccess: 'Manual barrier — staffed mornings',
      cctv: '12 cameras',
      alarm: 'Local alarm only',
      keyHolders: ['Helen Park', 'Dave Nguyen'],
      emergencyContacts: ['020 7946 0299'],
      visitorLogNote: 'Reception during office hours',
    },
    documents: defaultDocs().map((d) =>
      d.id === 'doc-fire' ? { ...d, status: 'expiring_soon' as const } : d,
    ),
    complianceChecklist: [
      { id: 'c-insurance', label: 'Insurance on file', complete: true },
      { id: 'c-fire', label: 'Fire risk assessment', complete: true },
      { id: 'c-site', label: 'Site plan', complete: true },
      { id: 'c-emergency', label: 'Emergency procedures', complete: false },
      { id: 'c-env', label: 'Environmental permits', complete: false },
    ],
    createdAt: '2021-06-01T09:00:00.000Z',
    updatedAt: now(),
  }),
  syncProfile({
    id: 'depot-park-royal',
    name: 'Park Royal Depot',
    code: 'PRK01',
    status: 'operational',
    address: 'Acton Lane, Park Royal, London NW10 7NY',
    phone: '020 7946 0303',
    email: 'parkroyal@metrotransport.example',
    timezone: 'Europe/London',
    openingHours: { weekday: '05:00–22:00', saturday: '06:00–20:00', sunday: '07:00–18:00' },
    capacity: { ...DEFAULT_DEPOT_CAPACITY, vehicleCapacity: 60, parkingBays: 50, workshopBays: 2, fuelPumps: 1 },
    facilities: {
      ...DEFAULT_DEPOT_FACILITIES,
      fuelDiesel: true,
      fuelAdBlue: false,
      vehicleWash: false,
    },
    contacts: {
      managerName: 'James Okonkwo',
      assistantManagerName: 'Sara Ali',
      dispatchContact: 'Central dispatch',
      yardSupervisor: 'Lee Carter',
      emergencyContact: 'James Okonkwo',
      emergencyPhone: '020 7946 0399',
    },
    latitude: 51.5285,
    longitude: -0.2668,
    equipment: defaultEquipment(),
    fuel: {
      dieselPercent: 71,
      adBluePercent: null,
      petrolPercent: null,
      lastDeliveryAt: '2026-07-12T07:30:00.000Z',
      usageTodayLitres: 320,
      averageDailyLitres: 400,
    },
    security: {
      gateAccess: 'Fob entry',
      cctv: '8 cameras',
      alarm: 'Monitored',
      keyHolders: ['James Okonkwo', 'Lee Carter'],
      emergencyContacts: ['020 7946 0399'],
      visitorLogNote: 'Sign in at office',
    },
    documents: defaultDocs(),
    complianceChecklist: [
      { id: 'c-insurance', label: 'Insurance on file', complete: true },
      { id: 'c-fire', label: 'Fire risk assessment', complete: true },
      { id: 'c-site', label: 'Site plan', complete: true },
      { id: 'c-emergency', label: 'Emergency procedures', complete: true },
      { id: 'c-env', label: 'Environmental permits', complete: true },
    ],
    createdAt: '2023-02-10T09:00:00.000Z',
    updatedAt: now(),
  }),
]

function enrich(profile: DepotProfile | DepotProfileDraft, snapshot?: DepotOpsSnapshot): DepotProfile {
  const { readiness: _r, ...rest } = profile as DepotProfile
  return syncProfile(rest, snapshot)
}

export const mockDepotsApi = {
  listRecords() {
    return profiles.map((p) => ({ id: p.id, name: p.name }))
  },

  listProfiles(): DepotProfile[] {
    return profiles.map((p) => enrich(p))
  },

  getProfile(id: string): DepotProfile | null {
    const p = profiles.find((d) => d.id === id)
    return p ? enrich(p) : null
  },

  opsSnapshot(
    id: string,
    ctx: {
      vehicles: VehicleProfile[]
      drivers: DriverProfile[]
      duties: DutyRecord[]
      staff?: StaffProfile[]
      defectsTodayCount?: number
    },
  ): DepotOpsSnapshot {
    const snapshot = buildDepotOpsSnapshot({ depotId: id, ...ctx })
    const idx = profiles.findIndex((p) => p.id === id)
    if (idx >= 0) {
      profiles[idx] = enrich(profiles[idx]!, snapshot)
    }
    return snapshot
  },

  create(input: CreateDepotInput): DepotProfile {
    depotSeq += 1
    const id = `depot-${depotSeq}`
    const created = enrich({
      id,
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      status: input.status ?? 'planned',
      address: input.address?.trim() || 'Address to be confirmed',
      phone: input.phone ?? null,
      email: input.email ?? null,
      timezone: input.timezone ?? 'Europe/London',
      openingHours: {
        weekday: input.openingHours?.weekday ?? '05:00–22:00',
        saturday: input.openingHours?.saturday ?? '06:00–20:00',
        sunday: input.openingHours?.sunday ?? 'Closed',
      },
      capacity: { ...DEFAULT_DEPOT_CAPACITY, ...input.capacity },
      facilities: { ...DEFAULT_DEPOT_FACILITIES, ...input.facilities },
      contacts: {
        managerName: input.contacts?.managerName ?? null,
        assistantManagerName: input.contacts?.assistantManagerName ?? null,
        dispatchContact: input.contacts?.dispatchContact ?? null,
        yardSupervisor: input.contacts?.yardSupervisor ?? null,
        emergencyContact: input.contacts?.emergencyContact ?? null,
        emergencyPhone: input.contacts?.emergencyPhone ?? null,
      },
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      equipment: defaultEquipment(),
      fuel: {
        dieselPercent: input.facilities?.fuelDiesel === false ? null : 50,
        adBluePercent: input.facilities?.fuelAdBlue === false ? null : 50,
        petrolPercent: input.facilities?.fuelPetrol ? 50 : null,
        lastDeliveryAt: null,
        usageTodayLitres: 0,
        averageDailyLitres: null,
      },
      security: {
        gateAccess: 'To be configured',
        cctv: input.facilities?.cctv ? 'Installed — configuration pending' : 'Not installed',
        alarm: 'To be configured',
        keyHolders: [],
        emergencyContacts: [],
        visitorLogNote: 'Configure visitor process',
      },
      documents: defaultDocs().map((d) => ({ ...d, status: 'missing' as const, expiryDate: null })),
      complianceChecklist: [
        { id: 'c-insurance', label: 'Insurance on file', complete: false },
        { id: 'c-fire', label: 'Fire risk assessment', complete: false },
        { id: 'c-site', label: 'Site plan', complete: false },
        { id: 'c-emergency', label: 'Emergency procedures', complete: false },
        { id: 'c-env', label: 'Environmental permits', complete: false },
      ],
      createdAt: now(),
      updatedAt: now(),
    })
    profiles = [...profiles, created]
    return created
  },

  update(id: string, input: UpdateDepotInput): DepotProfile {
    const idx = profiles.findIndex((p) => p.id === id)
    if (idx < 0) throw new Error('Depot not found')
    const current = profiles[idx]!
    const next = enrich({
      ...current,
      ...input,
      name: input.name?.trim() ?? current.name,
      code: input.code?.trim().toUpperCase() ?? current.code,
      address: input.address ?? current.address,
      capacity: input.capacity ? { ...current.capacity, ...input.capacity } : current.capacity,
      facilities: input.facilities ? { ...current.facilities, ...input.facilities } : current.facilities,
      contacts: input.contacts ? { ...current.contacts, ...input.contacts } : current.contacts,
      openingHours: input.openingHours ? { ...current.openingHours, ...input.openingHours } : current.openingHours,
      fuel: input.fuel ? { ...current.fuel, ...input.fuel } : current.fuel,
      security: input.security ? { ...current.security, ...input.security } : current.security,
      equipment: input.equipment ?? current.equipment,
      documents: input.documents ?? current.documents,
      complianceChecklist: input.complianceChecklist ?? current.complianceChecklist,
    })
    profiles[idx] = next
    return next
  },
}
