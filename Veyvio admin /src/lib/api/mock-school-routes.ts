import type { DutyDetailRecord } from './types'
import type {
  SchoolRoute,
  SchoolRouteAttendanceRow,
  SchoolRouteDraft,
  SchoolRouteListItem,
} from '@/lib/school-routes/types'
import {
  buildStopsFromPupils,
  createDefaultSchoolRoute,
  schoolRouteReference,
  syncPatternsForDirectionMode,
} from '@/lib/school-routes/defaults'
import { buildRollingSchoolJobs, countJobsToGenerate, serviceDatesInWindow } from '@/lib/school-routes/job-generation'
import { mockTransfersApi } from './mock-transfers'

let routeSeq = 100

const routes = new Map<string, SchoolRoute>()

function seedRoutes() {
  if (routes.size > 0) return
  const draft = createDefaultSchoolRoute()
  const route: SchoolRoute = {
    ...draft,
    id: 'sch-route-1',
    reference: 'SCH-RT-1001',
    version: 1,
    versionId: 'sch-route-1-v1',
    schoolId: 'sch-1',
    schoolName: 'Oakwood Primary School',
    schoolAddress: 'Oakwood Rd, London NW10',
    schoolContact: 'Sarah Mitchell',
    schoolPhone: '020 8123 4567',
    contractRef: 'CON-OAK-2526',
    directionMode: 'am',
    pupils: [
      {
        pupilId: 'pax-1',
        firstName: 'Oliver',
        lastName: 'Taylor',
        pickupAddress: '14 Maple Close',
        parentContact: 'Mrs Taylor 07700 900001',
        wheelchairRequired: false,
        passengerAssistantRequired: false,
        daysAttending: ['mon', 'tue', 'wed', 'thu', 'fri'],
        directions: ['am'],
        safeguardingNotes: '',
      },
      {
        pupilId: 'pax-2',
        firstName: 'Amelia',
        lastName: 'Chen',
        pickupAddress: '8 Birch Avenue',
        parentContact: 'Mr Chen 07700 900002',
        wheelchairRequired: true,
        passengerAssistantRequired: true,
        daysAttending: ['mon', 'tue', 'wed', 'thu', 'fri'],
        directions: ['am'],
        safeguardingNotes: '',
      },
    ],
    patterns: syncPatternsForDirectionMode('am', draft.patterns).map((p) => ({
      ...p,
      stops: [],
    })),
    status: 'draft',
    warningCount: 1,
    nextServiceDate: null,
    generatedJobCount: 0,
    jobIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentStep: 8,
  }
  route.patterns = route.patterns.map((p) => ({
    ...p,
    stops: buildStopsFromPupils(route.pupils, p, route.schoolAddress),
  }))
  routes.set(route.id, route)
}

seedRoutes()

function normalizeDraft(draft: SchoolRouteDraft): SchoolRoute {
  const now = new Date().toISOString()
  const id = draft.id ?? `sch-route-${Date.now()}`
  const reference = draft.reference ?? schoolRouteReference(++routeSeq)
  const version = draft.version ?? 1
  return {
    ...createDefaultSchoolRoute(),
    ...draft,
    id,
    reference,
    version,
    versionId: draft.versionId ?? `${id}-v${version}`,
    patterns: syncPatternsForDirectionMode(draft.directionMode, draft.patterns),
    warningCount: draft.warningCount ?? 0,
    nextServiceDate: draft.nextServiceDate ?? null,
    generatedJobCount: draft.generatedJobCount ?? 0,
    jobIds: draft.jobIds ?? [],
    createdAt: draft.createdAt ?? now,
    updatedAt: now,
  }
}

function toListItem(route: SchoolRoute): SchoolRouteListItem {
  const directionLabel =
    route.directionMode === 'both' ? 'AM & PM' : route.directionMode === 'pm' ? 'PM' : 'AM'
  return {
    id: route.id,
    reference: route.reference,
    schoolName: route.schoolName,
    directionLabel,
    pupilCount: route.pupils.length,
    daysLabel: route.term.operatingDays.map((d) => d.slice(0, 3)).join(', '),
    vehicleRequirement: `${route.crew.vehicleType} · ${route.crew.seats} seats`,
    driverName: null,
    assistantRequired: route.crew.passengerAssistantRequired,
    nextService: route.nextServiceDate,
    status: route.status,
    warningCount: route.warningCount,
  }
}

export const mockSchoolRoutesApi = {
  list(params?: { view?: string }): SchoolRouteListItem[] {
    seedRoutes()
    const today = new Date().toISOString().slice(0, 10)
    let list = [...routes.values()]
    if (params?.view === 'today') {
      list = list.filter((r) => r.nextServiceDate === today || r.status === 'published')
    }
    return list.map(toListItem)
  },

  get(id: string): SchoolRoute {
    seedRoutes()
    const route = routes.get(id)
    if (!route) throw new Error('School route not found')
    return { ...route, patterns: route.patterns.map((p) => ({ ...p, stops: [...p.stops] })), pupils: [...route.pupils] }
  },

  createDraft(): SchoolRoute {
    const route = normalizeDraft(createDefaultSchoolRoute())
    routes.set(route.id, route)
    return { ...route }
  },

  save(draft: SchoolRouteDraft): SchoolRoute {
    const route = normalizeDraft({ ...routes.get(draft.id ?? ''), ...draft })
    routes.set(route.id, route)
    return { ...route }
  },

  publish(id: string, opts: { mockDuties: DutyDetailRecord[] }): SchoolRoute {
    const route = routes.get(id)
    if (!route) throw new Error('School route not found')
    if (!route.schoolId) throw new Error('School must be selected')
    if (route.pupils.length === 0) throw new Error('At least one pupil is required')

    const jobs = buildRollingSchoolJobs(route)
    const trips = mockTransfersApi.createFromSchoolRoutePublish(route, jobs, opts)
    const dates = serviceDatesInWindow(route)
    const updated: SchoolRoute = {
      ...route,
      status: 'published',
      generatedJobCount: jobs.length,
      jobIds: trips.flatMap((t) => t.jobs.map((j) => j.id)),
      nextServiceDate: dates[0] ?? null,
      version: route.version + 1,
      versionId: `${route.id}-v${route.version + 1}`,
      updatedAt: new Date().toISOString(),
    }
    routes.set(id, updated)
    return { ...updated }
  },

  previewJobCount(id: string): number {
    const route = routes.get(id)
    if (!route) throw new Error('School route not found')
    return countJobsToGenerate(route)
  },

  attendance(routeId: string): SchoolRouteAttendanceRow[] {
    const route = routes.get(routeId)
    if (!route) throw new Error('School route not found')
    const today = new Date().toISOString().slice(0, 10)
    return route.pupils.flatMap((p) =>
      p.directions.map((direction) => ({
        id: `${routeId}-${p.pupilId}-${direction}`,
        serviceDate: today,
        direction,
        pupilName: `${p.firstName} ${p.lastName}`,
        status: 'expected' as const,
        note: null,
      })),
    )
  },

  summary() {
    seedRoutes()
    const all = [...routes.values()]
    const today = new Date().toISOString().slice(0, 10)
    return {
      activeRoutes: all.filter((r) => r.status === 'published').length,
      pupilsToday: all.reduce((n, r) => n + r.pupils.length, 0),
      unscheduledJobs: all.filter((r) => r.status === 'published' && !r.nextServiceDate).length,
      exceptions: all.reduce((n, r) => n + r.warningCount, 0),
    }
  },
}
