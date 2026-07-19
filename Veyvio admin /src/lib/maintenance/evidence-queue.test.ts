import { describe, expect, it } from 'vitest'
import { instantiatePmiChecklist } from './pmi-checklist'
import { buildEvidenceQueue } from './evidence-queue'
import type { VehicleProfile } from '@/lib/vehicles/types'

describe('buildEvidenceQueue', () => {
  it('flags missing brake evidence on open PMI work orders', () => {
    const checklist = instantiatePmiChecklist()
    checklist.inspectorName = 'Tech'
    const brake = checklist.items.find((i) => i.templateItemId === 'brakes-service')!
    brake.result = 'pass'
    brake.evidence = { kind: 'none', note: null, fileName: null, recordedAt: null, recordedBy: null }

    const profiles = [
      {
        id: 'veh-5',
        registrationNumber: 'MN90 PQR',
        workOrders: [
          {
            id: 'wo-brake',
            type: 'pmi',
            status: 'quality_check',
            title: 'PMI re-test',
            pmiChecklist: checklist,
          },
        ],
      },
    ] as unknown as VehicleProfile[]

    const queue = buildEvidenceQueue(profiles, [], [])
    expect(queue.some((i) => i.kind === 'missing_brake_evidence')).toBe(true)
    expect(queue.find((i) => i.kind === 'missing_brake_evidence')?.title).toMatch(/brake/i)
  })
})
