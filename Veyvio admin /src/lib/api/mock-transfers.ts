import type { DriverRecord, VehicleRecord } from './types'
import type { BookingRecord } from '@/lib/bookings/types'
import type {
  AssignmentHistoryEntry,
  CreateTransferInput,
  HandoverInput,
  JourneyRecord,
  OperationalJob,
  OperationalPosition,
  OperationalTrip,
  TransferCandidate,
  TransferImpactPreview,
  TransferRecord,
  TransferReportSummary,
  TransferValidationItem,
} from '@/lib/transfers/types'
import {
  calculateTransferImpact,
  rankTransferCandidates,
} from '@/lib/transfers/impact'
import {
  getJobsInScope,
  inferWorkflowType,
  validateTransfer,
  hasBlockingTransferErrors,
} from '@/lib/transfers/validation'

function job(tripId: string, partial: Omit<OperationalJob, 'tripId'>): OperationalJob {
  return { ...partial, tripId }
}

let operationalTrips: OperationalTrip[] = [
  {
    id: 'trip-1041',
    reference: 'TRP-1041',
    dutyId: 'duty-1',
    runReference: 'SCH-AM-104',
    status: 'in_progress',
    driverId: 'drv-1',
    driverName: 'Jane Smith',
    vehicleId: 'veh-1',
    vehicleRegistration: 'AB12 CDE',
    depotId: 'depot-wembley',
    depotName: 'Wembley Depot',
    dispatcherName: 'Maria Santos',
    assignmentStatus: 'acknowledged',
    acceptedAt: new Date(Date.now() - 90 * 60_000).toISOString(),
    acknowledgedAt: new Date(Date.now() - 85 * 60_000).toISOString(),
    manifestVersion: 3,
    lastAppSync: new Date(Date.now() - 2 * 60_000).toISOString(),
    delayMinutes: 25,
    passengersOnboard: 2,
    completedJobCount: 3,
    totalJobCount: 6,
    activeJobId: 'job-1041-4',
    routeName: 'Oakwood School AM',
    gpsLat: 51.552,
    gpsLng: -0.296,
    driverOnline: true,
    jobs: [
      job('trip-1041', { id: 'job-1041-1', sequence: 1, passengerId: 'pax-1', passengerName: 'Oliver Taylor', pickupAddress: '14 Maple Close', dropoffAddress: 'Oakwood Primary', plannedPickupTime: '07:40', status: 'completed', wheelchairRequired: false, escortRequired: false, safeguardingFlag: false }),
      job('trip-1041', { id: 'job-1041-2', sequence: 2, passengerId: 'pax-2', passengerName: 'Amelia Chen', pickupAddress: '8 Birch Avenue', dropoffAddress: 'Oakwood Primary', plannedPickupTime: '07:48', status: 'completed', wheelchairRequired: true, escortRequired: true, safeguardingFlag: false }),
      job('trip-1041', { id: 'job-1041-3', sequence: 3, passengerId: 'pax-5', passengerName: 'Noah Patel', pickupAddress: '22 Cedar Road', dropoffAddress: 'Oakwood Primary', plannedPickupTime: '07:55', status: 'completed', wheelchairRequired: false, escortRequired: false, safeguardingFlag: false }),
      job('trip-1041', { id: 'job-1041-4', sequence: 4, passengerId: 'pax-6', passengerName: 'Emily Watson', pickupAddress: '5 Elm Street', dropoffAddress: 'Oakwood Primary', plannedPickupTime: '08:02', status: 'onboard', wheelchairRequired: false, escortRequired: false, safeguardingFlag: true }),
      job('trip-1041', { id: 'job-1041-5', sequence: 5, passengerId: 'pax-7', passengerName: 'James Okonkwo', pickupAddress: '31 Pine Walk', dropoffAddress: 'Oakwood Primary', plannedPickupTime: '08:10', status: 'onboard', wheelchairRequired: false, escortRequired: false, safeguardingFlag: false }),
      job('trip-1041', { id: 'job-1041-6', sequence: 6, passengerId: 'pax-8', passengerName: 'Lily Murphy', pickupAddress: '19 Ash Grove', dropoffAddress: 'Oakwood Primary', plannedPickupTime: '08:18', status: 'unstarted', wheelchairRequired: false, escortRequired: false, safeguardingFlag: false }),
    ],
  },
  {
    id: 'trip-1058',
    reference: 'TRP-1058',
    dutyId: 'duty-2',
    runReference: 'DAY-024',
    status: 'assigned',
    driverId: 'drv-2',
    driverName: 'Michael Patel',
    vehicleId: 'veh-2',
    vehicleRegistration: 'GH56 HIJ',
    depotId: 'depot-wembley',
    depotName: 'Wembley Depot',
    dispatcherName: 'Daniel Okoro',
    assignmentStatus: 'accepted',
    acceptedAt: new Date(Date.now() - 30 * 60_000).toISOString(),
    acknowledgedAt: null,
    manifestVersion: 1,
    lastAppSync: new Date(Date.now() - 8 * 60_000).toISOString(),
    delayMinutes: 0,
    passengersOnboard: 0,
    completedJobCount: 0,
    totalJobCount: 3,
    activeJobId: null,
    routeName: 'Day Centre Run',
    gpsLat: 51.515,
    gpsLng: -0.142,
    driverOnline: true,
    jobs: [
      job('trip-1058', { id: 'job-1058-1', sequence: 1, passengerId: 'pax-3', passengerName: 'George Williams', pickupAddress: 'Riverside Day Centre', dropoffAddress: 'Community Hub', plannedPickupTime: '09:15', status: 'unstarted', wheelchairRequired: true, escortRequired: true, safeguardingFlag: true }),
      job('trip-1058', { id: 'job-1058-2', sequence: 2, passengerId: 'pax-9', passengerName: 'Margaret Hughes', pickupAddress: '12 Station Road', dropoffAddress: 'Community Hub', plannedPickupTime: '09:30', status: 'unstarted', wheelchairRequired: false, escortRequired: false, safeguardingFlag: false }),
      job('trip-1058', { id: 'job-1058-3', sequence: 3, passengerId: 'pax-10', passengerName: 'David Lee', pickupAddress: '44 Church Lane', dropoffAddress: 'Community Hub', plannedPickupTime: '09:45', status: 'unstarted', wheelchairRequired: false, escortRequired: false, safeguardingFlag: false }),
    ],
  },
  {
    id: 'trip-1072',
    reference: 'TRP-1072',
    dutyId: 'duty-3',
    runReference: 'SCH-PM-207',
    status: 'planned',
    driverId: null,
    driverName: null,
    vehicleId: null,
    vehicleRegistration: null,
    depotId: 'depot-wembley',
    depotName: 'Wembley Depot',
    dispatcherName: null,
    assignmentStatus: 'unassigned',
    acceptedAt: null,
    acknowledgedAt: null,
    manifestVersion: 0,
    lastAppSync: null,
    delayMinutes: 0,
    passengersOnboard: 0,
    completedJobCount: 0,
    totalJobCount: 4,
    activeJobId: null,
    routeName: 'School PM Return',
    gpsLat: null,
    gpsLng: null,
    driverOnline: false,
    jobs: [
      job('trip-1072', { id: 'job-1072-1', sequence: 1, passengerId: 'pax-1', passengerName: 'Oliver Taylor', pickupAddress: 'Oakwood Primary', dropoffAddress: '14 Maple Close', plannedPickupTime: '15:20', status: 'unstarted', wheelchairRequired: false, escortRequired: false, safeguardingFlag: false }),
      job('trip-1072', { id: 'job-1072-2', sequence: 2, passengerId: 'pax-2', passengerName: 'Amelia Chen', pickupAddress: 'Oakwood Primary', dropoffAddress: '8 Birch Avenue', plannedPickupTime: '15:35', status: 'unstarted', wheelchairRequired: true, escortRequired: true, safeguardingFlag: false }),
      job('trip-1072', { id: 'job-1072-3', sequence: 3, passengerId: 'pax-5', passengerName: 'Noah Patel', pickupAddress: 'Oakwood Primary', dropoffAddress: '22 Cedar Road', plannedPickupTime: '15:45', status: 'unstarted', wheelchairRequired: false, escortRequired: false, safeguardingFlag: false }),
      job('trip-1072', { id: 'job-1072-4', sequence: 4, passengerId: 'pax-6', passengerName: 'Emily Watson', pickupAddress: 'Oakwood Primary', dropoffAddress: '5 Elm Street', plannedPickupTime: '15:55', status: 'unstarted', wheelchairRequired: false, escortRequired: false, safeguardingFlag: true }),
    ],
  },
]

