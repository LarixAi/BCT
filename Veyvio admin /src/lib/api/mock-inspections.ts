import { buildInspectionsHub } from '@/lib/inspections/aggregate'
import { createInspectionSeed } from '@/lib/inspections/seed'
import { canSignOffInspection, inspectionSignOffBlockers } from '@/lib/inspections/sign-off'
import type { InspectionRecord, InspectionType, InspectionsHubData } from '@/lib/inspections/types'
import { instantiatePmiChecklist, updateChecklistItem } from '@/lib/maintenance/pmi-checklist'
import type { UpdatePmiChecklistItemInput } from '@/lib/vehicles/types'
import { mockVehiclesApi } from './mock-vehicles'

let store = createInspectionSeed()
let seq = 100

function now() {
  return new Date().toISOString()
}

function hub(): InspectionsHubData {
  return buildInspectionsHub(store, mockVehiclesApi.list())
}

export const mockInspectionsApi = {
  hub,

  list(): InspectionRecord[] {
    return hub().register
  },

  get(id: string): InspectionRecord | null {
    return store.find((r) => r.id === id) ?? null
  },

  /** Thin legacy list for older consumers */
  legacyList() {
    return store.map((r) => ({
      id: r.id,
      vehicleRegistration: r.registrationNumber,
      vehicleId: r.vehicleId,
      inspectionType: r.inspectionType,
      dueDate: r.dueDate,
      status:
        r.status === 'signed_off'
          ? 'valid'
          : r.status === 'failed' || r.dueDate < new Date().toISOString().slice(0, 10)
            ? 'overdue'
            : r.status === 'scheduled' || r.status === 'due'
              ? 'due_soon'
              : r.status,
    }))
  },

  schedule(input: {
    vehicleId: string
    inspectionType: InspectionType
    dueDate: string
    bookedDate?: string | null
    provider?: string
    driverInstruction?: string | null
  }): InspectionRecord {
    const profile = mockVehiclesApi.get(input.vehicleId)
    if (!profile) throw new Error('Vehicle not found')
    const row: InspectionRecord = {
      id: `insp-${++seq}`,
      vehicleId: profile.id,
      registrationNumber: profile.registrationNumber,
      fleetNumber: profile.fleetNumber,
      vehicleType: profile.vehicleCategory,
      depot: profile.currentDepotName || profile.homeDepotName,
      inspectionType: input.inspectionType,
      intervalWeeks: profile.pmiInterval?.intervalWeeks ?? null,
      dueDate: input.dueDate,
      bookedDate: input.bookedDate ?? input.dueDate,
      odometer: profile.mileage,
      scheduledMileage: profile.nextMaintenanceMileage,
      provider: input.provider ?? 'Fleet Workshop',
      inspectorName: null,
      bookingStatus: 'booked',
      status: 'scheduled',
      outcome: 'pending',
      operationalStatus: profile.operationalStatus,
      previousInspectionDate: null,
      nextProjectedDate: input.dueDate,
      linkedDefects: [],
      linkedWorkOrders: [],
      checklist: input.inspectionType === 'safety_pmi' ? null : null,
      evidenceSummary: [],
      signedOffAt: null,
      signedOffBy: null,
      importFileName: null,
      driverInstruction: input.driverInstruction ?? null,
      createdAt: now(),
      updatedAt: now(),
    }
    store = [row, ...store]
    return row
  },

  start(id: string, actorName: string): InspectionRecord {
    const idx = store.findIndex((r) => r.id === id)
    if (idx < 0) throw new Error('Inspection not found')
    const current = store[idx]!
    const checklist =
      current.inspectionType === 'safety_pmi'
        ? current.checklist ?? instantiatePmiChecklist(undefined, now())
        : current.checklist
    if (checklist && !checklist.inspectorName) checklist.inspectorName = actorName
    const next: InspectionRecord = {
      ...current,
      status: 'in_progress',
      bookingStatus: 'in_progress',
      inspectorName: current.inspectorName ?? actorName,
      checklist,
      updatedAt: now(),
    }
    store = store.map((r, i) => (i === idx ? next : r))
    return next
  },

  updateChecklistItem(
    id: string,
    input: UpdatePmiChecklistItemInput,
    actorName: string,
  ): InspectionRecord {
    const idx = store.findIndex((r) => r.id === id)
    if (idx < 0) throw new Error('Inspection not found')
    const current = store[idx]!
    if (!current.checklist) throw new Error('Checklist not started — start the inspection first')
    const checklist = updateChecklistItem(current.checklist, input.templateItemId, {
      result: input.result,
      notes: input.notes,
      actorName,
      evidence:
        input.evidenceKind !== undefined ||
        input.evidenceNote !== undefined ||
        input.evidenceFileName !== undefined
          ? {
              kind: input.evidenceKind,
              note: input.evidenceNote,
              fileName: input.evidenceFileName,
            }
          : undefined,
    })
    if (input.inspectorName) checklist.inspectorName = input.inspectorName
    const next: InspectionRecord = { ...current, checklist, updatedAt: now() }
    store = store.map((r, i) => (i === idx ? next : r))
    return next
  },

  markAwaitingSignOff(id: string): InspectionRecord {
    const idx = store.findIndex((r) => r.id === id)
    if (idx < 0) throw new Error('Inspection not found')
    const current = store[idx]!
    const failed = current.checklist?.items.some((i) => i.result === 'fail')
    const next: InspectionRecord = {
      ...current,
      status: failed ? 'rectification_pending' : 'awaiting_sign_off',
      outcome: failed ? 'rectification_required' : 'pass',
      bookingStatus: 'complete',
      updatedAt: now(),
    }
    store = store.map((r, i) => (i === idx ? next : r))
    return next
  },

  signOff(id: string, actorName: string): InspectionRecord {
    const current = this.get(id)
    if (!current) throw new Error('Inspection not found')
    const blockers = inspectionSignOffBlockers(current)
    if (blockers.length > 0 || !canSignOffInspection(current)) {
      throw new Error(blockers[0] ?? 'Inspection cannot be signed off yet')
    }
    const next: InspectionRecord = {
      ...current,
      status: 'signed_off',
      outcome: current.outcome === 'pending' ? 'pass' : current.outcome,
      signedOffAt: now(),
      signedOffBy: actorName,
      bookingStatus: 'complete',
      updatedAt: now(),
    }
    store = store.map((r) => (r.id === id ? next : r))
    return next
  },

  importStub(input: {
    vehicleId: string
    inspectionType: InspectionType
    dueDate: string
    fileName: string
    outcome?: InspectionRecord['outcome']
  }): InspectionRecord {
    const profile = mockVehiclesApi.get(input.vehicleId)
    if (!profile) throw new Error('Vehicle not found')
    const row: InspectionRecord = {
      id: `insp-${++seq}`,
      vehicleId: profile.id,
      registrationNumber: profile.registrationNumber,
      fleetNumber: profile.fleetNumber,
      vehicleType: profile.vehicleCategory,
      depot: profile.currentDepotName || profile.homeDepotName,
      inspectionType: input.inspectionType,
      intervalWeeks: null,
      dueDate: input.dueDate,
      bookedDate: input.dueDate,
      odometer: profile.mileage,
      scheduledMileage: null,
      provider: 'Imported',
      inspectorName: null,
      bookingStatus: 'complete',
      status: 'awaiting_sign_off',
      outcome: input.outcome ?? 'incomplete',
      operationalStatus: profile.operationalStatus,
      previousInspectionDate: null,
      nextProjectedDate: null,
      linkedDefects: [],
      linkedWorkOrders: [],
      checklist: null,
      evidenceSummary: [`Imported PDF: ${input.fileName}`],
      signedOffAt: null,
      signedOffBy: null,
      importFileName: input.fileName,
      driverInstruction: null,
      createdAt: now(),
      updatedAt: now(),
    }
    store = [row, ...store]
    return row
  },

  reset() {
    store = createInspectionSeed()
    seq = 100
  },
}
