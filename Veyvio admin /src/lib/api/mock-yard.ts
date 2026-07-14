import { buildYardHub } from '@/lib/yard/aggregate'
import { YARD_TASK_TYPE_LABELS } from '@/lib/yard/constants'
import type {
  AcceptYardHandoverInput,
  CompleteYardTaskInput,
  CreateYardTaskInput,
  RecordYardMovementInput,
  YardAuditEvent,
  YardHandover,
  YardHubData,
  YardMovementRecord,
  YardTask,
} from '@/lib/yard/types'
import { mockVehiclesApi } from './mock-vehicles'

const DEPOTS = [
  { id: 'depot-wembley', name: 'Wembley Depot' },
  { id: 'depot-croydon', name: 'Croydon Depot' },
  { id: 'depot-park-royal', name: 'Park Royal Depot' },
]

const now = () => new Date().toISOString()
const daysAgo = (n: number) => new Date(Date.now() - n * 60 * 60 * 1000).toISOString()
const hoursFromNow = (n: number) => new Date(Date.now() + n * 60 * 60 * 1000).toISOString()

function seedTasks(): YardTask[] {
  return [
    {
      id: 'yt-1',
      depotId: 'depot-wembley',
      vehicleId: 'veh-4',
      registrationNumber: 'CD34 EFG',
      taskType: 'return_inspection',
      title: 'Complete return inspection',
      priority: 'important',
      status: 'in_progress',
      assignedStaffId: 'staff-2',
      assignedStaffName: 'Michael Brown',
      dueAt: hoursFromNow(2),
      instructions: 'Check bodywork damage reported on return from Run 402',
      evidenceRequired: true,
      blockingRelease: true,
      syncStatus: 'synced',
      createdAt: daysAgo(1),
      completedAt: null,
      createdBy: 'Sarah James',
    },
    {
      id: 'yt-2',
      depotId: 'depot-wembley',
      vehicleId: 'veh-6',
      registrationNumber: 'EO71 NTJ',
      taskType: 'return_inspection',
      title: 'Start yard return check',
      priority: 'urgent',
      status: 'open',
      assignedStaffId: null,
      assignedStaffName: null,
      dueAt: hoursFromNow(1),
      instructions: 'Vehicle returned 42 minutes ago — inspection not started',
      evidenceRequired: true,
      blockingRelease: true,
      syncStatus: 'synced',
      createdAt: daysAgo(0.7),
      completedAt: null,
      createdBy: 'System',
    },
    {
      id: 'yt-3',
      depotId: 'depot-croydon',
      vehicleId: 'veh-5',
      registrationNumber: 'MN90 PQR',
      taskType: 'refuel',
      title: 'Refuel vehicle',
      priority: 'routine',
      status: 'in_progress',
      assignedStaffId: 'staff-5',
      assignedStaffName: 'Alice Brown',
      dueAt: hoursFromNow(0.5),
      instructions: 'Fill to 90% — departure 07:10',
      evidenceRequired: false,
      blockingRelease: false,
      syncStatus: 'pending',
      createdAt: daysAgo(0.5),
      completedAt: null,
      createdBy: 'Alice Brown',
    },
    {
      id: 'yt-4',
      depotId: 'depot-croydon',
      vehicleId: 'veh-3',
      registrationNumber: 'KL78 MNO',
      taskType: 'clean_interior',
      title: 'Clean vehicle interior',
      priority: 'routine',
      status: 'assigned',
      assignedStaffId: 'staff-5',
      assignedStaffName: 'Alice Brown',
      dueAt: hoursFromNow(4),
      instructions: null,
      evidenceRequired: false,
      blockingRelease: false,
      syncStatus: 'synced',
      createdAt: daysAgo(2),
      completedAt: null,
      createdBy: 'Sarah James',
    },
    {
      id: 'yt-5',
      depotId: 'depot-wembley',
      vehicleId: 'veh-1',
      registrationNumber: 'BX21 ABC',
      taskType: 'prepare_for_service',
      title: 'Prepare for 06:30 departure',
      priority: 'important',
      status: 'assigned',
      assignedStaffId: 'staff-2',
      assignedStaffName: 'Marcus Reid',
      dueAt: hoursFromNow(6),
      instructions: 'Confirm wheelchair restraints and first aid kit',
      evidenceRequired: true,
      blockingRelease: true,
      syncStatus: 'synced',
      createdAt: daysAgo(0.2),
      completedAt: null,
      createdBy: 'Sarah James',
    },
  ]
}