let transferRecords: TransferRecord[] = [
  {
    id: 'xfr-001',
    companyId: 'tenant-demo',
    depotId: 'depot-wembley',
    createdAt: new Date(Date.now() - 26 * 60_000).toISOString(),
    confirmedAt: new Date(Date.now() - 25 * 60_000).toISOString(),
    createdBy: 'Maria Santos',
    approvedBy: null,
    workflowType: 'live_transfer',
    scope: 'selected_jobs',
    status: 'transfer_completed',
    sourceTripId: 'trip-1041',
    destinationTripId: 'trip-1058',
    sourceJobIds: ['job-1041-6'],
    originalDriverId: 'drv-1',
    newDriverId: 'drv-2',
    originalVehicleId: 'veh-1',
    newVehicleId: 'veh-2',
    tripStatusAtTransfer: 'in_progress',
    passengersOnboardAtTransfer: 2,
    reasonCategory: 'operational_recovery',
    reasonCode: 'trip_late',
    adminNotes: null,
    overrideReason: null,
    impact: null,
    notifications: [
      { channel: 'driver_original', status: 'acknowledged', at: new Date(Date.now() - 24 * 60_000).toISOString() },
      { channel: 'driver_receiving', status: 'acknowledged', at: new Date(Date.now() - 23 * 60_000).toISOString() },
    ],
    handoverLocation: null,
    handoverAuthorisedBy: null,
  },
]

