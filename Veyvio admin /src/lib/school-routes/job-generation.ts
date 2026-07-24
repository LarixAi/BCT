import { ROLLING_GENERATION_WEEKS } from './constants'
import type { GeneratedSchoolJob, SchoolRoute } from './types'

const DAY_IDS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

function dayId(date: Date): string {
  return DAY_IDS[date.getDay()] ?? 'mon'
}

function parseDate(iso: string): Date {
  const d = new Date(iso)
  d.setHours(12, 0, 0, 0)
  return d
}

export function serviceDatesInWindow(route: SchoolRoute, weeks = ROLLING_GENERATION_WEEKS): string[] {
  const start = parseDate(new Date().toISOString().slice(0, 10))
  const end = new Date(start)
  end.setDate(end.getDate() + weeks * 7)
  const termStart = parseDate(route.term.startDate)
  const termEnd = parseDate(route.term.endDate)
  const excluded = new Set([...route.term.excludedDates, ...route.term.insetDays])
  const dates: string[] = []

  const cursor = new Date(Math.max(start.getTime(), termStart.getTime()))
  while (cursor <= end && cursor <= termEnd) {
    const iso = cursor.toISOString().slice(0, 10)
    const weekday = dayId(cursor)
    if (route.term.operatingDays.includes(weekday) && !excluded.has(iso)) {
      dates.push(iso)
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

export function buildJobsForServiceDate(
  route: SchoolRoute,
  serviceDate: string,
  direction: 'am' | 'pm',
): GeneratedSchoolJob[] {
  const pattern = route.patterns.find((p) => p.direction === direction)
  if (!pattern) return []
  const schoolAddress = route.schoolAddress
  const jobs: GeneratedSchoolJob[] = []

  for (const pupil of route.pupils) {
    if (!pupil.directions.includes(direction)) continue
    if (!pupil.daysAttending.includes(dayId(parseDate(serviceDate)))) continue

    const pickupStop = pattern.stops.find((s) => s.pupilId === pupil.pupilId && s.type === 'pickup')
    const dropoffStop = pattern.stops.find((s) => s.pupilId === pupil.pupilId && s.type === 'dropoff')
    const pickupAddress =
      direction === 'am'
        ? pickupStop?.address || pupil.pickupAddress
        : schoolAddress
    const dropoffAddress =
      direction === 'am'
        ? schoolAddress
        : dropoffStop?.address || pupil.pickupAddress

    jobs.push({
      serviceDate,
      direction,
      pupilId: pupil.pupilId,
      pupilName: `${pupil.firstName} ${pupil.lastName}`,
      pickupAddress,
      dropoffAddress,
      plannedPickupTime: pickupStop?.plannedTime ?? pattern.depotDeparture,
      wheelchairRequired: pupil.wheelchairRequired,
      escortRequired: pupil.passengerAssistantRequired || route.crew.passengerAssistantRequired,
      safeguardingFlag: Boolean(pupil.safeguardingNotes),
    })
  }
  return jobs
}

export function buildRollingSchoolJobs(route: SchoolRoute, weeks = ROLLING_GENERATION_WEEKS): GeneratedSchoolJob[] {
  const dates = serviceDatesInWindow(route, weeks)
  const directions: ('am' | 'pm')[] =
    route.directionMode === 'both' ? ['am', 'pm'] : route.directionMode === 'pm' ? ['pm'] : ['am']

  const jobs: GeneratedSchoolJob[] = []
  for (const date of dates) {
    for (const direction of directions) {
      jobs.push(...buildJobsForServiceDate(route, date, direction))
    }
  }
  return jobs
}

export function countJobsToGenerate(route: SchoolRoute, weeks = ROLLING_GENERATION_WEEKS): number {
  return buildRollingSchoolJobs(route, weeks).length
}
