import { describe, expect, it } from 'vitest'
import { createDefaultSchoolRoute } from '@/lib/school-routes/defaults'
import { buildRollingSchoolJobs, countJobsToGenerate, serviceDatesInWindow } from '@/lib/school-routes/job-generation'
import type { SchoolRoute } from '@/lib/school-routes/types'

function sampleRoute(): SchoolRoute {
  const draft = createDefaultSchoolRoute()
  return {
    ...draft,
    id: 'sch-route-test',
    reference: 'SCH-RT-TEST',
    version: 1,
    versionId: 'sch-route-test-v1',
    schoolId: 'sch-1',
    schoolName: 'Oakwood Primary School',
    schoolAddress: 'Oakwood Rd',
    status: 'draft',
    pupils: [
      {
        pupilId: 'pax-1',
        firstName: 'Oliver',
        lastName: 'Taylor',
        pickupAddress: '14 Maple Close',
        parentContact: '',
        wheelchairRequired: false,
        passengerAssistantRequired: false,
        daysAttending: ['mon', 'tue', 'wed', 'thu', 'fri'],
        directions: ['am'],
        safeguardingNotes: '',
      },
    ],
    patterns: draft.patterns,
    warningCount: 0,
    nextServiceDate: null,
    generatedJobCount: 0,
    jobIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentStep: 1,
  }
}

describe('school route job generation', () => {
  it('limits generation to rolling window weekdays in term', () => {
    const route = sampleRoute()
    const dates = serviceDatesInWindow(route, 2)
    expect(dates.length).toBeGreaterThan(0)
    expect(dates.length).toBeLessThanOrEqual(14)
  })

  it('creates one job per pupil per service day', () => {
    const route = sampleRoute()
    const jobs = buildRollingSchoolJobs(route, 1)
    expect(jobs.length).toBeGreaterThan(0)
    expect(countJobsToGenerate(route, 1)).toBe(jobs.length)
    expect(jobs[0]?.pupilName).toContain('Oliver')
  })
})