let assignmentHistory: AssignmentHistoryEntry[] = [
  {
    id: 'ah-001',
    tripId: 'trip-1041',
    dutyId: 'duty-1',
    changeType: 'Driver reassigned',
    fromDriverId: 'drv-4',
    fromDriverName: 'Robert Wilson',
    toDriverId: 'drv-1',
    toDriverName: 'Jane Smith',
    fromVehicleId: 'veh-3',
    fromVehicleRegistration: 'KL78 MNO',
    toVehicleId: 'veh-1',
    toVehicleRegistration: 'AB12 CDE',
    reason: 'Driver sickness',
    adminName: 'Maria Santos',
    at: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
    transferId: null,
    immutable: true,
  },
  {
    id: 'ah-002',
    tripId: 'trip-1041',
    dutyId: 'duty-1',
    changeType: 'Vehicle changed',
    fromDriverId: 'drv-1',
    fromDriverName: 'Jane Smith',
    toDriverId: 'drv-1',
    toDriverName: 'Jane Smith',
    fromVehicleId: 'veh-1',
    fromVehicleRegistration: 'WX21 FYV',
    toVehicleId: 'veh-1',
    toVehicleRegistration: 'AB12 CDE',
    reason: 'Accessibility requirement',
    adminName: 'Maria Santos',
    at: new Date(Date.now() - 2 * 60 * 60_000).toISOString(),
    transferId: null,
    immutable: true,
  },
]

function syncTripCounts(trip: OperationalTrip) {
  trip.totalJobCount = trip.jobs.length
  trip.completedJobCount = trip.jobs.filter((j) => j.status === 'completed').length
  trip.passengersOnboard = trip.jobs.filter((j) => j.status === 'onboard').length
  trip.activeJobId = trip.jobs.find((j) => j.status === 'onboard' || j.status === 'waiting')?.id ?? null
}

let journeys: JourneyRecord[] = []
let tripSeq = 2000