function seedMovements(): YardMovementRecord[] {
  return [
    {
      id: 'ym-1',
      vehicleId: 'veh-4',
      registrationNumber: 'CD34 EFG',
      fromLocation: 'Return inspection zone',
      toLocation: 'Workshop W2',
      reason: 'Workshop transfer',
      status: 'completed',
      requestedBy: 'Sarah James',
      completedBy: 'Michael Brown',
      startedAt: daysAgo(4),
      completedAt: daysAgo(3.5),
      depotId: 'depot-wembley',
      depotName: 'Wembley Depot',
    },
    {
      id: 'ym-2',
      vehicleId: 'veh-5',
      registrationNumber: 'MN90 PQR',
      fromLocation: 'Coach 1',
      toLocation: 'Fuel station',
      reason: 'Fuelling',
      status: 'in_progress',
      requestedBy: 'Alice Brown',
      completedBy: null,
      startedAt: daysAgo(0.5),
      completedAt: null,
      depotId: 'depot-croydon',
      depotName: 'Croydon Depot',
    },
    {
      id: 'ym-3',
      vehicleId: 'veh-3',
      registrationNumber: 'KL78 MNO',
      fromLocation: 'Entrance',
      toLocation: 'Bay 2',
      reason: 'Vehicle entered yard',
      status: 'completed',
      requestedBy: 'System',
      completedBy: 'Yard app',
      startedAt: daysAgo(6),
      completedAt: daysAgo(5.8),
      depotId: 'depot-croydon',
      depotName: 'Croydon Depot',
    },
  ]
}

function seedAudit(): YardAuditEvent[] {
  return [
    {
      id: 'ya-1',
      action: 'VEHICLE_ARRIVED_AT_DEPOT',
      vehicleId: 'veh-5',
      registrationNumber: 'MN90 PQR',
      actorName: 'System',
      source: 'geofence',
      occurredAt: daysAgo(8),
      detail: 'Geofence entry — Croydon Depot',
    },
    {
      id: 'ya-2',
      action: 'VEHICLE_LOCATION_CHANGED',
      vehicleId: 'veh-4',
      registrationNumber: 'CD34 EFG',
      actorName: 'Michael Brown',
      source: 'yard',
      occurredAt: daysAgo(3.5),
      detail: 'Moved to Workshop W2',
    },
    {
      id: 'ya-3',
      action: 'VEHICLE_MARKED_VOR',
      vehicleId: 'veh-4',
      registrationNumber: 'CD34 EFG',
      actorName: 'Tom Harris',
      source: 'yard',
      occurredAt: daysAgo(1),
      detail: 'Brake defect — dangerous',
    },
    {
      id: 'ya-4',
      action: 'YARD_TASK_CREATED',
      vehicleId: 'veh-6',
      registrationNumber: 'EO71 NTJ',
      actorName: 'System',
      source: 'command',
      occurredAt: daysAgo(0.7),
      detail: 'Return inspection task auto-created on arrival',
    },
  ]
}

let movements = seedMovements()
let auditEvents = seedAudit()
let tasks = seedTasks()
let handovers: Record<string, YardHandover> = {}

function hub(depotId = 'depot-wembley'): YardHubData {
  const handover = handovers[depotId] ?? null
  return buildYardHub(mockVehiclesApi.list(), movements, auditEvents, tasks, handover, DEPOTS, depotId)
}

function addAudit(event: Omit<YardAuditEvent, 'id'>) {
  auditEvents = [{ ...event, id: `ya-${Date.now()}` }, ...auditEvents]
}

