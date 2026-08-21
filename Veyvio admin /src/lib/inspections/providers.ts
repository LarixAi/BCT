import type { InspectionProviderRow } from './types'

/**
 * Demo / seed provider directory only.
 * Live empty hubs must not invent providers (F-03) — use [] until Command returns a register.
 */
export const INSPECTION_PROVIDERS: InspectionProviderRow[] = [
  {
    id: 'prov-internal',
    name: 'Fleet Workshop (internal)',
    type: 'internal',
    approved: true,
    services: ['Safety Inspection (PMI)', 'Post-repair', 'Return-to-service'],
    slaHours: 48,
    contactEmail: 'workshop@metrotransport.co.uk',
  },
  {
    id: 'prov-dvsa',
    name: 'DVSA approved test station',
    type: 'external',
    approved: true,
    services: ['Annual-test preparation', 'MOT'],
    slaHours: 72,
    contactEmail: 'bookings@teststation.example',
  },
  {
    id: 'prov-franchise',
    name: 'Mercedes Commercial',
    type: 'franchise',
    approved: true,
    services: ['Manufacturer inspection', 'Specialist equipment'],
    slaHours: 96,
    contactEmail: 'service@mercedes-commercial.example',
  },
]