export const mockTransfersApi = {
  listTrips(params?: { dutyId?: string; status?: string }): OperationalTrip[] {
    let list = operationalTrips.map((t) => ({ ...t, jobs: [...t.jobs] }))
    if (params?.dutyId) list = list.filter((t) => t.dutyId === params.dutyId)
    if (params?.status) list = list.filter((t) => t.status === params.status)
    return list
  },

  getTrip(id: string): OperationalTrip {
    const t = operationalTrips.find((x) => x.id === id)
    if (!t) throw new Error('Operational trip not found')
    return { ...t, jobs: t.jobs.map((j) => ({ ...j })) }
  },

  /** Upsert a live/API trip into the mock store so journey-sequence can operate on it. */
  upsertTrip(trip: OperationalTrip): OperationalTrip {
    const normalized: OperationalTrip = {
      ...trip,
      jobs: (trip.jobs ?? []).map((j, i) => ({
        ...j,
        tripId: trip.id,
        sequence: j.sequence || i + 1,
      })),
    }
    syncTripCounts(normalized)
    const idx = operationalTrips.findIndex((t) => t.id === trip.id)
    if (idx >= 0) {
      operationalTrips = operationalTrips.map((t, i) => (i === idx ? normalized : t))
    } else {
      operationalTrips = [...operationalTrips, normalized]
    }
    return mockTransfersApi.getTrip(trip.id)
  },

  hasTrip(id: string): boolean {
    return operationalTrips.some((t) => t.id === id)
  },

  getPosition(tripId: string): OperationalPosition {
    const trip = mockTransfersApi.getTrip(tripId)
    return {
      trip,
      completedJobs: trip.jobs.filter((j) => j.status === 'completed'),
      activeJob: trip.jobs.find((j) => j.id === trip.activeJobId) ?? null,
      remainingJobs: trip.jobs.filter((j) => j.status === 'unstarted' || j.status === 'waiting'),
      onboardPassengers: trip.jobs.filter((j) => j.status === 'onboard'),
    }
  },

  getCandidates(tripId: string, drivers: DriverRecord[], vehicles: VehicleRecord[]): TransferCandidate[] {
    const trip = mockTransfersApi.getTrip(tripId)
    return rankTransferCandidates(trip, drivers, vehicles, trip.driverId)
  },

  validateTransferRequest(
    input: CreateTransferInput,
    drivers: DriverRecord[],
    vehicles: VehicleRecord[],
  ): { items: TransferValidationItem[]; workflowType: CreateTransferInput['workflowType'] } {
    const trip = mockTransfersApi.getTrip(input.sourceTripId)
    const jobsInScope = getJobsInScope(trip, input)
    const workflowType = input.workflowType ?? inferWorkflowType(trip, jobsInScope)
    const items = validateTransfer({
      trip,
      jobsInScope,
      drivers,
      vehicles,
      newDriverId: input.newDriverId,
      newVehicleId: input.newVehicleId,
      overrideWarnings: input.overrideWarnings,
    })
    return { items, workflowType }
  },

  previewImpact(
    input: CreateTransferInput,
    drivers: DriverRecord[],
    vehicles: VehicleRecord[],
  ): TransferImpactPreview {
    const trip = mockTransfersApi.getTrip(input.sourceTripId)
    const dest = input.destinationTripId ? mockTransfersApi.getTrip(input.destinationTripId) : null
    return calculateTransferImpact(trip, input, drivers, vehicles, dest)
  },

  commitTransfer(
    input: CreateTransferInput,
    actorName: string,
    drivers: DriverRecord[],
    vehicles: VehicleRecord[],
  ): TransferRecord {
    const tripIdx = operationalTrips.findIndex((t) => t.id === input.sourceTripId)
    if (tripIdx < 0) throw new Error('Source trip not found')
    const trip = operationalTrips[tripIdx]!
    const jobsInScope = getJobsInScope(trip, input)
    const validation = validateTransfer({
      trip,
      jobsInScope,
      drivers,
      vehicles,
      newDriverId: input.newDriverId,
      newVehicleId: input.newVehicleId,
      overrideWarnings: input.overrideWarnings,
    })
    if (hasBlockingTransferErrors(validation) && !input.overrideWarnings) {
      throw new Error(validation.find((v) => v.level === 'error')?.message ?? 'Transfer validation failed')
    }

    const workflowType = input.workflowType ?? inferWorkflowType(trip, jobsInScope)
    const impact = calculateTransferImpact(
      trip,
      input,
      drivers,
      vehicles,
      input.destinationTripId ? operationalTrips.find((t) => t.id === input.destinationTripId) : null,
    )

    const newDriver = input.newDriverId ? drivers.find((d) => d.id === input.newDriverId) : null
    const newVehicle = input.newVehicleId
      ? vehicles.find((v) => v.id === input.newVehicleId)
      : newDriver
        ? vehicles.find((v) => v.depotId === newDriver.depotId && v.status === 'in_service')
        : null

    const transferId = `xfr-${Date.now()}`
    const now = new Date().toISOString()

    if (input.scope === 'entire_trip' || input.scope === 'driver_and_vehicle') {
      if (newDriver) {
        trip.driverId = newDriver.id
        trip.driverName = `${newDriver.firstName} ${newDriver.lastName}`
      }
      if (newVehicle) {
        trip.vehicleId = newVehicle.id
        trip.vehicleRegistration = newVehicle.registrationNumber
      }
    }

    if (input.scope === 'driver_only' && newDriver) {
      trip.driverId = newDriver.id
      trip.driverName = `${newDriver.firstName} ${newDriver.lastName}`
    }

    if (input.scope === 'vehicle_only' && newVehicle) {
      trip.vehicleId = newVehicle.id
      trip.vehicleRegistration = newVehicle.registrationNumber
    }

    const hasOnboardMove = jobsInScope.some((j) => j.status === 'onboard')

    if (input.scope === 'selected_jobs' || input.scope === 'remaining_jobs') {
      const dest =
        input.destinationTripId
          ? operationalTrips.find((t) => t.id === input.destinationTripId)
          : null
      for (const j of jobsInScope) {
        const jobRef = trip.jobs.find((x) => x.id === j.id)
        if (!jobRef || jobRef.status === 'completed') continue
        jobRef.status = 'transferred'
        jobRef.transferIndicator = transferId
        if (dest) {
          dest.jobs.push({
            ...j,
            id: `${j.id}-moved-${Date.now().toString().slice(-4)}`,
            tripId: dest.id,
            status: j.status === 'onboard' ? 'onboard' : 'unstarted',
            assignedDriverId: newDriver?.id ?? null,
            assignedVehicleId: newVehicle?.id ?? null,
            transferIndicator: transferId,
          })
          syncTripCounts(dest)
        }
      }
      trip.delayMinutes = Math.max(0, trip.delayMinutes - 10)
    }

    if (input.scope === 'return_to_queue') {
      for (const j of jobsInScope) {
        const jobRef = trip.jobs.find((x) => x.id === j.id)
        if (jobRef && jobRef.status !== 'completed') {
          jobRef.status = 'transferred'
          jobRef.transferIndicator = transferId
        }
      }
    }

    syncTripCounts(trip)
    trip.manifestVersion += 1

    const record: TransferRecord = {
      id: transferId,
      companyId: 'tenant-demo',
      depotId: trip.depotId,
      createdAt: now,
      confirmedAt: now,
      createdBy: actorName,
      approvedBy: input.overrideWarnings ? actorName : null,
      workflowType,
      scope: input.scope,
      status: hasOnboardMove
        ? input.handoverLocation && input.handoverAuthorisedBy
          ? 'handover_completed'
          : 'handover_required'
        : workflowType === 'physical_handover'
          ? 'handover_required'
          : 'awaiting_acknowledgement',
      sourceTripId: trip.id,
      destinationTripId: input.destinationTripId ?? null,
      sourceJobIds: jobsInScope.map((j) => j.id),
      originalDriverId: trip.driverId,
      newDriverId: input.newDriverId ?? null,
      originalVehicleId: trip.vehicleId,
      newVehicleId: newVehicle?.id ?? input.newVehicleId ?? null,
      tripStatusAtTransfer: trip.status,
      passengersOnboardAtTransfer: trip.passengersOnboard,
      reasonCategory: input.reasonCategory,
      reasonCode: input.reasonCode,
      adminNotes: input.adminNotes ?? null,
      overrideReason: input.overrideReason ?? null,
      impact,
      notifications: [
        { channel: 'driver_original', status: 'sent', at: now },
        { channel: 'driver_receiving', status: newDriver ? 'delivered' : 'pending', at: now },
        { channel: 'passenger', status: 'pending', at: null },
      ],
      handoverLocation: input.handoverLocation ?? null,
      handoverAuthorisedBy: input.handoverAuthorisedBy ?? null,
    }

    transferRecords = [record, ...transferRecords]
    assignmentHistory = [
      {
        id: `ah-${Date.now()}`,
        tripId: trip.id,
        dutyId: trip.dutyId,
        changeType: hasOnboardMove
          ? `Handover — ${TRANSFER_SCOPE_LABEL[input.scope] ?? 'Transfer'}`
          : TRANSFER_SCOPE_LABEL[input.scope] ?? 'Transfer',
        fromDriverId: record.originalDriverId,
        fromDriverName: trip.driverName,
        toDriverId: record.newDriverId,
        toDriverName: newDriver ? `${newDriver.firstName} ${newDriver.lastName}` : null,
        fromVehicleId: record.originalVehicleId,
        fromVehicleRegistration: trip.vehicleRegistration,
        toVehicleId: record.newVehicleId,
        toVehicleRegistration: newVehicle?.registrationNumber ?? null,
        reason: input.reasonCode.replace(/_/g, ' '),
        adminName: actorName,
        at: now,
        transferId,
        immutable: true,
      },
      ...assignmentHistory,
    ]

    return record
  },

  listTransfers(tripId?: string): TransferRecord[] {
    if (!tripId) return [...transferRecords]
    return transferRecords.filter((t) => t.sourceTripId === tripId || t.destinationTripId === tripId)
  },

  getAssignmentHistory(tripId: string): AssignmentHistoryEntry[] {
    return assignmentHistory.filter((h) => h.tripId === tripId)
  },

  /** Apply journey-sequence reorder — bumps manifest and syncs counts. */
  applyJobReorder(tripId: string, jobs: OperationalJob[]): OperationalTrip {
    const idx = operationalTrips.findIndex((t) => t.id === tripId)
    if (idx < 0) throw new Error('Operational trip not found')
    const trip = operationalTrips[idx]!
    trip.jobs = jobs.map((j) => ({ ...j, tripId }))
    trip.manifestVersion += 1
    trip.lastAppSync = new Date().toISOString()
    syncTripCounts(trip)
    operationalTrips = [...operationalTrips]
    return mockTransfersApi.getTrip(tripId)
  },

  /** Move selected jobs from one operational trip onto another (or detach). */
  moveJobsBetweenTrips(input: {
    sourceTripId: string
    destinationTripId: string | null
    jobIds: string[]
    actorName: string
  }): { source: OperationalTrip; destination: OperationalTrip | null } {
    const sourceIdx = operationalTrips.findIndex((t) => t.id === input.sourceTripId)
    if (sourceIdx < 0) throw new Error('Source trip not found')
    const source = operationalTrips[sourceIdx]!
    const moving = source.jobs.filter((j) => input.jobIds.includes(j.id))
    if (!moving.length) throw new Error('No matching jobs to move')

    source.jobs = source.jobs.filter((j) => !input.jobIds.includes(j.id))
    source.jobs = source.jobs.map((j, i) => ({ ...j, sequence: i + 1 }))
    source.manifestVersion += 1
    syncTripCounts(source)

    let destination: OperationalTrip | null = null
    if (input.destinationTripId) {
      const destIdx = operationalTrips.findIndex((t) => t.id === input.destinationTripId)
      if (destIdx < 0) throw new Error('Destination trip not found')
      destination = operationalTrips[destIdx]!
      const startSeq = destination.jobs.length
      destination.jobs = [
        ...destination.jobs,
        ...moving.map((j, i) => ({
          ...j,
          tripId: destination!.id,
          sequence: startSeq + i + 1,
          transferIndicator: `Moved from ${source.reference}`,
          status: j.status === 'cancelled' ? j.status : ('unstarted' as const),
        })),
      ]
      destination.manifestVersion += 1
      syncTripCounts(destination)
    }

    operationalTrips = [...operationalTrips]
    assignmentHistory = [
      {
        id: `ah-move-${Date.now()}`,
        tripId: source.id,
        dutyId: source.dutyId,
        changeType: destination
          ? `Jobs moved to ${destination.reference}`
          : 'Jobs left unassigned',
        fromDriverId: source.driverId,
        fromDriverName: source.driverName,
        toDriverId: destination?.driverId ?? null,
        toDriverName: destination?.driverName ?? null,
        fromVehicleId: source.vehicleId,
        fromVehicleRegistration: source.vehicleRegistration,
        toVehicleId: destination?.vehicleId ?? null,
        toVehicleRegistration: destination?.vehicleRegistration ?? null,
        reason: moving.map((j) => j.passengerName).join(', '),
        adminName: input.actorName,
        at: new Date().toISOString(),
        transferId: null,
        immutable: true,
      },
      ...assignmentHistory,
    ]

    return {
      source: mockTransfersApi.getTrip(source.id),
      destination: destination ? mockTransfersApi.getTrip(destination.id) : null,
    }
  },

  createSplitTripFromJobs(input: {
    sourceTripId: string
    jobIds: string[]
    actorName: string
  }): OperationalTrip {
    const sourceIdx = operationalTrips.findIndex((t) => t.id === input.sourceTripId)
    if (sourceIdx < 0) throw new Error('Source trip not found')
    const source = operationalTrips[sourceIdx]!
    const moving = source.jobs.filter((j) => input.jobIds.includes(j.id))
    if (!moving.length) throw new Error('No matching jobs to split')

    tripSeq += 1
    const newId = `trip-${tripSeq}`
    const created: OperationalTrip = {
      ...source,
      id: newId,
      reference: `TRP-${tripSeq}`,
      runReference: `SPLIT-${tripSeq}`,
      status: 'planned',
      assignmentStatus: 'unassigned',
      driverId: null,
      driverName: null,
      vehicleId: null,
      vehicleRegistration: null,
      acceptedAt: null,
      acknowledgedAt: null,
      manifestVersion: 1,
      lastAppSync: null,
      delayMinutes: 0,
      passengersOnboard: 0,
      completedJobCount: 0,
      totalJobCount: moving.length,
      activeJobId: null,
      jobs: moving.map((j, i) => ({
        ...j,
        id: `${j.id}-split-${tripSeq}`,
        tripId: newId,
        sequence: i + 1,
        status: 'unstarted',
        transferIndicator: `Split from ${source.reference}`,
      })),
    }
    syncTripCounts(created)

    source.jobs = source.jobs
      .filter((j) => !input.jobIds.includes(j.id))
      .map((j, i) => ({ ...j, sequence: i + 1 }))
    source.manifestVersion += 1
    syncTripCounts(source)

    operationalTrips = [...operationalTrips, created]
    assignmentHistory = [
      {
        id: `ah-split-${Date.now()}`,
        tripId: source.id,
        dutyId: source.dutyId,
        changeType: `Trip split → ${created.reference}`,
        fromDriverId: source.driverId,
        fromDriverName: source.driverName,
        toDriverId: null,
        toDriverName: null,
        fromVehicleId: source.vehicleId,
        fromVehicleRegistration: source.vehicleRegistration,
        toVehicleId: null,
        toVehicleRegistration: null,
        reason: moving.map((j) => j.passengerName).join(', '),
        adminName: input.actorName,
        at: new Date().toISOString(),
        transferId: null,
        immutable: true,
      },
      ...assignmentHistory,
    ]
    return mockTransfersApi.getTrip(newId)
  },

  recordSequenceNotification(
    tripId: string,
    audiences: string[],
    actorName: string,
  ): void {
    const trip = operationalTrips.find((t) => t.id === tripId)
    if (!trip) return
    assignmentHistory = [
      {
        id: `ah-seq-${Date.now()}`,
        tripId,
        dutyId: trip.dutyId,
        changeType: 'Journey sequence reorganised',
        fromDriverId: trip.driverId,
        fromDriverName: trip.driverName,
        toDriverId: trip.driverId,
        toDriverName: trip.driverName,
        fromVehicleId: trip.vehicleId,
        fromVehicleRegistration: trip.vehicleRegistration,
        toVehicleId: trip.vehicleId,
        toVehicleRegistration: trip.vehicleRegistration,
        reason: audiences.length
          ? `Notifications: ${audiences.join(', ')}`
          : 'Saved without sending notifications',
        adminName: actorName,
        at: new Date().toISOString(),
        transferId: null,
        immutable: true,
      },
      ...assignmentHistory,
    ]
  },

  getTripsByBooking(bookingId: string): OperationalTrip[] {
    return operationalTrips
      .filter((t) => t.bookingId === bookingId)
      .map((t) => ({ ...t, jobs: t.jobs.map((j) => ({ ...j })) }))
  },

  getJourneysByBooking(bookingId: string): JourneyRecord[] {
    return journeys.filter((j) => j.bookingId === bookingId)
  },

  createFromBooking(
    booking: BookingRecord,
    dutyId: string,
    bookingTripId: string,
    opts?: {
      driverId?: string | null
      driverName?: string | null
      vehicleId?: string | null
      vehicleRegistration?: string | null
      depotId?: string | null
      depotName?: string | null
      runReference?: string | null
    },
  ): OperationalTrip {
    const bookingTrip = booking.trips.find((t) => t.id === bookingTripId) ?? booking.trips[0]
    if (!bookingTrip) throw new Error('Booking trip not found')

    const tripId = `trip-bkg-${++tripSeq}`
    const pickup = bookingTrip.stops.find((s) => s.type === 'pickup')
    const dropoff = bookingTrip.stops.find((s) => s.type === 'dropoff')

    const jobs: OperationalJob[] = booking.passengers.map((p, i) => {
      const journeyId = `jny-${tripId}-${p.passengerId}`
      journeys.push({
        id: journeyId,
        bookingId: booking.id,
        bookingTripId: bookingTrip.id,
        passengerId: p.passengerId,
        passengerName: `${p.firstName} ${p.lastName}`,
        origin: pickup?.address || pickup?.name || '',
        destination: dropoff?.address || dropoff?.name || '',
      })
      return job(tripId, {
        id: `job-${tripId}-${i}`,
        sequence: i + 1,
        journeyId,
        passengerId: p.passengerId,
        passengerName: `${p.firstName} ${p.lastName}`,
        pickupAddress: pickup?.address || pickup?.name || '',
        dropoffAddress: dropoff?.address || dropoff?.name || '',
        plannedPickupTime:
          bookingTrip.requestedPickupTime ?? bookingTrip.calculatedPickupTime ?? '08:00',
        status: 'unstarted',
        wheelchairRequired: p.requirements.some((r) => r.toLowerCase().includes('wheelchair')),
        escortRequired: p.requirements.some((r) => r.toLowerCase().includes('assistant')),
        safeguardingFlag: !!p.safeguardingFlag,
        assignedDriverId: opts?.driverId ?? null,
        assignedVehicleId: opts?.vehicleId ?? null,
      })
    })

    const newTrip: OperationalTrip = {
      id: tripId,
      reference: `TRP-${tripSeq}`,
      dutyId,
      runReference: opts?.runReference ?? dutyId,
      status: opts?.driverId ? 'assigned' : 'planned',
      driverId: opts?.driverId ?? null,
      driverName: opts?.driverName ?? null,
      vehicleId: opts?.vehicleId ?? null,
      vehicleRegistration: opts?.vehicleRegistration ?? null,
      depotId: opts?.depotId ?? null,
      depotName: opts?.depotName ?? null,
      assignmentStatus: opts?.driverId ? 'assigned' : 'unassigned',
      acceptedAt: null,
      acknowledgedAt: null,
      manifestVersion: 1,
      lastAppSync: null,
      delayMinutes: 0,
      passengersOnboard: 0,
      completedJobCount: 0,
      totalJobCount: jobs.length,
      activeJobId: null,
      routeName: `${booking.customerName ?? 'Booking'} — ${bookingTrip.label}`,
      gpsLat: null,
      gpsLng: null,
      driverOnline: false,
      jobs,
      bookingId: booking.id,
      bookingTripId: bookingTrip.id,
    }
    syncTripCounts(newTrip)
    operationalTrips = [newTrip, ...operationalTrips]
    return newTrip
  },

  commitHandover(
    input: HandoverInput,
    actorName: string,
    drivers: DriverRecord[],
    vehicles: VehicleRecord[],
  ): TransferRecord {
    const tripIdx = operationalTrips.findIndex((t) => t.id === input.tripId)
    if (tripIdx < 0) throw new Error('Trip not found')
    const trip = operationalTrips[tripIdx]!
    const receivingDriver = drivers.find((d) => d.id === input.receivingDriverId)
    const receivingVehicle = input.receivingVehicleId
      ? vehicles.find((v) => v.id === input.receivingVehicleId)
      : vehicles.find((v) => v.depotId === receivingDriver?.depotId && v.status === 'in_service')

    if (!receivingDriver) throw new Error('Receiving driver not found')
    if (!input.safeguardingConfirmed && trip.jobs.some((j) => input.passengerJobIds.includes(j.id) && j.safeguardingFlag)) {
      throw new Error('Safeguarding confirmation required')
    }

    const now = new Date().toISOString()
    const transferId = `xfr-ho-${Date.now()}`

    for (const jobId of input.passengerJobIds) {
      const j = trip.jobs.find((x) => x.id === jobId)
      if (j && j.status === 'onboard') {
        j.status = 'transferred'
        j.transferIndicator = transferId
      }
    }
    syncTripCounts(trip)

    const record: TransferRecord = {
      id: transferId,
      companyId: 'tenant-demo',
      depotId: trip.depotId,
      createdAt: now,
      confirmedAt: now,
      createdBy: actorName,
      approvedBy: actorName,
      workflowType: 'physical_handover',
      scope: 'remaining_jobs',
      status: 'handover_completed',
      sourceTripId: trip.id,
      destinationTripId: null,
      sourceJobIds: input.passengerJobIds,
      originalDriverId: trip.driverId,
      newDriverId: receivingDriver.id,
      originalVehicleId: trip.vehicleId,
      newVehicleId: receivingVehicle?.id ?? null,
      tripStatusAtTransfer: trip.status,
      passengersOnboardAtTransfer: input.passengerJobIds.length,
      reasonCategory: 'operational_recovery',
      reasonCode: 'rescue_assignment',
      adminNotes: input.notes ?? null,
      overrideReason: null,
      impact: null,
      notifications: [
        { channel: 'driver_original', status: 'acknowledged', at: now },
        { channel: 'driver_receiving', status: 'acknowledged', at: now },
        { channel: 'passenger', status: 'sent', at: now },
      ],
      handoverLocation: input.handoverLocation,
      handoverAuthorisedBy: input.authorisedBy,
    }

    transferRecords = [record, ...transferRecords]
    assignmentHistory = [
      {
        id: `ah-ho-${Date.now()}`,
        tripId: trip.id,
        dutyId: trip.dutyId,
        changeType: `Handover — ${input.workflow.replace(/_/g, ' ')}`,
        fromDriverId: trip.driverId,
        fromDriverName: trip.driverName,
        toDriverId: receivingDriver.id,
        toDriverName: `${receivingDriver.firstName} ${receivingDriver.lastName}`,
        fromVehicleId: trip.vehicleId,
        fromVehicleRegistration: trip.vehicleRegistration,
        toVehicleId: receivingVehicle?.id ?? null,
        toVehicleRegistration: receivingVehicle?.registrationNumber ?? null,
        reason: input.workflow,
        adminName: actorName,
        at: now,
        transferId,
        immutable: true,
      },
      ...assignmentHistory,
    ]

    return record
  },

  getTransferReport(periodFrom: string, periodTo: string): TransferReportSummary {
    const inPeriod = transferRecords.filter((t) => {
      const d = t.createdAt.slice(0, 10)
      return d >= periodFrom && d <= periodTo
    })

    const reasonCounts = new Map<string, number>()
    let driverCaused = 0
    let vehicleCaused = 0
    let lateRecovery = 0
    let managerOverrides = 0
    let passengersAffected = 0

    for (const t of inPeriod) {
      const label = t.reasonCode.replace(/_/g, ' ')
      reasonCounts.set(label, (reasonCounts.get(label) ?? 0) + 1)
      if (t.reasonCategory === 'driver_availability') driverCaused++
      if (t.reasonCategory === 'vehicle_problems') vehicleCaused++
      if (t.reasonCode === 'trip_late' || t.reasonCode === 'rescue_assignment') lateRecovery++
      if (t.approvedBy) managerOverrides++
      passengersAffected += t.sourceJobIds.length
    }

    const depotCounts = new Map<string, number>()
    for (const t of inPeriod) {
      const depot = t.depotId ?? 'unknown'
      depotCounts.set(depot, (depotCounts.get(depot) ?? 0) + 1)
    }

    return {
      periodFrom,
      periodTo,
      totalTransfers: inPeriod.length,
      byReason: [...reasonCounts.entries()].map(([reason, count]) => ({ reason, count })),
      byDepot: [...depotCounts.entries()].map(([depot, count]) => ({ depot, count })),
      driverCaused,
      vehicleCaused,
      lateRecovery,
      managerOverrides,
      avgRecoveryMinutes: 14,
      passengersAffected,
      recentTransfers: inPeriod.slice(0, 10),
    }
  },
}

const TRANSFER_SCOPE_LABEL: Partial<Record<CreateTransferInput['scope'], string>> = {
  entire_trip: 'Entire trip reassigned',
  selected_jobs: 'Jobs transferred',
  remaining_jobs: 'Remaining jobs transferred',
  driver_only: 'Driver changed',
  vehicle_only: 'Vehicle changed',
  driver_and_vehicle: 'Driver and vehicle changed',
  return_to_queue: 'Returned to queue',
}