export const mockYardApi = {
  hub,

  depots() {
    return DEPOTS
  },

  recordMovement(input: RecordYardMovementInput, actorName: string): YardHubData {
    const vehicle = mockVehiclesApi.get(input.vehicleId)
    if (!vehicle) throw new Error('Vehicle not found')

    const fromLocation = vehicle.parkingBay ?? vehicle.currentLocationLabel ?? 'Unknown'
    const toLocation = input.destinationBay

    mockVehiclesApi.yardCheckInOut(
      vehicle.id,
      { action: 'check_in', parkingBay: input.destinationBay, notes: input.reason },
      actorName,
    )

    const record: YardMovementRecord = {
      id: `ym-${Date.now()}`,
      vehicleId: vehicle.id,
      registrationNumber: vehicle.registrationNumber,
      fromLocation,
      toLocation,
      reason: input.reason,
      status: 'completed',
      requestedBy: actorName,
      completedBy: actorName,
      startedAt: now(),
      completedAt: now(),
      depotId: vehicle.currentDepotId,
      depotName: vehicle.currentDepotName,
    }
    movements = [record, ...movements]

    addAudit({
      action: 'VEHICLE_LOCATION_CHANGED',
      vehicleId: vehicle.id,
      registrationNumber: vehicle.registrationNumber,
      actorName,
      source: 'command',
      occurredAt: now(),
      detail: `${fromLocation} → ${toLocation} (${input.reason})`,
    })

    return hub(vehicle.currentDepotId)
  },

  createTask(input: CreateYardTaskInput, actorName: string): YardHubData {
    const vehicle = mockVehiclesApi.get(input.vehicleId)
    if (!vehicle) throw new Error('Vehicle not found')

    const task: YardTask = {
      id: `yt-${Date.now()}`,
      depotId: vehicle.currentDepotId,
      vehicleId: vehicle.id,
      registrationNumber: vehicle.registrationNumber,
      taskType: input.taskType,
      title: input.title ?? YARD_TASK_TYPE_LABELS[input.taskType],
      priority: input.priority ?? 'routine',
      status: input.assignedStaffName ? 'assigned' : 'open',
      assignedStaffId: null,
      assignedStaffName: input.assignedStaffName ?? null,
      dueAt: input.dueAt ?? null,
      instructions: input.instructions ?? null,
      evidenceRequired: input.evidenceRequired ?? false,
      blockingRelease: input.blockingRelease ?? false,
      syncStatus: 'synced',
      createdAt: now(),
      completedAt: null,
      createdBy: actorName,
    }
    tasks = [task, ...tasks]

    addAudit({
      action: 'YARD_TASK_CREATED',
      vehicleId: vehicle.id,
      registrationNumber: vehicle.registrationNumber,
      actorName,
      source: 'command',
      occurredAt: now(),
      detail: task.title,
    })

    return hub(vehicle.currentDepotId)
  },

  completeTask(input: CompleteYardTaskInput, actorName: string): YardHubData {
    const task = tasks.find((t) => t.id === input.taskId)
    if (!task) throw new Error('Task not found')

    tasks = tasks.map((t) =>
      t.id === input.taskId
        ? { ...t, status: 'completed' as const, completedAt: now(), syncStatus: 'synced' as const }
        : t,
    )

    addAudit({
      action: 'YARD_TASK_COMPLETED',
      vehicleId: task.vehicleId,
      registrationNumber: task.registrationNumber,
      actorName,
      source: 'command',
      occurredAt: now(),
      detail: input.notes ?? task.title,
    })

    return hub(task.depotId)
  },

  startTask(taskId: string, actorName: string): YardHubData {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) throw new Error('Task not found')

    tasks = tasks.map((t) =>
      t.id === taskId ? { ...t, status: 'in_progress' as const, assignedStaffName: t.assignedStaffName ?? actorName } : t,
    )

    addAudit({
      action: 'YARD_TASK_ASSIGNED',
      vehicleId: task.vehicleId,
      registrationNumber: task.registrationNumber,
      actorName,
      source: 'yard',
      occurredAt: now(),
      detail: `Started: ${task.title}`,
    })

    return hub(task.depotId)
  },

  submitHandover(depotId: string, notes: string, actorName: string): YardHubData {
    const current = hub(depotId).handover!
    handovers[depotId] = {
      ...current,
      status: 'awaiting_acceptance',
      notes,
      outgoingSupervisor: actorName,
    }

    addAudit({
      action: 'SHIFT_HANDOVER_SUBMITTED',
      vehicleId: null,
      registrationNumber: null,
      actorName,
      source: 'command',
      occurredAt: now(),
      detail: `${current.depotName} — ${current.shiftLabel}`,
    })

    return hub(depotId)
  },

  acceptHandover(input: AcceptYardHandoverInput): YardHubData {
    const depotId = input.handoverId.replace(/^yh-/, '')
    const existing = handovers[depotId] ?? hub(depotId).handover!

    handovers[depotId] = {
      ...existing,
      status: 'accepted',
      incomingSupervisor: input.incomingSupervisor,
      notes: input.notes ?? existing.notes,
      acceptedAt: now(),
      acceptedBy: input.incomingSupervisor,
    }

    addAudit({
      action: 'SHIFT_HANDOVER_ACCEPTED',
      vehicleId: null,
      registrationNumber: null,
      actorName: input.incomingSupervisor,
      source: 'command',
      occurredAt: now(),
      detail: existing.depotName,
    })

    return hub(depotId)
  },
}
